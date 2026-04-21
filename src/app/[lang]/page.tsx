import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { games } from "@/data/games";
import GameGrid from "@/components/GameGrid";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function HomePage({ params }: Props) {
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
