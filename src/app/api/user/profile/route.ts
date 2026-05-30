import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    const updates: Record<string, unknown> = {};

    if ("nickname" in body && (typeof body.nickname === "string" || body.nickname === null)) {
        updates.nickname = body.nickname ? body.nickname.trim().slice(0, 50) : null;
    }
    if ("bio" in body && (typeof body.bio === "string" || body.bio === null)) {
        updates.bio = body.bio ? body.bio.trim().slice(0, 500) : null;
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No valid fields" }, { status: 400 });
    }

    const db = getDb();
    await db.update(users).set(updates).where(eq(users.id, user.id));

    return NextResponse.json({ ok: true });
}
