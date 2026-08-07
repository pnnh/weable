import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";

describe("SiteFooter", () => {
    it("渲染站点名称与当前年份", () => {
        const { container } = render(<SiteFooter lang="en" />);
        expect(container.textContent).toContain(t("en", "siteName"));
        expect(container.textContent).toContain(String(new Date().getFullYear()));
    });

    it("按传入语言取站点名称", () => {
        const { container } = render(<SiteFooter lang="zh" />);
        expect(container.textContent).toContain(t("zh", "siteName"));
    });
});
