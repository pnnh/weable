import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { images, createId } from "@/db/schema";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_MIME_PREFIXES = ["image/"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) {
        return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
    }

    const id = createId();
    const buffer = Buffer.from(await file.arrayBuffer());

    const storage = getStorage();
    await storage.save(id, file.name, buffer);

    const db = getDb();
    await db.insert(images).values({
        id,
        userId: user.id,
        title: file.name.replace(/\.[^.]+$/, ""),
        filename: file.name,
        mimeType: file.type,
        size: file.size,
    });

    return NextResponse.json({ id }, { status: 201 });
}
