import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SignInForm from "./sign-in-form";

// 仅开发环境可用的模拟登录页；生产环境走既有零信任认证，本页不暴露
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function SignInPage({ params }: Props) {
    if (process.env.NODE_ENV === "production") notFound();
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">开发环境模拟登录</h1>
                <p className="text-gray-500 mb-8">
                    仅本地开发可用。邮箱匹配已有用户则直接登录，否则按邮箱新建用户；登录将替换当前会话。
                </p>
                <SignInForm lang={l} />
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
