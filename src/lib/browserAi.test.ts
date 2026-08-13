import { afterEach, describe, expect, it, vi } from "vitest";

import {
    checkImageRecognitionAvailability,
    parseRecognitionResult,
    RecognizeError,
    recognizeImage,
    truncateTitle,
    withTimeout,
} from "./browserAi";

afterEach(() => {
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel;
    vi.useRealTimers();
});

describe("truncateTitle", () => {
    it("不超过 80 字符则原样返回", () => {
        expect(truncateTitle("short title")).toBe("short title");
    });

    it("超过 80 字符时优先在空白处截断", () => {
        const title = `${"word ".repeat(20)}END`;
        const result = truncateTitle(title);
        expect(result.length).toBeLessThanOrEqual(80);
        expect(result.endsWith(" ")).toBe(false);
        expect(result.includes("word")).toBe(true);
    });
});

describe("parseRecognitionResult", () => {
    it("解析合法 JSON", () => {
        expect(parseRecognitionResult(JSON.stringify({ title: " Cat ", description: "A cat." }))).toEqual({
            title: "Cat",
            description: "A cat.",
            tags: "",
        });
    });

    it("缺 title 视为 failed", () => {
        expect(() => parseRecognitionResult(JSON.stringify({ description: "x" }))).toThrow(RecognizeError);
        try {
            parseRecognitionResult(JSON.stringify({ description: "x" }));
        } catch (err) {
            expect(err).toMatchObject({ code: "failed" });
        }
    });

    it("空 title 视为 empty_title", () => {
        expect(() => parseRecognitionResult(JSON.stringify({ title: "  ", description: "x" }))).toThrow(
            RecognizeError,
        );
        try {
            parseRecognitionResult(JSON.stringify({ title: "  ", description: "x" }));
        } catch (err) {
            expect(err).toMatchObject({ code: "empty_title" });
        }
    });

    it("缺 description 视为空字符串", () => {
        expect(parseRecognitionResult(JSON.stringify({ title: "Hello" }))).toEqual({
            title: "Hello",
            description: "",
            tags: "",
        });
    });

    it("解析 tags 数组并截到 8 个", () => {
        expect(
            parseRecognitionResult(
                JSON.stringify({
                    title: "T",
                    description: "D",
                    tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
                }),
            ),
        ).toEqual({
            title: "T",
            description: "D",
            tags: "a, b, c, d, e, f, g, h",
        });
    });

    it("tags 为逗号字符串也可解析", () => {
        expect(
            parseRecognitionResult(JSON.stringify({ title: "T", description: "D", tags: "x, y" })),
        ).toEqual({
            title: "T",
            description: "D",
            tags: "x, y",
        });
    });

    it("非法 JSON 视为 failed", () => {
        try {
            parseRecognitionResult("not-json");
        } catch (err) {
            expect(err).toMatchObject({ code: "failed" });
        }
    });
});

describe("withTimeout", () => {
    it("超时抛出对应错误码", async () => {
        vi.useFakeTimers();
        const pending = withTimeout(new Promise(() => undefined), 50, "timeout");
        const assertion = expect(pending).rejects.toMatchObject({ code: "timeout" });
        await vi.advanceTimersByTimeAsync(50);
        await assertion;
    });

    it("在时限内完成则返回值", async () => {
        await expect(withTimeout(Promise.resolve("ok"), 50, "timeout")).resolves.toBe("ok");
    });
});

describe("checkImageRecognitionAvailability", () => {
    it("无 LanguageModel 为 unsupported", async () => {
        await expect(checkImageRecognitionAvailability()).resolves.toBe("unsupported");
    });

    it("availability 为 unavailable 时 unsupported", async () => {
        (globalThis as unknown as { LanguageModel: unknown }).LanguageModel = {
            availability: async () => "unavailable",
            create: async () => ({ prompt: async () => "", destroy() {} }),
        };
        await expect(checkImageRecognitionAvailability()).resolves.toBe("unsupported");
    });

    it("availability 为 available 时 supported", async () => {
        (globalThis as unknown as { LanguageModel: unknown }).LanguageModel = {
            availability: async () => "available",
            create: async () => ({ prompt: async () => "", destroy() {} }),
        };
        await expect(checkImageRecognitionAvailability()).resolves.toBe("supported");
    });

    it("availability 抛错时 unsupported", async () => {
        (globalThis as unknown as { LanguageModel: unknown }).LanguageModel = {
            availability: async () => {
                throw new Error("no");
            },
            create: async () => ({ prompt: async () => "", destroy() {} }),
        };
        await expect(checkImageRecognitionAvailability()).resolves.toBe("unsupported");
    });
});

describe("recognizeImage", () => {
    it("按 targetLang 调用模型并解析结果", async () => {
        const prompt = vi.fn(async () => JSON.stringify({ title: "A tree", description: "Green." }));
        const destroy = vi.fn();
        const create = vi.fn(async () => ({ prompt, destroy }));
        (globalThis as unknown as { LanguageModel: unknown }).LanguageModel = {
            availability: async () => "available",
            create,
        };
        const image = document.createElement("img");
        const result = await recognizeImage({ image, targetLang: "es" });
        expect(result).toEqual({ title: "A tree", description: "Green.", tags: "" });
        expect(create).toHaveBeenCalled();
        expect(JSON.stringify(prompt.mock.calls)).toContain("Spanish");
        expect(destroy).toHaveBeenCalled();
    });

    it("恢复语言写入对应的 prompt 语言名", async () => {
        const prompt = vi.fn(async () => JSON.stringify({ title: "A tree", description: "Green." }));
        (globalThis as unknown as { LanguageModel: unknown }).LanguageModel = {
            availability: async () => "available",
            create: async () => ({ prompt, destroy() {} }),
        };
        const image = document.createElement("img");
        await recognizeImage({ image, targetLang: "ja" });
        expect(JSON.stringify(prompt.mock.calls)).toContain("Japanese");
        await recognizeImage({ image, targetLang: "fr" });
        expect(JSON.stringify(prompt.mock.calls)).toContain("French");
        await recognizeImage({ image, targetLang: "zh-TW" });
        expect(JSON.stringify(prompt.mock.calls)).toContain("Traditional Chinese");
    });
});
