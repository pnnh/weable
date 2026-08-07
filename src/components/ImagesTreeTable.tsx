"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const TREE_INDENT_STEP_PX = 20;
const TOGGLE_CELL_WIDTH_CLASS = "w-10";
const TOGGLE_SLOT_SIZE_CLASS = "w-5 h-5";
const ITEM_ICON_SIZE_CLASS = "w-8 h-8";
const CHECKBOX_CELL_WIDTH_CLASS = "w-8";

// 文件大小人类可读展示：<1MB 显示 KB，否则显示 MB（research.md R8）
function formatSize(bytes: number): string {
    const mb = 1024 * 1024;
    if (bytes < mb) {
        const kb = bytes / 1024;
        return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
    }
    const value = bytes / mb;
    return `${value >= 100 ? Math.round(value) : value.toFixed(1)} MB`;
}

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
    channelName?: string | null;
    isPublished: boolean;
    createdAt: number;
    updatedAt: number;
};

type ChildState = "idle" | "loading" | "loaded" | "error";

type Props = {
    initialItems: ImageEntry[];
    lang: string;
    depth?: number;
    // 受控选择：仅图片行可被选择，目录行不可选
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    labels: {
        imagePublished: string;
        imageDraft: string;
        updated: string;
        selectAllImages: string;
        imageChannel: string;
        fileSize: string;
    };
};

type SelectionContext = {
    selectedSet: Set<string>;
    onToggleSelect: (id: string) => void;
    registerVisible: (id: string) => void;
    unregisterVisible: (id: string) => void;
};

