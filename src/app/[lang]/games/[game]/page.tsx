import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isValidLang, supportedLanguages } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { games } from "@/data/games";
import { t } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LanguageSelector from "@/components/LanguageSelector";
import GameCoverPlaceholder from "@/components/GameCoverPlaceholder";

type Props = { params: Promise<{ lang: string; game: string }> };

export async function generateStaticParams() {
    const pairs: { lang: string; game: string }[] = [];
    for (const l of supportedLanguages) {
        for (const game of games) {
            pairs.push({ lang: l.key, game: game.id });
        }
    }
    return pairs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, game: gameId } = await params;
    if (!isValidLang(lang)) return {};
    const l = lang as LangKey;
    const game = games.find((g) => g.id === gameId);
    if (!game) return {};
    const title = t(l, "gameDetailTitle").replace("{name}", game.name[l]);
    const description = game.description[l];
    return {
        title,
        description,
        openGraph: { title, description, type: "website" },
    };
}

export default async function GameDetailPage({ params }: Props) {
    const { lang, game: gameId } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;
    const game = games.find((g) => g.id === gameId);
    if (!game) notFound();

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full">
                {/* Breadcrumb */}
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <nav className="flex items-center gap-2 text-sm text-gray-500">
                        <Link href={`/${l}/`} className="hover:text-gray-900 transition-colors">
                            {t(l, "allGames")}
                        </Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">{game.name[l]}</span>
                    </nav>
                </div>

                {/* Hero */}
                <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Cover thumbnail */}
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden">
                            <GameCoverPlaceholder
                                color={game.coverColor}
                                engineLabel={game.engineLabel}
                                gameName={game.name[l]}
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-bold text-gray-900">{game.name[l]}</h1>
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                                    {t(l, "engine")}: {game.engineLabel}
                                </span>
                            </div>
                            <p className="text-lg text-gray-600 mb-4">{game.description[l]}</p>
                            <a
                                href={game.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
                            >
                                {t(l, "playGame")}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.839Z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Tags */}
                    {game.tags.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2">
                            {game.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </section>

                <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-10">
                    {/* Features */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t(l, "features")}</h2>
                        <ul className="space-y-2">
                            {game.features[l].map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-gray-700">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* About */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t(l, "about")}</h2>
                        <p className="text-gray-700 leading-relaxed">{game.detail[l]}</p>
                    </section>

                    {/* Bottom CTA */}
                    <section className="border-t pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <p className="text-gray-600">{game.description[l]}</p>
                        <a
                            href={game.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors flex-shrink-0"
                        >
                            {t(l, "playGame")}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.839Z" />
                            </svg>
                        </a>
                    </section>

                    {/* Language selector */}
                    <section className="border-t pt-6">
                        <p className="text-sm text-gray-400 mb-2">{t(l, "changeLanguage")}</p>
                        <LanguageSelector currentLang={l} pathSuffix={`games/${game.id}/`} />
                    </section>
                </div>
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
