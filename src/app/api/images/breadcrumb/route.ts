import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { images } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const user = await getCurrentUser();
    const { searchParams } = req.nextUrl;
    const parentId = searchParams.get("parentId");

    if (!parentId) {
        return NextResponse.json({ error: "parentId is required" }, { status: 400 });
    }

    const db = getDb();
    const breadcrumb: { id: string; title: string }[] = [];
    let currentId: string | null = parentId;

    // iterate upward, capped at 20 to prevent runaway loops
    for (let i = 0; i < 20 && currentId !== null; i++) {
        const [row] = await db
            .select()
            .from(images)
            .where(and(eq(images.id, currentId), eq(images.userId, user.id)))
            .limit(1);

        if (!row) {
            return NextResponse.json({ error: "directory not found" }, { status: 404 });
        }

        breadcrumb.unshift({ id: row.id, title: row.title });
        currentId = row.parentId ?? null;
    }

    return NextResponse.json({ breadcrumb });
}
