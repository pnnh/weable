import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { images } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    const { searchParams } = req.nextUrl;
    const parentId = searchParams.get("parentId") ?? null;

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

    const rows = await db
        .select()
        .from(images)
        .where(
            and(
                eq(images.userId, user.id),
                parentId !== null ? eq(images.parentId, parentId) : isNull(images.parentId),
            ),
        )
        // directories first, then by updatedAt desc
        .orderBy(
            sql`CASE WHEN ${images.mimeType} = 'directory' THEN 0 ELSE 1 END`,
            asc(sql`CASE WHEN ${images.mimeType} = 'directory' THEN 0 ELSE 1 END`),
            desc(images.updatedAt),
        );

    const items = rows.map((img) => ({
        id: img.id,
        title: img.title,
        mimeType: img.mimeType,
        description: img.description,
        size: img.size,
        width: img.width,
        height: img.height,
        parentId: img.parentId,
        channelId: img.channelId,
        isPublished: img.isPublished,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
    }));

    return NextResponse.json({ items });
}
