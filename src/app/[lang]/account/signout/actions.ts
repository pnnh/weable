"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// 开发环境模拟退出：删除 user_id cookie 后跳回登录页（幂等）
export async function signOut(formData: FormData): Promise<void> {
    const lang = String(formData.get("lang") ?? "");
    const cookieStore = await cookies();
    cookieStore.delete({ name: "user_id", path: "/" });
    redirect(`/${lang}/account/signin`);
}
