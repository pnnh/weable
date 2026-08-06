"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
    lang: string;
    parentId?: string | null;
    labels: {
        newDirectory: string;
        directoryName: string;
        directoryNamePlaceholder: string;
        directoryDescriptionPlaceholder: string;
        createDirectory: string;
        cancel: string;
        nameRequired: string;
        duplicateEntryName: string;
        invalidTitleChars: string;
    };
};

export default function CreateDirectoryDialog({ lang, parentId, labels }: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    function handleOpen() {
        setTitle("");
        setDescription("");
        setError("");
        setOpen(true);
    }

    function handleClose() {
        setOpen(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = title.trim();
        if (!trimmed) {
            setError(labels.nameRequired);
            return;
        }

        setError("");
        setSubmitting(true);
        try {
            const res = await fetch(`/${lang}/console/api/directories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: trimmed, description: description.trim(), parentId }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (res.status === 409) {
                    setError(labels.duplicateEntryName);
                } else if (data.error === "title contains invalid characters") {
                    setError(labels.invalidTitleChars);
                } else {
                    setError(data.error ?? "Error");
                }
                return;
            }

            setOpen(false);
            router.refresh();
        } catch {
            setError("Network error");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 border border-gray-300"
            >
                {labels.newDirectory}
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">{labels.newDirectory}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {labels.directoryName}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={labels.directoryNamePlaceholder}
                                    maxLength={200}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={labels.directoryDescriptionPlaceholder}
                                    rows={3}
                                    maxLength={1000}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
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
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting ? "…" : labels.createDirectory}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
