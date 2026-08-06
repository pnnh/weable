import { NextRequest, NextResponse } from "next/server";
import { getAvatarStorage } from "@/lib/storage";
import { requireConsoleUser } from "../../_lib/gate";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

type Props = { params: Promise<{ lang: string }> };

export async function POST(req: NextRequest, { params }: Props) {
    const { lang } = await params;
    const gate = await requireConsoleUser(lang);
    if ("error" in gate) return gate.error;
    const user = gate.user;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getAvatarStorage();
    await storage.save(`user_${user.id}`, buffer);

    return NextResponse.json({ ok: true });
}
