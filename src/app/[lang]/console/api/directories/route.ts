import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/index";
import { images, createId } from "@/db/schema";
import { requireConsoleUser } from "../_lib/gate";

export const runtime = "nodejs";

// characters that are not allowed in directory titles
const INVALID_CHARS = /[/\\]/;

type Props = { params: Promise<{ lang: string }> };

export async function POST(req: NextRequest, { params }: Props) {
    const { lang } = await params;
    const gate = await requireConsoleUser(lang);
    if ("error" in gate) return gate.error;
    const user = gate.user;

    let body: { title?: unknown; description?: unknown; parentId?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null;

    if (!title) {
        return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (title === "..") {
        return NextResponse.json({ error: "title contains invalid characters" }, { status: 400 });
    }
    if (INVALID_CHARS.test(title)) {
        return NextResponse.json({ error: "title contains invalid characters" }, { status: 400 });
    }
    if (title.length > 200) {
        return NextResponse.json({ error: "title too long" }, { status: 400 });
    }
    if (description.length > 1000) {
        return NextResponse.json({ error: "description too long" }, { status: 400 });
    }

    const db = getDb();

    if (parentId !== null) {
        const [parent] = await db
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
        if (!parent) {
            return NextResponse.json({ error: "parent directory not found" }, { status: 404 });
        }
    }

    // check for duplicate title in the same parent level
    const [existing] = await db
        .select()
        .from(images)
        .where(
            and(
                eq(images.userId, user.id),
                eq(images.title, title),
                parentId !== null ? eq(images.parentId, parentId) : isNull(images.parentId),
            ),
        )
        .limit(1);

    if (existing) {
        return NextResponse.json(
            { error: "an entry with this name already exists in the same directory" },
            { status: 409 },
        );
    }

    const id = createId();
    await db.insert(images).values({
        id,
        userId: user.id,
        parentId,
        title,
        description,
        filename: title,
        mimeType: "directory",
        size: 0,
    });

    return NextResponse.json({ id }, { status: 201 });
}
