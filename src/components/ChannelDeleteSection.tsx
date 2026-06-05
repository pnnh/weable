"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
    channelId: string;
    redirectTo: string;
    publishedImageCount: number;
    labels: {
        deleteChannel: string;
        deleteChannelConfirm: string;
        deleteChannelHasImages: string;
    };
}

export default function ChannelDeleteSection({ channelId, redirectTo, publishedImageCount, labels }: Props) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        if (!confirm(labels.deleteChannelConfirm)) return;
        setDeleting(true);
        const res = await fetch(`/api/channels/${channelId}`, { method: "DELETE" });
        if (res.ok) {
            router.push(redirectTo);
        } else {
            setDeleting(false);
            alert("Failed to delete channel");
        }
    }

    if (publishedImageCount > 0) {
        return (
            <div className="mt-10 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">{labels.deleteChannelHasImages}</p>
            </div>
        );
    }

    return (
        <div className="mt-10 pt-6 border-t border-gray-200">
            <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
            >
                {labels.deleteChannel}
            </button>
        </div>
    );
}
