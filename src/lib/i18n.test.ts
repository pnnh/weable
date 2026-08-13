import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import { t } from "@/lib/i18n";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import ja from "@/locales/ja.json";
import zhTW from "@/locales/zh-TW.json";

function historicalLocale(lang: "fr" | "ja" | "zh-TW"): Record<string, string> {
    const raw = execFileSync("git", ["show", `dc57f28^:src/locales/${lang}.json`], {
        encoding: "utf8",
    });
    return JSON.parse(raw) as Record<string, string>;
}

describe("t", () => {
    it("命中目标语言文案", () => {
        expect(t("en", "home")).toBe("Home");
        expect(t("en", "siteName")).toBe("Weable");
    });

    it("不同语言返回各自文案", () => {
        expect(t("es", "home")).not.toBe("");
        expect(t("zh", "home")).not.toBe("");
        expect(t("fr", "home")).not.toBe("");
        expect(t("ja", "home")).not.toBe("");
        expect(t("zh-TW", "home")).not.toBe("");
    });

    it("恢复语言键集与英语一致，历史 79 条与 dc57f28^ 相同", () => {
        const enKeys = Object.keys(en);
        for (const [lang, current] of [
            ["fr", fr],
            ["ja", ja],
            ["zh-TW", zhTW],
        ] as const) {
            expect(Object.keys(current).sort()).toEqual([...enKeys].sort());
            const historical = historicalLocale(lang);
            expect(Object.keys(historical)).toHaveLength(79);
            for (const [key, value] of Object.entries(historical)) {
                expect(current[key as keyof typeof current]).toBe(value);
            }
        }
    });

    it("新译文保留 {count} 占位符", () => {
        for (const messages of [fr, ja, zhTW]) {
            expect(messages.batchDeleteConfirmBody).toContain("{count}");
            expect(messages.uploadQueueSkippedDupes).toContain("{count}");
            expect(messages.uploadQueueStatusFailed).toContain("{count}");
        }
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
