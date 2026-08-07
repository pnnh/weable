import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import GameCard from "@/components/GameCard";
import type { GameData } from "@/data/games";

// 测试夹具：GameData 的 name/description 等字段为全语言映射，需补齐 8 种语言
const langs = ["en", "es", "fr", "de-DE", "pt-PT", "ja", "zh", "zh-TW"] as const;

function langMap(text: string): Record<(typeof langs)[number], string> {
    return Object.fromEntries(langs.map((l) => [l, text])) as Record<
        (typeof langs)[number],
        string
    >;
}

const game: GameData = {
    id: "test-game",
    url: "https://test-game.example.com",
    coverColor: "#1e3a5f",
    engineLabel: "Test Engine",
    name: langMap("Test Game"),
    description: langMap("A test game description."),
    features: Object.fromEntries(langs.map((l) => [l, ["feature"]])) as GameData["features"],
    detail: langMap("detail"),
    tags: ["tag-a", "tag-b", "tag-c", "tag-d"],
};

describe("GameCard", () => {
    it("渲染游戏名称与描述", () => {
        render(<GameCard game={game} lang="en" />);
        expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Test Game");
        expect(screen.getByText("A test game description.")).toBeInTheDocument();
    });

    it("标签最多渲染 3 个", () => {
        render(<GameCard game={game} lang="en" />);
        expect(screen.getByText("tag-a")).toBeInTheDocument();
        expect(screen.getByText("tag-b")).toBeInTheDocument();
        expect(screen.getByText("tag-c")).toBeInTheDocument();
        expect(screen.queryByText("tag-d")).not.toBeInTheDocument();
    });

    it("详情链接指向 /{lang}/games/{id}，外链按钮指向游戏地址", () => {
        const { container } = render(<GameCard game={game} lang="en" />);
        // next/link 渲染时会去除尾部斜杠，源码传入的 href 为 /{lang}/games/{id}/
        expect(
            container.querySelector('a[href="/en/games/test-game"]'),
        ).not.toBeNull();
        const external = container.querySelector('a[href="https://test-game.example.com"]');
        expect(external).not.toBeNull();
        expect(external).toHaveAttribute("target", "_blank");
    });
});
