import type { LangKey } from "@/lib/language";
import type { GameData } from "@/data/games";
import GameCard from "@/components/GameCard";

type Props = {
    games: GameData[];
    lang: LangKey;
};

export default function GameGrid({ games, lang }: Props) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
                <GameCard key={game.id} game={game} lang={lang} />
            ))}
        </div>
    );
}
