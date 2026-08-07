import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ImageSearchBar from "@/components/ImageSearchBar";

// 轻量路由桩：仅替代 next/navigation 的 useRouter（research.md R3，FR-005）
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderBar(defaultValue = "") {
    return render(
        <ImageSearchBar
            lang="en"
            defaultValue={defaultValue}
            placeholder="Search…"
            searchLabel="Search"
        />,
    );
}

describe("ImageSearchBar", () => {
    it("输入关键词提交后跳转带查询参数的路径", () => {
        renderBar();
        fireEvent.change(screen.getByPlaceholderText("Search…"), {
            target: { value: "space war" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Search" }));
        expect(push).toHaveBeenCalledWith("/en?q=space%20war");
    });

    it("空白输入提交后跳转语言根路径（trim 后为空视为无搜索）", () => {
        renderBar("   ");
        fireEvent.click(screen.getByRole("button", { name: "Search" }));
        expect(push).toHaveBeenCalledWith("/en");
    });
});
