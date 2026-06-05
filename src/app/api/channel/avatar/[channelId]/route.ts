import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

const AVATAR_PREFIX = "__avatar__";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

type Props = { params: Promise<{ channelId: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
    const { channelId } = await params;

    if (!channelId || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
        return NextResponse.json({ error: "Invalid channel ID" }, { status: 400 });
    }

    const storage = getStorage();
    const data = await storage.read(AVATAR_PREFIX, `channel_${channelId}`);

    if (!data) {
        return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(data, {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
        },
    });
}

export async function POST(req: NextRequest, { params }: Props) {
    const { channelId } = await params;

    if (!channelId || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
        return NextResponse.json({ error: "Invalid channel ID" }, { status: 400 });
    }

    await getCurrentUser();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    await storage.save(AVATAR_PREFIX, `channel_${channelId}`, buffer);

    return NextResponse.json({ ok: true });
}
