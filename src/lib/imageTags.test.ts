import { describe, expect, it } from "vitest";

import { AI_TAGS_MAX, TAGS_MAX_CHARS, normalizeTags, tagsFromRecognition } from "./imageTags";

describe("normalizeTags", () => {
    it("去掉空白与空段", () => {
        expect(normalizeTags(" a, ,b ")).toBe("a, b");
    });

    it("仅逗号视为空", () => {
        expect(normalizeTags(" , , ")).toBe("");
    });

    it("人工输入超过 8 项不截断个数", () => {
        const nine = Array.from({ length: 9 }, (_, i) => `t${i}`).join(",");
        const result = normalizeTags(nine);
        expect(result.split(", ")).toHaveLength(9);
    });

    it("整串超过 500 字符时在逗号处截断", () => {
        const tags = Array.from({ length: 80 }, (_, i) => `tag${String(i).padStart(3, "0")}`).join(", ");
        expect(tags.length).toBeGreaterThan(TAGS_MAX_CHARS);
        const result = normalizeTags(tags);
        expect(result.length).toBeLessThanOrEqual(TAGS_MAX_CHARS);
        expect(result.endsWith(",")).toBe(false);
        expect(result.includes(", ")).toBe(true);
    });
});

describe("tagsFromRecognition", () => {
    it("数组只保留前 8 项", () => {
        const items = Array.from({ length: 10 }, (_, i) => `t${i}`);
        const result = tagsFromRecognition(items);
        expect(result.split(", ")).toHaveLength(AI_TAGS_MAX);
        expect(result).toBe("t0, t1, t2, t3, t4, t5, t6, t7");
    });

    it("逗号字符串可解析", () => {
        expect(tagsFromRecognition("x, y")).toBe("x, y");
    });

    it("缺省与非法为空白", () => {
        expect(tagsFromRecognition(undefined)).toBe("");
        expect(tagsFromRecognition(null)).toBe("");
        expect(tagsFromRecognition(1)).toBe("");
    });
});
