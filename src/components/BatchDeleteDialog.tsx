"use client";

import { useState } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
    lang: string;
    ids: string[];
    count: number;
    onSuccess: () => void;
    labels: {
        title: string;
        confirmBody: string;
        cancel: string;
        confirm: string;
        operationFailed: string;
    };
};

export default function BatchDeleteDialog({ open, onClose, lang, ids, count, onSuccess, labels }: Props) {
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
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids }),
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

    // {count} 占位符替换
    const bodyText = labels.confirmBody.replace("{count}", String(count));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.title}</h2>
                {error && (
                    <div className="p-3 mb-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                        {error}
                    </div>
                )}
                <p className="text-sm text-gray-700 mb-6">{bodyText}</p>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                        {labels.cancel}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                        {submitting ? "…" : labels.confirm}
                    </button>
                </div>
            </div>
        </div>
    );
}
