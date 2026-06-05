import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { games } from "@/data/games";
import GameGrid from "@/components/GameGrid";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isValidLang(lang)) return {};
    const l = lang as LangKey;
    return {
        title: `${t(l, "apps")} — ${t(l, "siteName")}`,
    };
}

export default async function AppsPage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-3">
                        {t(l, "siteName")}
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        {t(l, "siteTagline")}
                    </p>
                </div>
                <GameGrid games={games} lang={l} />
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
