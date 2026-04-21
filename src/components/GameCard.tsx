import Link from "next/link";
import type { LangKey } from "@/lib/language";
import type { GameData } from "@/data/games";
import { t } from "@/lib/i18n";
import GameCoverPlaceholder from "@/components/GameCoverPlaceholder";

type Props = {
    game: GameData;
    lang: LangKey;
};

export default function GameCard({ game, lang }: Props) {
    const detailUrl = `/${lang}/games/${game.id}/`;

    return (
        <div className="group relative flex flex-col bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 hover:shadow-md hover:ring-blue-200 transition-all duration-200 overflow-hidden">
            {/* Card body — links to detail page */}
            <Link href={detailUrl} className="flex flex-col flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-t-2xl">
                {/* Cover / Placeholder */}
                <div className="w-full h-40 flex-shrink-0 overflow-hidden rounded-t-2xl">
                    <GameCoverPlaceholder
                        color={game.coverColor}
                        engineLabel={game.engineLabel}
                        gameName={game.name[lang]}
                    />
                </div>

                <div className="flex flex-col flex-1 p-5 gap-3">
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {game.name[lang]}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                        {game.description[lang]}
                    </p>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                        {game.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            </Link>

            {/* Footer — action buttons */}
            <div className="px-5 pb-5 pt-0 flex items-center justify-between">
                <Link
                    href={detailUrl}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                    {t(lang, "learnMore")} →
                </Link>
                <a
                    href={game.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm"
                >
                    {t(lang, "playGame")}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.839Z" />
                    </svg>
                </a>
            </div>
        </div>
    );
}
