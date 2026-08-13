"use client";

import { useEffect, useRef, useState } from "react";
import { TbAlertCircle, TbLoader2, TbPhotoAi } from "react-icons/tb";
import { supportedLanguages, type LangKey } from "@/lib/language";
import {
    checkImageRecognitionAvailability,
    recognizeImage,
    RecognizeError,
    type RecognizeErrorCode,
    type TargetLang,
} from "@/lib/browserAi";

export type ImageAiLabels = {
    imageTitle: string;
    imageDescription: string;
    cancel: string;
    aiRecognize: string;
    aiRecognizeConfirmTitle: string;
    aiRecognizeConfirmBody: string;
    aiRecognizeConfirm: string;
    aiRecognizeTargetLang: string;
    aiRecognizeUnsupported: string;
    aiRecognizeRunning: string;
    aiRecognizeTimeout: string;
    aiRecognizeModelNotReady: string;
    aiRecognizeImageUnreadable: string;
    aiRecognizeEmptyTitle: string;
    aiRecognizeFailed: string;
};

type RecognizeStatus = "unsupported" | "ready" | "running" | "failed";

type Props = {
    pageLang: LangKey;
    imageElementId: string;
    initialTitle: string;
    initialDescription: string;
    labels: ImageAiLabels;
};

function labelForCode(code: RecognizeErrorCode, labels: ImageAiLabels): string {
    switch (code) {
        case "timeout":
            return labels.aiRecognizeTimeout;
        case "model_not_ready":
            return labels.aiRecognizeModelNotReady;
        case "image_unreadable":
            return labels.aiRecognizeImageUnreadable;
        case "empty_title":
            return labels.aiRecognizeEmptyTitle;
        case "unsupported":
            return labels.aiRecognizeUnsupported;
        default:
            return labels.aiRecognizeFailed;
    }
}

export default function ImageAiMetaSection({
    pageLang,
    imageElementId,
    initialTitle,
    initialDescription,
    labels,
}: Props) {
    const [status, setStatus] = useState<RecognizeStatus>("unsupported");
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [draftLang, setDraftLang] = useState<TargetLang>(pageLang);
    const [lastConfirmedLang, setLastConfirmedLang] = useState<TargetLang | null>(null);
    const [lastError, setLastError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        let cancelled = false;
        checkImageRecognitionAvailability().then((result) => {
            if (cancelled) return;
            setStatus(result === "unsupported" ? "unsupported" : "ready");
        });
        return () => {
            cancelled = true;
            abortRef.current?.abort();
        };
    }, []);

    function buttonTitle(): string {
        if (status === "unsupported") return labels.aiRecognizeUnsupported;
        if (status === "running") return labels.aiRecognizeRunning;
        if (status === "failed") return lastError ?? labels.aiRecognizeFailed;
        return labels.aiRecognize;
    }

    function openConfirm() {
        if (status !== "ready") return;
        setDraftLang(pageLang);
        setDialogOpen(true);
    }

    function closeConfirm() {
        setDialogOpen(false);
        setDraftLang(pageLang);
    }

    async function runRecognize(targetLang: TargetLang) {
        if (status === "running") return;
        const image = document.getElementById(imageElementId);
        if (!(image instanceof HTMLImageElement)) {
            setLastError(labels.aiRecognizeImageUnreadable);
            setStatus("failed");
            return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setDialogOpen(false);
        setLastError(null);
        setStatus("running");

        try {
            const result = await recognizeImage({
                image,
                targetLang,
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            setTitle(result.title);
            setDescription(result.description);
            setStatus("ready");
        } catch (err) {
            if (controller.signal.aborted) return;
            const code = err instanceof RecognizeError ? err.code : "failed";
            setLastError(labelForCode(code, labels));
            setStatus("failed");
        }
    }

    function handleButtonClick() {
        if (status === "unsupported" || status === "running") return;
        if (status === "failed") {
            const lang = lastConfirmedLang ?? pageLang;
            void runRecognize(lang);
            return;
        }
        openConfirm();
    }

    function handleConfirm() {
        setLastConfirmedLang(draftLang);
        void runRecognize(draftLang);
    }

    const Icon =
        status === "running" ? TbLoader2 : status === "failed" ? TbAlertCircle : TbPhotoAi;
    const disabled = status === "unsupported" || status === "running";

    return (
        <div className="space-y-6">
            <div className="flex items-center">
                <span title={buttonTitle()} className="inline-flex">
                    <button
                        type="button"
                        disabled={disabled}
                        aria-label={labels.aiRecognize}
                        aria-busy={status === "running"}
                        onClick={handleButtonClick}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icon
                            className={`h-5 w-5 ${status === "running" ? "animate-spin" : ""} ${status === "failed" ? "text-red-600" : ""}`}
                            aria-hidden
                        />
                    </button>
                </span>
            </div>

            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ai-recognize-title"
                        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
                    >
                        <h2 id="ai-recognize-title" className="text-lg font-semibold text-gray-900 mb-4">
                            {labels.aiRecognizeConfirmTitle}
                        </h2>
                        <p className="text-sm text-gray-700 mb-4">{labels.aiRecognizeConfirmBody}</p>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {labels.aiRecognizeTargetLang}
                            <select
                                aria-label={labels.aiRecognizeTargetLang}
                                value={draftLang}
                                onChange={(e) => setDraftLang(e.target.value as TargetLang)}
                                className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {supportedLanguages.map((item) => (
                                    <option key={item.key} value={item.key}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={closeConfirm}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {labels.cancel}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                            >
                                {labels.aiRecognizeConfirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.imageTitle}</label>
                <input
                    name="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels.imageDescription}</label>
                <textarea
                    name="description"
                    rows={8}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
        </div>
    );
}
