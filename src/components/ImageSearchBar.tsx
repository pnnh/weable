"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

type Props = {
    lang: string;
    defaultValue: string;
    placeholder: string;
    searchLabel: string;
};

export default function ImageSearchBar({ lang, defaultValue, placeholder, searchLabel }: Props) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const q = inputRef.current?.value.trim() ?? "";
        const url = q ? `/${lang}?q=${encodeURIComponent(q)}` : `/${lang}`;
        router.push(url);
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl">
            <input
                ref={inputRef}
                type="text"
                defaultValue={defaultValue}
                placeholder={placeholder}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
                {searchLabel}
            </button>
        </form>
    );
}
