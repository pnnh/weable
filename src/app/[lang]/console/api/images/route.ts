import { NextRequest, NextResponse } from "next/server";
import { and, asc, count, desc, eq, isNull, like, sql } from "drizzle-orm";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import { requireConsoleUser } from "../_lib/gate";

export const runtime = "nodejs";

type Props = { params: Promise<{ lang: string }> };

// 转义 LIKE 通配符（SQLite 默认转义符为 \），保证用户输入仅作普通文本匹配
// （contracts/get-images-list-search-pagination.md）
function escapeLikePattern(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function GET(req: NextRequest, { params }: Props) {
    const { lang } = await params;
    const gate = await requireConsoleUser(lang);
    if ("error" in gate) return gate.error;
    const user = gate.user;

    const { searchParams } = req.nextUrl;
    const parentId = searchParams.get("parentId") ?? null;

    // q：trim 后为空视为无搜索条件
    const q = (searchParams.get("q") ?? "").trim();
    // pageSize 为分页开关：仅合法正整数启用分页（树展开调用不传，行为不变）
    const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") ?? "", 10);
    const paginated = Number.isInteger(pageSizeRaw) && pageSizeRaw > 0;
    const pageSize = paginated ? pageSizeRaw : null;
    // page：非法值回退为 1（FR-009）
    const pageRaw = Number.parseInt(searchParams.get("page") ?? "", 10);
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    const db = getDb();

    if (parentId !== null) {
        const [dir] = await db
            .select()
            .from(images)
            .where(
                and(
                    eq(images.id, parentId),
                    eq(images.userId, user.id),
                    eq(images.mimeType, "directory"),
                ),
            )
            .limit(1);
        if (!dir) {
            return NextResponse.json({ error: "parent directory not found" }, { status: 404 });
        }
    }

    // 基础过滤：当前用户 + 当前目录直接条目；有 q 时追加标题模糊匹配（参数化 + 通配符转义）
    const whereClause = and(
        eq(images.userId, user.id),
        parentId !== null ? eq(images.parentId, parentId) : isNull(images.parentId),
        q
            ? like(images.title, sql`'%' || ${escapeLikePattern(q)} || '%'`)
            : undefined,
    );

    // directories first, then by updatedAt desc
    const orderByClause = [
        sql`CASE WHEN ${images.mimeType} = 'directory' THEN 0 ELSE 1 END`,
        asc(sql`CASE WHEN ${images.mimeType} = 'directory' THEN 0 ELSE 1 END`),
        desc(images.updatedAt),
    ];

    let rows: {
        images: typeof images.$inferSelect;
        channelName: string | null;
    }[];
    if (pageSize !== null) {
        const [totalRow] = await db
            .select({ value: count() })
            .from(images)
            .where(whereClause);
        const total = totalRow?.value ?? 0;
        rows = await db
            .select({ images: images, channelName: channels.name })
            .from(images)
            .leftJoin(channels, eq(images.channelId, channels.id))
            .where(whereClause)
            .orderBy(...orderByClause)
            .limit(pageSize)
            .offset((page - 1) * pageSize);

        const items = rows.map((row) => toListItem(row.images, row.channelName));
        return NextResponse.json({ items, total, page, pageSize });
    }

    rows = await db
        .select({ images: images, channelName: channels.name })
        .from(images)
        .leftJoin(channels, eq(images.channelId, channels.id))
        .where(whereClause)
        .orderBy(...orderByClause);

    const items = rows.map((row) => toListItem(row.images, row.channelName));
    return NextResponse.json({ items });
}

function toListItem(img: typeof images.$inferSelect, channelName: string | null) {
    return {
        id: img.id,
        title: img.title,
        mimeType: img.mimeType,
        description: img.description,
        size: img.size,
        width: img.width,
        height: img.height,
        parentId: img.parentId,
        channelId: img.channelId,
        channelName,
        isPublished: img.isPublished,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
    };
}
