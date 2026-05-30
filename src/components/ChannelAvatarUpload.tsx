"use client";

import { useState } from "react";

interface Props {
    channelId: string;
    channelName: string;
    labels: {
        avatar: string;
        uploadAvatar: string;
        avatarHint: string;
    };
}

export default function ChannelAvatarUpload({ channelId, channelName, labels }: Props) {
    const [uploading, setUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(`/api/channel/avatar/${channelId}?t=${Date.now()}`);

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/channel/avatar/${channelId}`, {
            method: "POST",
            body: formData,
        });

        if (res.ok) {
            setAvatarUrl(`/api/channel/avatar/${channelId}?t=${Date.now()}`);
        }
        setUploading(false);
    }

    const firstChar = channelName.charAt(0).toUpperCase();

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">{labels.avatar}</label>
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    <img
                        src={avatarUrl}
                        alt={channelName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                        }}
                    />
                    <span className="hidden text-2xl font-bold text-gray-500">{firstChar}</span>
                </div>
                <div>
                    <label className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 cursor-pointer">
                        {uploading ? "..." : labels.uploadAvatar}
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">{labels.avatarHint}</p>
                </div>
            </div>
        </div>
    );
}
