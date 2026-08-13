import type { LangKey } from "@/lib/language";

export type TargetLang = LangKey;

export type RecognizeErrorCode =
    | "unsupported"
    | "image_unreadable"
    | "model_not_ready"
    | "timeout"
    | "empty_title"
    | "failed";

export class RecognizeError extends Error {
    readonly code: RecognizeErrorCode;

    constructor(code: RecognizeErrorCode, message?: string) {
        super(message ?? code);
        this.name = "RecognizeError";
        this.code = code;
    }
}

export const READY_TIMEOUT_MS = 60_000;
export const PROMPT_TIMEOUT_MS = 30_000;
export const TITLE_MAX_CHARS = 80;

const SESSION_OPTIONS = {
    expectedInputs: [{ type: "text" }, { type: "image" }],
    expectedOutputs: [{ type: "text" }],
} as const;

const OUTPUT_LANG_NAME: Record<TargetLang, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    ja: "Japanese",
    zh: "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
};

type LanguageModelAvailability = "unavailable" | "downloadable" | "downloading" | "available";

type LanguageModelCreateOptions = {
    expectedInputs?: ReadonlyArray<{ type: string; languages?: string[] }>;
    expectedOutputs?: ReadonlyArray<{ type: string; languages?: string[] }>;
    signal?: AbortSignal;
};

type LanguageModelSession = {
    prompt(
        input: unknown,
        options?: { signal?: AbortSignal; responseConstraint?: unknown },
    ): Promise<string>;
    destroy(): void;
};

export type LanguageModelApi = {
    availability(options?: LanguageModelCreateOptions): Promise<LanguageModelAvailability>;
    create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
};

function getLanguageModel(): LanguageModelApi | undefined {
    return (globalThis as typeof globalThis & { LanguageModel?: LanguageModelApi }).LanguageModel;
}

export function isLanguageModelPresent(): boolean {
    const api = getLanguageModel();
    return typeof api?.availability === "function" && typeof api.create === "function";
}

export async function checkImageRecognitionAvailability(): Promise<"unsupported" | "supported"> {
    if (!isLanguageModelPresent()) return "unsupported";
    try {
        const result = await getLanguageModel()!.availability(SESSION_OPTIONS);
        if (result === "unavailable") return "unsupported";
        if (result === "downloadable" || result === "downloading" || result === "available") {
            return "supported";
        }
        return "unsupported";
    } catch {
        return "unsupported";
    }
}

export function truncateTitle(title: string): string {
    if (title.length <= TITLE_MAX_CHARS) return title;
    const slice = title.slice(0, TITLE_MAX_CHARS);
    const space = slice.lastIndexOf(" ");
    if (space >= 1) return slice.slice(0, space).trimEnd();
    return slice;
}

export function parseRecognitionResult(raw: string): { title: string; description: string } {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new RecognizeError("failed");
    }
    if (!parsed || typeof parsed !== "object" || !("title" in parsed)) {
        throw new RecognizeError("failed");
    }
    const record = parsed as { title: unknown; description?: unknown };
    const title = String(record.title ?? "").trim();
    if (!title) throw new RecognizeError("empty_title");
    const description = typeof record.description === "string" ? record.description : "";
    return { title: truncateTitle(title), description };
}

export async function withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    code: RecognizeErrorCode,
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new RecognizeError(code)), ms);
            }),
        ]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
}

function combineAbort(parent: AbortSignal | undefined, local: AbortController): () => void {
    if (!parent) return () => undefined;
    if (parent.aborted) {
        local.abort();
        return () => undefined;
    }
    const onAbort = () => local.abort();
    parent.addEventListener("abort", onAbort);
    return () => parent.removeEventListener("abort", onAbort);
}

async function ensureImageReady(image: HTMLImageElement): Promise<void> {
    if (typeof image.decode !== "function") return;
    try {
        if (!image.complete || image.naturalWidth === 0) {
            await image.decode();
        }
    } catch {
        throw new RecognizeError("image_unreadable");
    }
}

function buildPromptText(targetLang: TargetLang): string {
    return [
        "Describe only the attached image.",
        `Write the title and description in ${OUTPUT_LANG_NAME[targetLang]}.`,
        "The title must be short (about 80 characters or fewer).",
        "The description must be one paragraph covering the main subject, scene, and notable details.",
        "Do not wrap the answer in markdown fences or add extra keys.",
    ].join(" ");
}

export async function recognizeImage(input: {
    image: HTMLImageElement;
    targetLang: TargetLang;
    signal?: AbortSignal;
    readyTimeoutMs?: number;
    promptTimeoutMs?: number;
}): Promise<{ title: string; description: string }> {
    if (!input.image) throw new RecognizeError("image_unreadable");
    if (input.signal?.aborted) throw new RecognizeError("failed");

    await ensureImageReady(input.image);

    const api = getLanguageModel();
    if (!api) throw new RecognizeError("unsupported");

    const readyMs = input.readyTimeoutMs ?? READY_TIMEOUT_MS;
    const promptMs = input.promptTimeoutMs ?? PROMPT_TIMEOUT_MS;
    let session: LanguageModelSession | undefined;

    try {
        const readyAbort = new AbortController();
        const stopReadyParent = combineAbort(input.signal, readyAbort);
        const readyTimer = setTimeout(() => readyAbort.abort(), readyMs);
        try {
            session = await withTimeout(
                api.create({ ...SESSION_OPTIONS, signal: readyAbort.signal }),
                readyMs,
                "model_not_ready",
            );
        } catch (err) {
            if (err instanceof RecognizeError) throw err;
            throw new RecognizeError("model_not_ready");
        } finally {
            clearTimeout(readyTimer);
            stopReadyParent();
        }

        const promptAbort = new AbortController();
        const stopPromptParent = combineAbort(input.signal, promptAbort);
        const promptTimer = setTimeout(() => promptAbort.abort(), promptMs);
        try {
            const raw = await withTimeout(
                session.prompt(
                    [
                        {
                            role: "user",
                            content: [
                                { type: "text", value: buildPromptText(input.targetLang) },
                                { type: "image", value: input.image },
                            ],
                        },
                    ],
                    {
                        signal: promptAbort.signal,
                        responseConstraint: {
                            type: "object",
                            additionalProperties: false,
                            required: ["title", "description"],
                            properties: {
                                title: { type: "string" },
                                description: { type: "string" },
                            },
                        },
                    },
                ),
                promptMs,
                "timeout",
            );
            return parseRecognitionResult(raw);
        } catch (err) {
            if (err instanceof RecognizeError) throw err;
            throw new RecognizeError("failed");
        } finally {
            clearTimeout(promptTimer);
            stopPromptParent();
        }
    } finally {
        try {
            session?.destroy();
        } catch {
            // 会话可能已因 abort 失效
        }
    }
}
