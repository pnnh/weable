import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import GameCoverPlaceholder from "@/components/GameCoverPlaceholder";

describe("GameCoverPlaceholder", () => {
    it("渲染引擎标签并以游戏名作为 aria-label", () => {
        render(
            <GameCoverPlaceholder
                color="#1e3a5f"
                engineLabel="Cocos Creator"
                gameName="Atetris"
            />,
        );
        expect(screen.getByLabelText("Atetris")).toBeInTheDocument();
        expect(screen.getByText("Cocos Creator")).toBeInTheDocument();
    });

    it("应用传入的背景色", () => {
        render(
            <GameCoverPlaceholder
                color="#1e3a5f"
                engineLabel="Godot"
                gameName="Test Game"
            />,
        );
        expect(screen.getByLabelText("Test Game")).toHaveStyle({
            backgroundColor: "#1e3a5f",
        });
    });
});
