"use client";

import { useState, useRef } from "react";

const MAX_UPLOAD_FILES = 50;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type Props = {
    lang: string;
    parentId?: string | null;
    labels: {
        newImage: string;
        imageTooLarge: string;
        uploadError: string;
        uploadTooManyFiles: string;
        uploadLimitsHint: string;
        uploadingImages: string;
    };
};

export default function ImageUploadForm({ lang, parentId, labels }: Props) {
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const form = formRef.current;
        if (!form) return;

        const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
        const files = Array.from(fileInput?.files ?? []);
        if (files.length === 0) return;

        if (files.length > MAX_UPLOAD_FILES) {
            setError(labels.uploadTooManyFiles);
            return;
        }

        if (files.some((file) => file.size > MAX_FILE_SIZE_BYTES)) {
            setError(labels.imageTooLarge);
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            files.forEach((file) => {
                formData.append("file", file);
            });
            if (parentId) formData.append("parentId", parentId);

            const res = await fetch(`/${lang}/console/api/upload`, { method: "POST", body: formData });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? labels.uploadError);
                return;
            }

            const listUrl = parentId
                ? `/${lang}/console/images?parentId=${encodeURIComponent(parentId)}`
                : `/${lang}/console/images`;
            window.location.href = listUrl;
        } catch {
            setError(labels.uploadError);
        } finally {
            setUploading(false);
        }
    }

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                    {error}
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {labels.newImage}
                </label>
                <input
                    name="file"
                    type="file"
                    multiple
                    accept="image/*"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">{labels.uploadLimitsHint}</p>
            </div>
            <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
                {uploading ? labels.uploadingImages : labels.newImage}
            </button>
        </form>
    );
}
