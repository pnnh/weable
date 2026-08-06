import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireConsoleUser } from "../../_lib/gate";

export const runtime = "nodejs";

type Props = { params: Promise<{ lang: string }> };

export async function PATCH(req: NextRequest, { params }: Props) {
    const { lang } = await params;
    const gate = await requireConsoleUser(lang);
    if ("error" in gate) return gate.error;
    const user = gate.user;

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
