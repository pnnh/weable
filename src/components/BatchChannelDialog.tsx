"use client";

import { useState } from "react";
import type { ChannelOption } from "./ImagesBatchToolbar";

type Props = {
    open: boolean;
    onClose: () => void;
    lang: string;
    ids: string[];
    channels: ChannelOption[];
    onSuccess: () => void;
    labels: {
        title: string;
        imageChannel: string;
        noChannel: string;
        cancel: string;
        confirm: string;
        operationFailed: string;
    };
};

export default function BatchChannelDialog({ open, onClose, lang, ids, channels, onSuccess, labels }: Props) {
    const [channelId, setChannelId] = useState("");
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
                // 空字符串表示"空频道"，后端以 channelId: null 清空
                body: JSON.stringify({ ids, channelId: channelId === "" ? null : channelId }),
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
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {labels.imageChannel}
                    </label>
                    <select
                        value={channelId}
                        onChange={(e) => setChannelId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">{labels.noChannel}</option>
                        {channels.map((channel) => (
                            <option key={channel.id} value={channel.id}>
                                {channel.name}
                            </option>
                        ))}
                    </select>
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