function TreeRow({
    item,
    lang,
    depth,
    labels,
    selection,
}: {
    item: ImageEntry;
    lang: string;
    depth: number;
    labels: Props["labels"];
    selection: SelectionContext;
}) {
    const isDirectory = item.mimeType === "directory";
    const [expanded, setExpanded] = useState(false);
    const [childState, setChildState] = useState<ChildState>("idle");
    const [children, setChildren] = useState<ImageEntry[]>([]);

    // 上报当前可见的图片 id（展开/收起子目录时随行挂载/卸载自动变化）
    useEffect(() => {
        if (isDirectory) return;
        selection.registerVisible(item.id);
        return () => selection.unregisterVisible(item.id);
    }, [item.id, isDirectory]);

    async function handleToggle() {
        if (!isDirectory) return;
        if (!expanded && childState === "idle") {
            setChildState("loading");
            try {
                const res = await fetch(`/${lang}/console/api/images?parentId=${encodeURIComponent(item.id)}`);
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

    const indent = depth * TREE_INDENT_STEP_PX;
    const shiftStyle = indent > 0 ? { transform: `translateX(${indent}px)` } : undefined;

    return (
        <>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
                {/* select checkbox cell — directories are not selectable */}
                <td className={`py-3 ${CHECKBOX_CELL_WIDTH_CLASS}`}>
                    {!isDirectory && (
                        <input
                            type="checkbox"
                            checked={selection.selectedSet.has(item.id)}
                            onChange={() => selection.onToggleSelect(item.id)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                    )}
                </td>
                {/* expand toggle + thumbnail/icon cell */}
                <td className={`py-3 pr-2 ${TOGGLE_CELL_WIDTH_CLASS}`}>
                    <div style={shiftStyle}>
                        {isDirectory ? (
                            <button
                                type="button"
                                onClick={handleToggle}
                                className={`${TOGGLE_SLOT_SIZE_CLASS} flex items-center justify-center text-gray-400 hover:text-gray-700 rounded`}
                                aria-label={expanded ? "collapse" : "expand"}
                            >
                                {childState === "loading" ? (
                                    <span className="text-xs">…</span>
                                ) : (
                                    <span className="text-xs">{expanded ? "▼" : "▶"}</span>
                                )}
                            </button>
                        ) : (
                            <span className={`${TOGGLE_SLOT_SIZE_CLASS} block`} />
                        )}
                    </div>
                </td>
                {/* icon + title */}
                <td className="py-3 pr-4">
                    <div className="flex items-center gap-3 min-w-0" style={shiftStyle}>
                        {isDirectory ? (
                            <div className={`${ITEM_ICON_SIZE_CLASS} shrink-0 rounded bg-yellow-50 border border-yellow-200 flex items-center justify-center text-base`}>
                                📁
                            </div>
                        ) : (
                            <div className={`${ITEM_ICON_SIZE_CLASS} shrink-0 rounded bg-gray-100 overflow-hidden`}>
                                <img
                                    src={`/${lang}/console/api/images/${item.id}/file`}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        {isDirectory ? (
                            <Link
                                href={`/${lang}/console/images?parentId=${encodeURIComponent(item.id)}`}
                                className="text-blue-600 hover:underline font-medium truncate"
                            >
                                {item.title}
                            </Link>
                        ) : (
                            <Link
                                href={`/${lang}/console/images/${item.id}`}
                                className="text-blue-600 hover:underline font-medium truncate"
                            >
                                {item.title}
                            </Link>
                        )}
                    </div>
                </td>
                {/* status */}
                <td className="py-3 pr-4">
                    {!isDirectory && (
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.isPublished
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
                {/* channel — directories have no channel affiliation */}
                <td className="py-3 pr-4 text-sm text-gray-600">
                    {!isDirectory && item.channelName ? item.channelName : null}
                </td>
                {/* size — directories have no file size semantics */}
                <td className="py-3 pr-4 text-sm text-gray-600 whitespace-nowrap">
                    {!isDirectory ? formatSize(item.size) : null}
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
                            selection={selection}
                        />
                    ))}
                    {children.length === 0 && (
                        <tr className="border-b border-gray-100">
                            <td className={`py-2 ${CHECKBOX_CELL_WIDTH_CLASS}`} />
                            <td className={`py-2 pr-2 ${TOGGLE_CELL_WIDTH_CLASS}`}>
                                <span className={`${TOGGLE_SLOT_SIZE_CLASS} block`} />
                            </td>
                            <td colSpan={5} className="py-2 text-gray-400 text-sm italic" style={{ paddingLeft: `${indent + TREE_INDENT_STEP_PX}px` }}>
                                —
                            </td>
                        </tr>
                    )}
                </>
            )}
            {isDirectory && expanded && childState === "error" && (
                <tr className="border-b border-gray-100">
                    <td className={`py-2 ${CHECKBOX_CELL_WIDTH_CLASS}`} />
                    <td className={`py-2 pr-2 ${TOGGLE_CELL_WIDTH_CLASS}`}>
                        <span className={`${TOGGLE_SLOT_SIZE_CLASS} block`} />
                    </td>
                    <td colSpan={5} className="py-2 text-red-500 text-sm" style={{ paddingLeft: `${indent + TREE_INDENT_STEP_PX}px` }}>
                        Load failed
                    </td>
                </tr>
            )}
        </>
    );
}

export default function ImagesTreeTable({ initialItems, lang, depth = 0, labels, selectedIds, onSelectionChange }: Props) {
    // 当前可见的图片 id 集合（含已展开目录的子行），供表头全选/半选计算
    const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set());
    const registerVisible = useCallback((id: string) => {
        setVisibleIds((prev) => {
            if (prev.has(id)) return prev;
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);
    const unregisterVisible = useCallback((id: string) => {
        setVisibleIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const selectedSet = new Set(selectedIds);
    const onToggleSelect = useCallback((id: string) => {
        const next = new Set(selectedSet);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange([...next]);
    }, [selectedIds, onSelectionChange]);

    const allSelected = visibleIds.size > 0 && [...visibleIds].every((id) => selectedSet.has(id));
    const someSelected = [...visibleIds].some((id) => selectedSet.has(id));

    const headerRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (headerRef.current) headerRef.current.indeterminate = someSelected && !allSelected;
    }, [someSelected, allSelected]);

    function handleHeaderToggle() {
        if (allSelected) {
            onSelectionChange(selectedIds.filter((id) => !visibleIds.has(id)));
        } else {
            const merged = new Set(selectedIds);
            visibleIds.forEach((id) => merged.add(id));
            onSelectionChange([...merged]);
        }
    }

    if (initialItems.length === 0) return null;

    const selection: SelectionContext = { selectedSet, onToggleSelect, registerVisible, unregisterVisible };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                    <tr>
                        <th className={`py-3 ${CHECKBOX_CELL_WIDTH_CLASS}`}>
                            <input
                                ref={headerRef}
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleHeaderToggle}
                                disabled={visibleIds.size === 0}
                                aria-label={labels.selectAllImages}
                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                            />
                        </th>
                        <th className="py-3" />
                        <th className="py-3 pr-4">Title</th>
                        <th className="py-3 pr-4">Status</th>
                        <th className="py-3 pr-4">{labels.imageChannel}</th>
                        <th className="py-3 pr-4">{labels.fileSize}</th>
                        <th className="py-3">{labels.updated}</th>
                    </tr>
                </thead>
                <tbody>
                    {initialItems.map((item) => (
                        <TreeRow key={item.id} item={item} lang={lang} depth={depth} labels={labels} selection={selection} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
