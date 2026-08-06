"use client";

import { useState } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
    lang: string;
    ids: string[];
    onSuccess: () => void;
    labels: {
        title: string;
        imagePublished: string;
        imageDraft: string;
        cancel: string;
        confirm: string;
        operationFailed: string;
    };
};

export default function BatchPublishDialog({ open, onClose, lang, ids, onSuccess, labels }: Props) {
    const [value, setValue] = useState<"published" | "draft">("published");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (!open) return null;

    function handleClose() {
        if (submitting) return;
        setError("");
        onClose();
    }

    async function handleConfirm() {
        setError("");
        setSubmitting(true);
        try {
            const res = await fetch(`/${lang}/console/api/images/batch`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids, isPublished: value === "published" }),
            });

            if (!res.ok) {
                setError(labels.operationFailed);
                return;
            }

            setError("");
            onClose();
            onSuccess();
        } catch {
            setError(labels.operationFailed);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.title}</h2>
                {error && (
                    <div className="p-3 mb-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                        {error}
                    </div>
                )}
                <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                            type="radio"
                            name="batch-publish-status"
                            checked={value === "published"}
                            onChange={() => setValue("published")}
                            className="w-4 h-4 accent-blue-600"
                        />
                        {labels.imagePublished}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                            type="radio"
                            name="batch-publish-status"
                            checked={value === "draft"}
                            onChange={() => setValue("draft")}
                            className="w-4 h-4 accent-blue-600"
                        />
                        {labels.imageDraft}
                    </label>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        {labels.cancel}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting ? "…" : labels.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
}
