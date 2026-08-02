import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { images, createId } from "@/db/schema";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_MIME_PREFIXES = ["image/"];
const MAX_UPLOAD_FILES = 50;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    const formData = await req.formData();
    const files = formData
        .getAll("file")
        .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (files.length > MAX_UPLOAD_FILES) {
        return NextResponse.json({ error: "Too many files (max 50)" }, { status: 400 });
    }

    if (files.some((file) => !ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p)))) {
        return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (files.some((file) => file.size > MAX_FILE_SIZE_BYTES)) {
        return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }

    const parentId = (formData.get("parentId") as string | null) || null;
    const db = getDb();

    if (parentId !== null) {
        const [dir] = await db
            .select()
            .from(images)
            .where(and(eq(images.id, parentId), eq(images.userId, user.id), eq(images.mimeType, "directory")))
            .limit(1);
        if (!dir) {
            return NextResponse.json({ error: "parent directory not found" }, { status: 404 });
        }
    }

    const storage = getStorage();
    const prepared = [] as Array<{ id: string; file: File }>;

    for (const file of files) {
        const id = createId();
        const buffer = Buffer.from(await file.arrayBuffer());
        await storage.save(id, file.name, buffer);
        prepared.push({ id, file });
    }

    await db.insert(images).values(
        prepared.map(({ id, file }) => ({
            id,
            userId: user.id,
            parentId,
            title: file.name.replace(/\.[^.]+$/, ""),
            filename: file.name,
            mimeType: file.type,
            size: file.size,
        })),
    );

    return NextResponse.json({ ids: prepared.map((item) => item.id) }, { status: 201 });
}
