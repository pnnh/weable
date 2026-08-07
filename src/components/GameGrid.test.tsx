import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import GameGrid from "@/components/GameGrid";
import { games } from "@/data/games";

describe("GameGrid", () => {
    it("按 games 数组数量渲染对应数量的卡片", () => {
        render(<GameGrid games={games} lang="en" />);
        // 每张 GameCard 渲染一个 h2 游戏名标题
        expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(games.length);
    });

    it("空数组时不渲染任何卡片", () => {
        render(<GameGrid games={[]} lang="en" />);
        expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    });
});
