import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type LangKey } from "@/lib/language";

import ImageAiMetaSection, { type ImageAiLabels } from "./ImageAiMetaSection";

vi.mock("yet-another-react-lightbox-lite", () => ({
    default: function LightboxMock({
        index,
        setIndex,
        labels: lightboxLabels,
    }: {
        index: number | undefined;
        setIndex: (next: number | undefined) => void;
        labels?: { Close?: string };
    }) {
        if (index === undefined) return null;
        return (
            <div role="dialog" aria-label="preview-lightbox">
                <button type="button" onClick={() => setIndex(undefined)}>
                    {lightboxLabels?.Close ?? "Close"}
                </button>
            </div>
        );
    },
}));

vi.mock("yet-another-react-lightbox-lite/styles.css", () => ({}));

const labels: ImageAiLabels = {
    imageTitle: "Title",
    imageTags: "Tags",
    imageDescription: "Description",
    imagePreview: "Enlarge preview",
    imagePreviewClose: "Close preview",
    imagePreviewUnavailable: "Preview unavailable",
    cancel: "Cancel",
    aiRecognize: "AI recognize",
    aiRecognizeConfirmTitle: "Recognize image with on-device AI",
    aiRecognizeConfirmBody: "Uses local AI. Overwrites title, description, and tags. Does not save.",
    aiRecognizeConfirm: "Recognize",
    aiRecognizeTargetLang: "Output language",
    aiRecognizeUnsupported: "Switch to Chrome or Edge",
    aiRecognizeRunning: "Recognizing…",
    aiRecognizeTimeout: "Recognition timed out.",
    aiRecognizeModelNotReady: "The on-device model is not ready.",
    aiRecognizeImageUnreadable: "Could not read the current image.",
    aiRecognizeEmptyTitle: "No usable title was returned.",
    aiRecognizeFailed: "Recognition failed.",
};

function installLanguageModel(promptImpl?: () => Promise<string>) {
    const prompt = vi.fn(
        promptImpl ??
            (async () => JSON.stringify({ title: "Mock title", description: "Mock desc", tags: ["sky", "ocean"] })),
    );
    const destroy = vi.fn();
    (globalThis as unknown as { LanguageModel: unknown }).LanguageModel = {
        availability: async () => "available",
        create: async () => ({ prompt, destroy }),
    };
    return { prompt, destroy };
}

function mountPreviewImage() {
    const img = document.createElement("img");
    img.id = "image-preview";
    Object.defineProperty(img, "naturalWidth", { configurable: true, value: 100 });
    Object.defineProperty(img, "naturalHeight", { configurable: true, value: 80 });
    img.src = "https://example.test/preview.png";
    document.body.appendChild(img);
    return img;
}

function renderSection(pageLang: LangKey = "zh") {
    mountPreviewImage();
    return render(
        <form>
            <ImageAiMetaSection
                pageLang={pageLang}
                imageElementId="image-preview"
                initialTitle="Old title"
                initialDescription="Old desc"
                initialTags="old-tag"
                labels={labels}
            />
        </form>,
    );
}

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(() => {
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel;
    document.getElementById("image-preview")?.remove();
});

