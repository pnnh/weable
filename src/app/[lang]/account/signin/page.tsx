import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SignInForm from "./sign-in-form";
import CalieoSignInButton from "@/components/CalieoSignInButton";

export const dynamic = "force-dynamic";

// 回调错误码 → 友好提示
const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "登录请求已过期或无效，请重新尝试。",
  token_invalid: "身份验证失败，请重新登录。",
  missing_claims: "Calieo 账号缺少必要信息（邮箱），请联系支持。",
  access_denied: "您取消了授权，如需登录请重新点击按钮。",
};

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function SignInPage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const { error } = await searchParams;
    const errorMessage = error ? (ERROR_MESSAGES[error] ?? "登录失败，请重试。") : null;
    const isProduction = process.env.NODE_ENV === "production";

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {isProduction ? "登录" : "开发环境登录"}
                </h1>
                {errorMessage && (
                    <div className="mb-6 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                        {errorMessage}
                    </div>
                )}
                {!isProduction && (
                    <>
                        <p className="text-gray-500 mb-8">
                            仅本地开发可用。邮箱匹配已有用户则直接登录，否则按邮箱新建用户；登录将替换当前会话。
                        </p>
                        <SignInForm lang={l} />
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-2 text-gray-400">或</span>
                            </div>
                        </div>
                    </>
                )}
                <CalieoSignInButton lang={l} />
            </main>
            <SiteFooter lang={l} />
        </>
    );
}

