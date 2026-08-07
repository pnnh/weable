import { notFound } from "next/navigation";
import Link from "next/link";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUserOrNull } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { signOut } from "./actions";

// 仅开发环境可用的模拟退出页；生产环境走既有零信任认证，本页不暴露
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function SignOutPage({ params }: Props) {
    if (process.env.NODE_ENV === "production") notFound();
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUserOrNull();

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">开发环境模拟退出</h1>
                {user ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <p className="text-sm text-gray-500 mb-1">当前登录用户</p>
                        <p className="text-lg font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500 mb-6">{user.email}</p>
                        <form action={signOut}>
                            <input type="hidden" name="lang" value={l} />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900"
                            >
                                退出登录
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <p className="text-gray-500 mb-4">当前未登录</p>
                        <Link
                            href={`/${l}/account/signin`}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                        >
                            前往登录
                        </Link>
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
