"use client";

import { useEffect, useRef, useState } from "react";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FAIL_COUNT = 3;
const BATCH_SIZE = 3;

export type QueueEntryStatus =
    | "pending"
    | "uploading"
    | "success"
    | "failed"
    | "oversized"
    | "needs_file";

export type QueueEntry = {
    name: string;
    size: number;
    lastModified: number;
    status: QueueEntryStatus;
    failCount: number;
    lastError: string | null;
    selected: boolean;
    parentId: string | null;
    // File 对象仅在内存中持有，不序列化到 Session Storage
    file: File | null;
};

type StoredEntry = Omit<QueueEntry, "file">;

type Props = {
    lang: string;
    parentId: string | null;
    labels: {
        uploadQueue: string;
        uploadQueueEmpty: string;
        uploadQueueStart: string;
        uploadQueueUploading: string;
        uploadQueueStatusPending: string;
        uploadQueueStatusSuccess: string;
        uploadQueueStatusFailed: string;
        uploadQueueStatusOversized: string;
        uploadQueueStatusNeedsFile: string;
        uploadQueueSkippedDupes: string;
        uploadQueueModified: string;
        uploadQueueAddFiles: string;
        cancel: string;
    };
};

// Session Storage key（按 parentId 隔离）
function storageKey(parentId: string | null): string {
    return `weable_upload_queue_${parentId ?? "root"}`;
}

// 从 Session Storage 读取并恢复队列状态
function loadFromStorage(parentId: string | null): QueueEntry[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = sessionStorage.getItem(storageKey(parentId));
        if (!raw) return [];
        const stored: StoredEntry[] = JSON.parse(raw);
        return stored.map((e) => {
            let status = e.status;
            // 刷新后无 File 对象：pending/failed(failCount<MAX) → needs_file
            if (status === "pending" || (status === "failed" && e.failCount < MAX_FAIL_COUNT)) {
                status = "needs_file";
            }
            return { ...e, status, file: null };
        });
    } catch {
        return [];
    }
}

// 将当前队列状态写入 Session Storage（uploading 降级为 pending）
function saveToStorage(parentId: string | null, entries: QueueEntry[]): void {
    if (typeof window === "undefined") return;
    try {
        const stored: StoredEntry[] = entries.map(({ file: _file, ...rest }) => ({
            ...rest,
            status: rest.status === "uploading" ? "pending" : rest.status,
        }));
        sessionStorage.setItem(storageKey(parentId), JSON.stringify(stored));
    } catch {
        // Session Storage 配额满时静默忽略
    }
}

// 是否禁用复选框
export function isEntryDisabled(entry: QueueEntry): boolean {
    return (
        entry.status === "success" ||
        entry.status === "oversized" ||
        (entry.status === "failed" && entry.failCount >= MAX_FAIL_COUNT) ||
        entry.status === "needs_file"
    );
}

// 文件大小人类可读展示
function formatSize(bytes: number): string {
    const mb = 1024 * 1024;
    if (bytes < mb) {
        const kb = bytes / 1024;
        return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
    }
    const value = bytes / mb;
    return `${value >= 100 ? Math.round(value) : value.toFixed(1)} MB`;
}

// 去重：返回新增条目列表和跳过数量
export function deduplicateFiles(
    newFiles: File[],
    existingEntries: QueueEntry[],
): { toAdd: File[]; skipCount: number } {
    const existingNames = new Set(existingEntries.map((e) => e.name));
    const toAdd: File[] = [];
    let skipCount = 0;
    for (const f of newFiles) {
        if (existingNames.has(f.name)) {
            skipCount++;
        } else {
            toAdd.push(f);
            existingNames.add(f.name); // 防止本次选择内部重复
        }
    }
    return { toAdd, skipCount };
}

