import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import { requireConsoleUser } from "../../_lib/gate";

export const runtime = "nodejs";

const MAX_BATCH_IDS = 500;
const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

type Props = { params: Promise<{ lang: string }> };

// 批量设置发布状态 / 所属频道（contracts/patch-images-batch.md）
export async function PATCH(req: NextRequest, { params }: Props) {
    const { lang } = await params;
    const gate = await requireConsoleUser(lang);
    if ("error" in gate) return gate.error;
    const user = gate.user;

    let body: { ids?: unknown; isPublished?: unknown; channelId?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // ids 校验：非空数组、上限 500、元素为合法 ID 字符串
    const ids = body.ids;
    if (
        !Array.isArray(ids) ||
        ids.length === 0 ||
        ids.length > MAX_BATCH_IDS ||
        ids.some((id) => typeof id !== "string" || !ID_PATTERN.test(id))
    ) {
        return NextResponse.json({ error: "ids must be a non-empty array (max 500) of valid id strings" }, { status: 400 });
    }

    const hasIsPublished = "isPublished" in body;
    const hasChannelId = "channelId" in body;
    if (hasIsPublished === hasChannelId) {
        return NextResponse.json({ error: "exactly one of isPublished or channelId is required" }, { status: 400 });
    }

    const db = getDb();

    if (hasIsPublished) {
        if (typeof body.isPublished !== "boolean") {
            return NextResponse.json({ error: "isPublished must be a boolean" }, { status: 400 });
        }

        // 仅更新本人名下非目录行；目录行无发布状态语义
        const { changes } = await db
            .update(images)
            .set({ isPublished: body.isPublished, updatedAt: Date.now() })
            .where(
                and(
                    inArray(images.id, ids as string[]),
                    eq(images.userId, user.id),
                    ne(images.mimeType, "directory"),
                ),
            )
            .run();

        if (changes === 0) {
            return NextResponse.json({ error: "no matching images found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true, updated: changes });
    }

    // channelId 分支：null 表示清空频道；非 null 时须为本人名下已存在频道
    const channelId = body.channelId;
    if (channelId !== null && (typeof channelId !== "string" || !ID_PATTERN.test(channelId))) {
        return NextResponse.json({ error: "channelId must be null or a valid id string" }, { status: 400 });
    }

    if (channelId !== null) {
        const [channel] = await db
            .select()
            .from(channels)
            .where(and(eq(channels.id, channelId), eq(channels.userId, user.id)))
            .limit(1);
        if (!channel) {
            return NextResponse.json({ error: "channel not found" }, { status: 400 });
        }
    }

    const { changes } = await db
        .update(images)
        .set({ channelId, updatedAt: Date.now() })
        .where(
            and(
                inArray(images.id, ids as string[]),
                eq(images.userId, user.id),
                ne(images.mimeType, "directory"),
            ),
        )
        .run();

    if (changes === 0) {
        return NextResponse.json({ error: "no matching images found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, updated: changes });
}
