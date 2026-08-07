import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MarkdownContent from "@/components/MarkdownContent";

describe("MarkdownContent", () => {
    it("将 markdown 渲染为对应 HTML 元素", () => {
        render(<MarkdownContent content={"# 标题\n\n正文含 **加粗** 文本"} />);
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("标题");
        expect(screen.getByText("加粗")).toBeInTheDocument();
    });

    it("净化恶意脚本标签，script 不会进入渲染结果", () => {
        const { container } = render(
            <MarkdownContent content={'safe text<script>alert(1)</script>'} />,
        );
        expect(container.querySelector("script")).toBeNull();
        expect(container.textContent).toContain("safe text");
    });
});