describe("ImageAiMetaSection", () => {
    it("无 LanguageModel 时按钮禁用，悬停含 Chrome/Edge，点击不打开确认", async () => {
        renderSection("en");
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeDisabled());
        expect(button.parentElement).toHaveAttribute("title", expect.stringContaining("Chrome"));
        fireEvent.click(button);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("确认框输出语言为站点支持的 6 项，页面语言为日语时默认 ja", async () => {
        installLanguageModel();
        renderSection("ja");
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        const select = screen.getByLabelText("Output language");
        const values = screen.getAllByRole("option").map((option) => (option as HTMLOptionElement).value);
        expect(values).toEqual(["en", "es", "fr", "ja", "zh", "zh-TW"]);
        expect(select).toHaveValue("ja");
    });

    it("取消确认不改表单，再次打开下拉回到页面语言", async () => {
        installLanguageModel();
        renderSection("zh");
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        const select = screen.getByLabelText("Output language");
        expect(select).toHaveValue("zh");
        fireEvent.change(select, { target: { value: "en" } });
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(screen.getByDisplayValue("Old title")).toBeInTheDocument();
        expect(screen.getByDisplayValue("old-tag")).toBeInTheDocument();
        fireEvent.click(button);
        expect(screen.getByLabelText("Output language")).toHaveValue("zh");
    });

    it("字段顺序为 Title → Tags → Description，初始 tags 来自 props", () => {
        renderSection("en");
        const title = document.querySelector('input[name="title"]');
        const tags = document.querySelector('input[name="tags"]');
        const description = document.querySelector('textarea[name="description"]');
        expect(title).toBeTruthy();
        expect(tags).toBeTruthy();
        expect(description).toBeTruthy();
        expect(title!.compareDocumentPosition(tags!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(tags!.compareDocumentPosition(description!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect((tags as HTMLInputElement).value).toBe("old-tag");
    });

    it("确认后覆盖标题、描述与标签且不 submit", async () => {
        installLanguageModel();
        const onSubmit = vi.fn((e: Event) => e.preventDefault());
        renderSection("zh");
        document.querySelector("form")?.addEventListener("submit", onSubmit);
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        fireEvent.change(screen.getByLabelText("Output language"), { target: { value: "en" } });
        fireEvent.click(screen.getByRole("button", { name: "Recognize" }));
        await waitFor(() => expect(screen.getByDisplayValue("Mock title")).toBeInTheDocument());
        expect(screen.getByDisplayValue("Mock desc")).toBeInTheDocument();
        expect(screen.getByDisplayValue("sky, ocean")).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("识别成功但无 tags 时清空标签框", async () => {
        installLanguageModel(async () => JSON.stringify({ title: "T", description: "D" }));
        renderSection("en");
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        fireEvent.click(screen.getByRole("button", { name: "Recognize" }));
        await waitFor(() => expect(screen.getByDisplayValue("T")).toBeInTheDocument());
        expect((document.querySelector('input[name="tags"]') as HTMLInputElement).value).toBe("");
    });

    it("失败重试不打开确认，并沿用上次目标语言", async () => {
        let calls = 0;
        const { prompt } = installLanguageModel(async () => {
            calls += 1;
            if (calls === 1) throw new Error("simulated");
            return JSON.stringify({ title: "Retry title", description: "Retry desc", tags: ["retry"] });
        });
        renderSection("zh");
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        fireEvent.change(screen.getByLabelText("Output language"), { target: { value: "en" } });
        fireEvent.click(screen.getByRole("button", { name: "Recognize" }));
        await waitFor(() => expect(button.parentElement).toHaveAttribute("title", "Recognition failed."));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(screen.getByDisplayValue("Old title")).toBeInTheDocument();
        fireEvent.click(button);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        await waitFor(() => expect(screen.getByDisplayValue("Retry title")).toBeInTheDocument());
        expect(prompt).toHaveBeenCalledTimes(2);
        expect(JSON.stringify(prompt.mock.calls)).toContain("English");
    });

    it("空标题视为失败且不写表单", async () => {
        installLanguageModel(async () => JSON.stringify({ title: "  ", description: "x", tags: ["new"] }));
        renderSection("en");
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        fireEvent.click(screen.getByRole("button", { name: "Recognize" }));
        await waitFor(() => expect(button.parentElement).toHaveAttribute("title", "No usable title was returned."));
        expect(screen.getByDisplayValue("Old title")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Old desc")).toBeInTheDocument();
        expect(screen.getByDisplayValue("old-tag")).toBeInTheDocument();
    });

    it("加载中忽略再次点击", async () => {
        installLanguageModel(() => new Promise(() => undefined));
        renderSection("en");
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        fireEvent.click(screen.getByRole("button", { name: "Recognize" }));
        await waitFor(() => expect(button).toBeDisabled());
        fireEvent.click(button);
        expect(screen.queryByRole("dialog", { name: "Recognize image with on-device AI" })).not.toBeInTheDocument();
    });

    it("成功后再点会重新打开确认，下拉为页面语言", async () => {
        installLanguageModel();
        renderSection("zh");
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        fireEvent.change(screen.getByLabelText("Output language"), { target: { value: "en" } });
        fireEvent.click(screen.getByRole("button", { name: "Recognize" }));
        await waitFor(() => expect(screen.getByDisplayValue("Mock title")).toBeInTheDocument());
        fireEvent.click(button);
        expect(screen.getByRole("dialog", { name: "Recognize image with on-device AI" })).toBeInTheDocument();
        expect(screen.getByLabelText("Output language")).toHaveValue("zh");
    });

    it("放大预览在 AI 识别左侧，无模型时仍可打开并关闭", async () => {
        renderSection("en");
        const preview = screen.getByRole("button", { name: "Enlarge preview" });
        const ai = screen.getByRole("button", { name: "AI recognize" });
        expect(preview.compareDocumentPosition(ai) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        await waitFor(() => expect(ai).toBeDisabled());
        expect(preview).toBeEnabled();
        fireEvent.click(preview);
        expect(screen.getByRole("dialog", { name: "preview-lightbox" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
        expect(screen.queryByRole("dialog", { name: "preview-lightbox" })).not.toBeInTheDocument();
        expect(screen.getByDisplayValue("Old title")).toBeInTheDocument();
        expect(screen.getByDisplayValue("old-tag")).toBeInTheDocument();
    });

    it("识别进行中打开预览不 abort，结束后仍回填", async () => {
        let resolvePrompt: ((value: string) => void) | undefined;
        const { destroy } = installLanguageModel(
            () =>
                new Promise<string>((resolve) => {
                    resolvePrompt = resolve;
                }),
        );
        renderSection("en");
        const ai = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(ai).toBeEnabled());
        fireEvent.click(ai);
        fireEvent.click(screen.getByRole("button", { name: "Recognize" }));
        await waitFor(() => expect(ai).toBeDisabled());
        fireEvent.click(screen.getByRole("button", { name: "Enlarge preview" }));
        expect(screen.getByRole("dialog", { name: "preview-lightbox" })).toBeInTheDocument();
        expect(destroy).not.toHaveBeenCalled();
        resolvePrompt?.(JSON.stringify({ title: "Later", description: "Done", tags: ["live"] }));
        await waitFor(() => expect(screen.getByDisplayValue("Later")).toBeInTheDocument());
        expect(screen.getByDisplayValue("live")).toBeInTheDocument();
    });
});
