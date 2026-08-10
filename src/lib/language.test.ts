import { describe, expect, it } from "vitest";

import {
    defaultLanguage,
    getTargetLang,
    isValidLang,
    supportedLanguages,
} from "@/lib/language";

describe("isValidLang", () => {
    it("对全部受支持语言返回 true", () => {
        for (const { key } of supportedLanguages) {
            expect(isValidLang(key)).toBe(true);
        }
    });

    it("对不受支持的语言返回 false", () => {
        expect(isValidLang("ko")).toBe(false);
        expect(isValidLang("")).toBe(false);
        expect(isValidLang("EN")).toBe(false);
    });
});

describe("getTargetLang", () => {
    it("精确匹配受支持语言时原样返回", () => {
        expect(getTargetLang("zh", "en")).toBe("zh");
        expect(getTargetLang("es", "en")).toBe("es");
    });

    it("Accept-Language 头含地区后缀时匹配到主语言", () => {
        expect(getTargetLang("zh-CN,zh;q=0.9,en;q=0.8", "en")).toBe("zh");
    });

    it("任意无法匹配的输入均回退到受支持语言首项（accept-language.get 永不返回 null）", () => {
        expect(getTargetLang("ko-KR,ko;q=0.9", defaultLanguage)).toBe(defaultLanguage);
        expect(getTargetLang("xx-YY", "es")).toBe(supportedLanguages[0].key);
    });

    it("空输入时返回受支持语言列表的首项（accept-language 库实际行为）", () => {
        expect(getTargetLang("", "es")).toBe(supportedLanguages[0].key);
    });
});
