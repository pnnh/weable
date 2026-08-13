import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ImageAiMetaSection, { type ImageAiLabels } from "./ImageAiMetaSection";

const labels: ImageAiLabels = {
    imageTitle: "Title",
    imageDescription: "Description",
    cancel: "Cancel",
    aiRecognize: "AI recognize",
    aiRecognizeConfirmTitle: "Recognize image with on-device AI",
    aiRecognizeConfirmBody: "Uses local AI. Overwrites title and description. Does not save.",
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
        promptImpl ?? (async () => JSON.stringify({ title: "Mock title", description: "Mock desc" })),
    );
    const destroy = vi.fn();
    (globalThis as unknown as { LanguageModel: unknown }).LanguageModel = {
        availability: async () => "available",
        create: async () => ({ prompt, destroy }),
    };
    return { prompt, destroy };
}

function renderSection(pageLang: "en" | "es" | "zh" = "zh") {
    const img = document.createElement("img");
    img.id = "image-preview";
    document.body.appendChild(img);
    return render(
        <form>
            <ImageAiMetaSection
                pageLang={pageLang}
                imageElementId="image-preview"
                initialTitle="Old title"
                initialDescription="Old desc"
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
        fireEvent.click(button);
        expect(screen.getByLabelText("Output language")).toHaveValue("zh");
    });

    it("确认后覆盖标题与描述且不 submit", async () => {
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
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it("失败重试不打开确认，并沿用上次目标语言", async () => {
        let calls = 0;
        const { prompt } = installLanguageModel(async () => {
            calls += 1;
            if (calls === 1) throw new Error("simulated");
            return JSON.stringify({ title: "Retry title", description: "Retry desc" });
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
        installLanguageModel(async () => JSON.stringify({ title: "  ", description: "x" }));
        renderSection("en");
        const button = await screen.findByRole("button", { name: "AI recognize" });
        await waitFor(() => expect(button).toBeEnabled());
        fireEvent.click(button);
        fireEvent.click(screen.getByRole("button", { name: "Recognize" }));
        await waitFor(() => expect(button.parentElement).toHaveAttribute("title", "No usable title was returned."));
        expect(screen.getByDisplayValue("Old title")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Old desc")).toBeInTheDocument();
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
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByLabelText("Output language")).toHaveValue("zh");
    });
});
