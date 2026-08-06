import { NextResponse } from "next/server";
import { isValidLang } from "@/lib/language";
import { getCurrentUserOrNull, type CurrentUser } from "@/lib/auth";

// /[lang]/console/api/* 统一登录门禁：
// lang 非法返回 404；未登录返回 401 + JSON（contracts/console-api-migration.md）
export async function requireConsoleUser(
    lang: string,
): Promise<{ user: CurrentUser } | { error: NextResponse }> {
    if (!isValidLang(lang)) {
        return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
    }

    const user = await getCurrentUserOrNull();
    if (!user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    return { user };
}
