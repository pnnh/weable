import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { images } from "@/db/schema";
import { requireConsoleUser } from "../../_lib/gate";

export const runtime = "nodejs";

type Props = { params: Promise<{ lang: string }> };

export async function GET(req: NextRequest, { params }: Props) {
    const { lang } = await params;
    const gate = await requireConsoleUser(lang);
    if ("error" in gate) return gate.error;
    const user = gate.user;

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
