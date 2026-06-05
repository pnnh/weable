"use client";

import { useState } from "react";

interface Props {
    userId: string;
    name: string;
    email: string;
    nickname: string | null;
    bio: string | null;
    labels: {
        avatar: string;
        uploadAvatar: string;
        nickname: string;
        username: string;
        email: string;
        bio: string;
        saveProfile: string;
        profileSaved: string;
        avatarHint: string;
    };
}

export default function UserProfileClient({ userId, name, email, nickname, bio, labels }: Props) {
    const [nick, setNick] = useState(nickname ?? "");
    const [bioVal, setBioVal] = useState(bio ?? "");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(`/api/user/avatar/${userId}?t=${Date.now()}`);

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/user/avatar", { method: "POST", body: formData });
        if (res.ok) {
            setAvatarUrl(`/api/user/avatar/${userId}?t=${Date.now()}`);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setSaved(false);
        await fetch("/api/user/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: nick || null, bio: bioVal || null }),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    return (
        <div className="space-y-8">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{labels.avatar}</label>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden">
                        <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <label className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 cursor-pointer">
                        {labels.uploadAvatar}
                        <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">{labels.avatarHint}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{labels.username}</label>
                    <input type="text" value={name} disabled className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{labels.email}</label>
                    <input type="text" value={email} disabled className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-gray-50 text-gray-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{labels.nickname}</label>
                    <input type="text" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={50} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{labels.bio}</label>
                    <textarea value={bioVal} onChange={(e) => setBioVal(e.target.value)} rows={4} maxLength={500} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-center gap-3">
                    <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {labels.saveProfile}
                    </button>
                    {saved && <span className="text-sm text-green-600">{labels.profileSaved}</span>}
                </div>
            </form>
        </div>
    );
}
