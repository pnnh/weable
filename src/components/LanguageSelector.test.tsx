import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LanguageSelector from "@/components/LanguageSelector";
import { supportedLanguages } from "@/lib/language";

// 轻量路由桩：仅替代 next/navigation 的 useRouter（research.md R3，FR-005）
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("LanguageSelector", () => {
    it("渲染全部受支持语言且当前语言选中", () => {
        render(<LanguageSelector currentLang="en" />);
        expect(screen.getAllByRole("option")).toHaveLength(supportedLanguages.length);
        expect(screen.getByRole("combobox")).toHaveValue("en");
    });

    it("切换语言触发 router.push 至目标路径", () => {
        render(<LanguageSelector currentLang="en" pathSuffix="games/spacewar/" />);
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "zh" } });
        expect(push).toHaveBeenCalledWith("/zh/games/spacewar/");
    });
});
