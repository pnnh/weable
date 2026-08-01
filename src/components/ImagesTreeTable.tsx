"use client";

import { useState } from "react";
import Link from "next/link";

export type ImageEntry = {
    id: string;
    title: string;
    mimeType: string;
    description: string;
    size: number;
    width?: number | null;
    height?: number | null;
    parentId?: string | null;
    channelId?: string | null;
    isPublished: boolean;
    createdAt: number;
    updatedAt: number;
};

type ChildState = "idle" | "loading" | "loaded" | "error";

type Props = {
    initialItems: ImageEntry[];
    lang: string;
    depth?: number;
    labels: {
        imagePublished: string;
        imageDraft: string;
        updated: string;
    };
};

function TreeRow({
    item,
    lang,
    depth,
    labels,
}: {
    item: ImageEntry;
    lang: string;
    depth: number;
    labels: Props["labels"];
}) {
    const isDirectory = item.mimeType === "directory";
    const [expanded, setExpanded] = useState(false);
    const [childState, setChildState] = useState<ChildState>("idle");
    const [children, setChildren] = useState<ImageEntry[]>([]);

    async function handleToggle() {
        if (!isDirectory) return;
        if (!expanded && childState === "idle") {
            setChildState("loading");
            try {
                const res = await fetch(`/api/images?parentId=${encodeURIComponent(item.id)}`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                setChildren(data.items ?? []);
                setChildState("loaded");
            } catch {
                setChildState("error");
                return;
            }
        }
        setExpanded((prev) => !prev);
    }

    const indent = depth * 20;

    return (
        <>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
                {/* expand toggle + thumbnail/icon cell */}
                <td className="py-3 pr-2 w-10" style={{ paddingLeft: `${indent + 8}px` }}>
                    {isDirectory ? (
                        <button
                            type="button"
                            onClick={handleToggle}
                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded"
                            aria-label={expanded ? "collapse" : "expand"}
                        >
                            {childState === "loading" ? (
                                <span className="text-xs">…</span>
                            ) : (
                                <span className="text-xs">{expanded ? "▼" : "▶"}</span>
                            )}
                        </button>
                    ) : (
                        <span className="w-6 h-6 block" />
                    )}
                </td>
                {/* thumbnail or folder icon */}
                <td className="py-3 pr-4 w-12">
                    {isDirectory ? (
                        <div className="w-10 h-10 rounded bg-yellow-50 border border-yellow-200 flex items-center justify-center text-xl">
                            📁
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden">
                            <img
                                src={`/api/images/${item.id}/file`}
                                alt={item.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                </td>
                {/* title */}
                <td className="py-3 pr-4">
                    {isDirectory ? (
                        <Link
                            href={`/${lang}/console/images?parentId=${encodeURIComponent(item.id)}`}
                            className="text-blue-600 hover:underline font-medium"
                        >
                            {item.title}
                        </Link>
                    ) : (
                        <Link
                            href={`/${lang}/console/images/${item.id}`}
                            className="text-blue-600 hover:underline font-medium"
                        >
                            {item.title}
                        </Link>
                    )}
                </td>
                {/* status */}
                <td className="py-3 pr-4">
                    {!isDirectory && (
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                item.isPublished
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            {item.isPublished ? labels.imagePublished : labels.imageDraft}
                        </span>
                    )}
                    {isDirectory && (
                        <span className="text-xs text-gray-400">—</span>
                    )}
                </td>
                {/* updated */}
                <td className="py-3 text-gray-500 text-sm">
                    {new Date(item.updatedAt).toLocaleDateString(lang)}
                </td>
            </tr>
            {/* inline children */}
            {isDirectory && expanded && childState === "loaded" && (
                <>
                    {children.map((child) => (
                        <TreeRow
                            key={child.id}
                            item={child}
                            lang={lang}
                            depth={depth + 1}
                            labels={labels}
                        />
                    ))}
                    {children.length === 0 && (
                        <tr className="border-b border-gray-100">
                            <td colSpan={5} className="py-2 text-gray-400 text-sm italic" style={{ paddingLeft: `${indent + 52}px` }}>
                                —
                            </td>
                        </tr>
                    )}
                </>
            )}
            {isDirectory && expanded && childState === "error" && (
                <tr className="border-b border-gray-100">
                    <td colSpan={5} className="py-2 text-red-500 text-sm" style={{ paddingLeft: `${indent + 52}px` }}>
                        Load failed
                    </td>
                </tr>
            )}
        </>
    );
}

export default function ImagesTreeTable({ initialItems, lang, depth = 0, labels }: Props) {
    if (initialItems.length === 0) return null;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                        <th className="py-3" />
                        <th className="py-3 pr-4" />
                        <th className="py-3 pr-4">Title</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3">{labels.updated}</th>
                    </tr>
                </thead>
                <tbody>
                    {initialItems.map((item) => (
                        <TreeRow key={item.id} item={item} lang={lang} depth={depth} labels={labels} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
