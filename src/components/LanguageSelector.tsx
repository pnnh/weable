"use client";

import { useRouter } from "next/navigation";
import { supportedLanguages } from "@/lib/language";
import type { LangKey } from "@/lib/language";

type Props = {
    currentLang: LangKey;
    /** Path segment after the lang prefix. E.g. "" for home, "games/spacewar/" for detail page */
    pathSuffix?: string;
};

export default function LanguageSelector({ currentLang, pathSuffix = "" }: Props) {
    const router = useRouter();

    function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        router.push(`/${e.target.value}/${pathSuffix}`);
    }

    return (
        <select
            value={currentLang}
            onChange={handleChange}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
            {supportedLanguages.map((l) => (
                <option key={l.key} value={l.key}>
                    {l.name}
                </option>
            ))}
        </select>
    );
}
