import { describe, expect, it } from "vitest";

import { t } from "@/lib/i18n";

describe("t", () => {
    it("命中目标语言文案", () => {
        expect(t("en", "home")).toBe("Home");
        expect(t("en", "siteName")).toBe("Weable");
    });

    it("不同语言返回各自文案", () => {
        expect(t("es", "home")).not.toBe("");
        expect(t("zh", "home")).not.toBe("");
    });

    // 目标语言与英文均缺失该 key 时回退到 key 本身。
    // 说明：所有 locale 文件键集经比对完全一致，"仅目标语言缺失→回退英文"分支
    // 无法由真实数据触达；为遵守"不引入复杂 mock"约束，此处不伪造 locale 数据，
    // 仅验证回退链末端（key 本身）。
    it("key 不存在时回退到 key 本身", () => {
        expect(t("en", "noSuchKey" as never)).toBe("noSuchKey");
        expect(t("zh", "noSuchKey" as never)).toBe("noSuchKey");
    });
});
