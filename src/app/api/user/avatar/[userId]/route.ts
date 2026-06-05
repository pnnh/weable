import { NextRequest, NextResponse } from "next/server";
import { getAvatarStorage } from "@/lib/storage";

export const runtime = "nodejs";

type Props = { params: Promise<{ userId: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
    const { userId } = await params;

    if (!userId || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const storage = getAvatarStorage();
    const data = await storage.read(`user_${userId}`);

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
