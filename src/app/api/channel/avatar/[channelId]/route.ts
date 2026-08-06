import { NextRequest, NextResponse } from "next/server";
import { getAvatarStorage } from "@/lib/storage";

export const runtime = "nodejs";

type Props = { params: Promise<{ channelId: string }> };

// 公开接口：服务公开页面（FR-016）；控制台上传已迁移至 /[lang]/console/api/channel/avatar/[channelId]
export async function GET(_req: NextRequest, { params }: Props) {
    const { channelId } = await params;

    if (!channelId || !/^[a-zA-Z0-9_-]+$/.test(channelId)) {
        return NextResponse.json({ error: "Invalid channel ID" }, { status: 400 });
    }

    const storage = getAvatarStorage();
    const data = await storage.read(`channel_${channelId}`);

    if (!data) {
        return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(new Uint8Array(data), {
        headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
