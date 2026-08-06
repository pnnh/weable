import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { requireConsoleUser } from "../../_lib/gate";

export const runtime = "nodejs";

type Props = { params: Promise<{ lang: string; channelId: string }> };

export async function DELETE(_req: NextRequest, { params }: Props) {
    const { lang, channelId } = await params;
    const gate = await requireConsoleUser(lang);
    if ("error" in gate) return gate.error;
    const user = gate.user;

    if (!channelId || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
        return NextResponse.json({ error: "Invalid channel ID" }, { status: 400 });
    }

    const db = getDb();

    const [channel] = await db
        .select()
        .from(channels)
        .where(and(eq(channels.id, channelId), eq(channels.userId, user.id)))
        .limit(1);

    if (!channel) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(images)
        .where(and(eq(images.channelId, channelId), eq(images.isPublished, true)));

    if (cnt > 0) {
        return NextResponse.json({ error: "Channel has published images" }, { status: 409 });
    }

    await db.delete(channels).where(and(eq(channels.id, channelId), eq(channels.userId, user.id)));

    return new NextResponse(null, { status: 204 });
}
