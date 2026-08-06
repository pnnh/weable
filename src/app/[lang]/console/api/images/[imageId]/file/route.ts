import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/index";
import { images } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getStorage } from "@/lib/storage";
import { requireConsoleUser } from "../../../_lib/gate";

export const runtime = "nodejs";

type Props = { params: Promise<{ lang: string; imageId: string }> };

// 控制台副本：登录门禁 + 仅本人所有（research.md R10），公开接口保留在 /api/images/[imageId]/file
export async function GET(_req: NextRequest, { params }: Props) {
    const { lang, imageId } = await params;
    const gate = await requireConsoleUser(lang);
    if ("error" in gate) return gate.error;
    const user = gate.user;

    if (!imageId || !/^[a-zA-Z0-9_-]+$/.test(imageId)) {
        return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    const db = getDb();
    const [image] = await db
        .select()
        .from(images)
        .where(and(eq(images.id, imageId), eq(images.userId, user.id)))
        .limit(1);

    if (!image) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (image.mimeType === "directory") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const storage = getStorage();
    const data = await storage.read(imageId, image.filename);

    if (!data) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(data), {
        headers: {
            "Content-Type": image.mimeType,
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    });
}