// 将选中可上传条目切分为每批 ≤BATCH_SIZE 的批次
export function buildBatches(entries: QueueEntry[]): QueueEntry[][] {
    const uploadable = entries.filter(
        (e) =>
            e.selected &&
            e.status !== "success" &&
            e.status !== "oversized" &&
            e.status !== "needs_file" &&
            !(e.status === "failed" && e.failCount >= MAX_FAIL_COUNT) &&
            e.file != null,
    );
    const batches: QueueEntry[][] = [];
    for (let i = 0; i < uploadable.length; i += BATCH_SIZE) {
        batches.push(uploadable.slice(i, i + BATCH_SIZE));
    }
    return batches;
}

export default function UploadQueue({ lang, parentId, labels }: Props) {
    const [entries, setEntries] = useState<QueueEntry[]>(() => loadFromStorage(parentId));
    const [uploading, setUploading] = useState(false);
    const [skipCount, setSkipCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // entries 变化时同步写入 Session Storage
    useEffect(() => {
        saveToStorage(parentId, entries);
    }, [entries, parentId]);

    // 清除 skipCount 定时器
    useEffect(() => {
        return () => {
            if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
        };
    }, []);

    // 文件选择处理
    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        // 去重
        const { toAdd, skipCount: skipped } = deduplicateFiles(files, entries);

        // 显示跳过提示（3 秒后自动消失）
        if (skipped > 0) {
            setSkipCount(skipped);
            if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
            skipTimerRef.current = setTimeout(() => setSkipCount(0), 3000);
        }

        if (toAdd.length === 0) {
            // 重置 input，允许再次选择相同文件
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setEntries((prev) => {
            const next = [...prev];
            for (const file of toAdd) {
                // 检查是否有 needs_file 状态的同名条目，若有则关联 File 对象
                const existingIdx = next.findIndex((e) => e.name === file.name && e.status === "needs_file");
                if (existingIdx >= 0) {
                    const existing = next[existingIdx];
                    next[existingIdx] = {
                        ...existing,
                        file,
                        status: existing.failCount >= MAX_FAIL_COUNT ? "failed" : existing.failCount > 0 ? "failed" : "pending",
                        selected: existing.failCount < MAX_FAIL_COUNT,
                    };
                } else {
                    const isOversized = file.size > MAX_FILE_SIZE_BYTES;
                    next.push({
                        name: file.name,
                        size: file.size,
                        lastModified: file.lastModified,
                        status: isOversized ? "oversized" : "pending",
                        failCount: 0,
                        lastError: null,
                        selected: !isOversized,
                        parentId,
                        file,
                    });
                }
            }
            return next;
        });

        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    // 更新单个条目状态（不可变更新）
    function updateEntry(name: string, patch: Partial<QueueEntry>) {
        setEntries((prev) =>
            prev.map((e) => (e.name === name ? { ...e, ...patch } : e)),
        );
    }

    // 上传单个文件
    async function uploadOne(entry: QueueEntry): Promise<void> {
        updateEntry(entry.name, { status: "uploading" });

        const formData = new FormData();
        formData.append("file", entry.file!);
        if (entry.parentId) formData.append("parentId", entry.parentId);

        try {
            const res = await fetch(`/${lang}/console/api/upload`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                updateEntry(entry.name, { status: "success", selected: false });
            } else {
                const data = await res.json().catch(() => ({}));
                const errorText = `HTTP ${res.status}: ${(data as { error?: string }).error ?? "Unknown error"}`;
                const newFailCount = entry.failCount + 1;
                updateEntry(entry.name, {
                    status: "failed",
                    failCount: newFailCount,
                    lastError: errorText,
                });
            }
        } catch (err) {
            const errorText = err instanceof Error ? err.message : "Network error";
            const newFailCount = entry.failCount + 1;
            updateEntry(entry.name, {
                status: "failed",
                failCount: newFailCount,
                lastError: errorText,
            });
        }
    }

    // 开始上传（串行批次，批内并发）
    async function startUpload() {
        if (uploading) return;
        const batches = buildBatches(entries);
        if (batches.length === 0) return;

        setUploading(true);
        try {
            for (const batch of batches) {
                await Promise.allSettled(batch.map((e) => uploadOne(e)));
            }
        } finally {
            setUploading(false);
        }
    }

    // 全选/全取消逻辑
    const selectableEntries = entries.filter((e) => !isEntryDisabled(e));
    const allSelected = selectableEntries.length > 0 && selectableEntries.every((e) => e.selected);
    const someSelected = selectableEntries.some((e) => e.selected);
    const hasUploadable = entries.some(
        (e) => e.selected && !isEntryDisabled(e) && e.file != null,
    );

    function handleHeaderToggle() {
        const nextSelected = !allSelected;
        setEntries((prev) =>
            prev.map((e) => (isEntryDisabled(e) ? e : { ...e, selected: nextSelected })),
        );
    }

    function handleRowToggle(name: string) {
        setEntries((prev) =>
            prev.map((e) => (e.name === name && !isEntryDisabled(e) ? { ...e, selected: !e.selected } : e)),
        );
    }

    // 状态标签渲染
    function renderStatus(entry: QueueEntry) {
        switch (entry.status) {
            case "success":
                return (
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        {labels.uploadQueueStatusSuccess}
                    </span>
                );
            case "failed": {
                const text = labels.uploadQueueStatusFailed.replace("{count}", String(entry.failCount));
                return (
                    <span
                        className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full cursor-help"
                        title={entry.lastError ?? undefined}
                    >
                        {text}
                    </span>
                );
            }
            case "oversized":
                return (
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        {labels.uploadQueueStatusOversized}
                    </span>
                );
            case "needs_file":
                return (
                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                        {labels.uploadQueueStatusNeedsFile}
                    </span>
                );
            case "uploading":
                return (
                    <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {labels.uploadQueueUploading}
                    </span>
                );
            default:
                return (
                    <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                        {labels.uploadQueueStatusPending}
                    </span>
                );
        }
    }

    return (
        <div className="space-y-4">
            {/* 工具栏 */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    {labels.uploadQueueAddFiles}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    disabled={uploading || !hasUploadable}
                    onClick={startUpload}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploading ? labels.uploadQueueUploading : labels.uploadQueueStart}
                </button>
            </div>

            {/* 跳过重复文件提示 */}
            {skipCount > 0 && (
                <div className="px-3 py-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-md">
                    {labels.uploadQueueSkippedDupes.replace("{count}", String(skipCount))}
                </div>
            )}

            {/* 队列为空时的提示 */}
            {entries.length === 0 ? (
                <p className="text-gray-500">{labels.uploadQueueEmpty}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                            <tr>
                                <th className="py-3 w-8">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        ref={(el) => {
                                            if (el) el.indeterminate = someSelected && !allSelected;
                                        }}
                                        onChange={handleHeaderToggle}
                                        disabled={selectableEntries.length === 0}
                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                    />
                                </th>
                                <th className="py-3 pr-4">文件名</th>
                                <th className="py-3 pr-4">大小</th>
                                <th className="py-3 pr-4">{labels.uploadQueueModified}</th>
                                <th className="py-3">状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr key={entry.name} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 w-8">
                                        <input
                                            type="checkbox"
                                            checked={entry.selected}
                                            disabled={isEntryDisabled(entry)}
                                            onChange={() => handleRowToggle(entry.name)}
                                            className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                    </td>
                                    <td className="py-3 pr-4 font-medium text-gray-900 truncate max-w-xs">
                                        {entry.name}
                                    </td>
                                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                                        {formatSize(entry.size)}
                                    </td>
                                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                                        {entry.lastModified
                                            ? new Date(entry.lastModified).toLocaleDateString(lang)
                                            : "—"}
                                    </td>
                                    <td className="py-3">{renderStatus(entry)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
