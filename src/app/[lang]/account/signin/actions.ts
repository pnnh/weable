"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { users } from "@/db/schema";

// 基础邮箱格式校验：非空 local 段 + @ + 非空 domain 段
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export type SignInState = { error: string } | null;

// 开发环境模拟登录：按邮箱匹配已有用户（忽略名称）或新建用户后登录，
// 成功后写入 user_id cookie 并跳转控制台；旧会话由 cookie 覆盖天然清除
export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
    const lang = String(formData.get("lang") ?? "");
    const email = String(formData.get("email") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();

    if (!email) {
        return { error: "邮箱为必填项" };
    }
    if (!EMAIL_PATTERN.test(email)) {
        return { error: "邮箱格式无效" };
    }

    const db = getDb();
    let rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (rows.length === 0) {
        // 新建用户：name 缺省取邮箱；onConflictDoNothing 兜底后按 email 回查
        db.insert(users)
            .values({ name: name || email, email })
            .onConflictDoNothing()
            .run();
        rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (rows.length === 0) {
            return { error: "登录失败，请稍后重试" };
        }
    }

    const cookieStore = await cookies();
    cookieStore.set("user_id", rows[0].id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
    });

    redirect(`/${lang}/console`);
}
