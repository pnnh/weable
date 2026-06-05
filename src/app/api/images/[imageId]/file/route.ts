import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { images } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

type Props = { params: Promise<{ imageId: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
    const { imageId } = await params;

    if (!imageId || !/^[a-zA-Z0-9_-]+$/.test(imageId)) {
        return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    const db = getDb();
    const [image] = await db
        .select()
        .from(images)
        .where(eq(images.id, imageId))
        .limit(1);

    if (!image) {
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
