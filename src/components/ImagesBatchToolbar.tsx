"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagesTreeTable, { type ImageEntry } from "./ImagesTreeTable";
import ImagesPagination from "./ImagesPagination";
import BatchPublishDialog from "./BatchPublishDialog";
import BatchChannelDialog from "./BatchChannelDialog";

export type ChannelOption = {
    id: string;
    name: string;
};

const PAGE_SIZE = 20;

type Props = {
    lang: string;
    parentId: string | null;
    initialItems: ImageEntry[];
    initialQ: string;
    initialPage: number;
    initialTotal: number;
    channels: ChannelOption[];
    labels: {
        batchSetPublishStatus: string;
        batchSetChannel: string;
        imagePublished: string;
        imageDraft: string;
        updated: string;
        selectAllImages: string;
        cancel: string;
        batchConfirm: string;
        batchOperationFailed: string;
        imageChannel: string;
        noChannel: string;
        searchPlaceholder: string;
        searchButton: string;
        noSearchResults: string;
        prevPage: string;
        nextPage: string;
        fileSize: string;
    };
};

// 批量操作容器：持有选择状态与列表数据源（搜索/翻页/就地刷新均就地更新，不整页刷新）
export default function ImagesBatchToolbar({
    lang,
    parentId,
    initialItems,
    initialQ,
    initialPage,
    initialTotal,
    channels,
    labels,
}: Props) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [channelDialogOpen, setChannelDialogOpen] = useState(false);
    // 列表数据源与视图状态（URL 为唯一真相，此处为客户端镜像）
    const [items, setItems] = useState<ImageEntry[]>(initialItems);
    const [q, setQ] = useState(initialQ);
    const [page, setPage] = useState(initialPage);
    const [total, setTotal] = useState(initialTotal);
    const [searchInput, setSearchInput] = useState(initialQ);
    const hasSelection = selectedIds.length > 0;

    // 列表接口地址（带分页开关 pageSize）
    function buildListUrl(nextQ: string, nextPage: number): string {
        const params = new URLSearchParams();
        if (parentId) params.set("parentId", parentId);
        if (nextQ) params.set("q", nextQ);
        if (nextPage > 1) params.set("page", String(nextPage));
        params.set("pageSize", String(PAGE_SIZE));
        return `/${lang}/console/api/images?${params.toString()}`;
    }

    // 页面地址（供 router.replace 同步视图状态，可分享还原）
    function buildViewUrl(nextQ: string, nextPage: number): string {
        const params = new URLSearchParams();
        if (parentId) params.set("parentId", parentId);
        if (nextQ) params.set("q", nextQ);
        if (nextPage > 1) params.set("page", String(nextPage));
        const qs = params.toString();
        return qs ? `/${lang}/console/images?${qs}` : `/${lang}/console/images`;
    }

    // 拉取指定视图并就地更新；失败时保持当前数据与状态不变
    async function fetchView(nextQ: string, nextPage: number): Promise<boolean> {
        try {
            const res = await fetch(buildListUrl(nextQ, nextPage));
            if (!res.ok) throw new Error();
            const data = await res.json();
            setItems(data.items ?? []);
            setTotal(typeof data.total === "number" ? data.total : 0);
            setQ(nextQ);
            setPage(nextPage);
            return true;
        } catch {
            return false;
        }
    }

    // 搜索提交：重置 page=1（FR-003），清空关键词恢复全量视图
    async function handleSearchSubmit() {
        const nextQ = searchInput.trim();
        router.replace(buildViewUrl(nextQ, 1));
        await fetchView(nextQ, 1);
    }

    // 翻页：保留 parentId 与 q，仅改 page（FR-008）
    async function handlePageChange(nextPage: number) {
        router.replace(buildViewUrl(q, nextPage));
        await fetchView(q, nextPage);
    }

    // 批量成功后就地刷新当前视图（不整页刷新，保留已展开目录状态，FR-014）
    async function handleBatchSuccess() {
        setSelectedIds([]);
        await fetchView(q, page);
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <button
                    type="button"
                    disabled={!hasSelection}
                    onClick={() => setPublishDialogOpen(true)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {labels.batchSetPublishStatus}
                </button>
                <button
                    type="button"
                    disabled={!hasSelection}
                    onClick={() => setChannelDialogOpen(true)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {labels.batchSetChannel}
                </button>
                {/* 关键词搜索：与批量按钮同行；提交即重置到第 1 页 */}
                <form
                    className="flex items-center gap-2 ml-auto"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSearchSubmit();
                    }}
                >
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder={labels.searchPlaceholder}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        {labels.searchButton}
                    </button>
                </form>
            </div>

            {items.length === 0 && q ? (
                <p className="text-gray-500">{labels.noSearchResults}</p>
            ) : (
                <ImagesTreeTable
                    initialItems={items}
                    lang={lang}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    labels={{
                        imagePublished: labels.imagePublished,
                        imageDraft: labels.imageDraft,
                        updated: labels.updated,
                        selectAllImages: labels.selectAllImages,
                        imageChannel: labels.imageChannel,
                        fileSize: labels.fileSize,
                    }}
                />
            )}

            <ImagesPagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={handlePageChange}
                labels={{ prevPage: labels.prevPage, nextPage: labels.nextPage }}
            />

            <BatchPublishDialog
                open={publishDialogOpen}
                onClose={() => setPublishDialogOpen(false)}
                lang={lang}
                ids={selectedIds}
                onSuccess={handleBatchSuccess}
                labels={{
                    title: labels.batchSetPublishStatus,
                    imagePublished: labels.imagePublished,
                    imageDraft: labels.imageDraft,
                    cancel: labels.cancel,
                    confirm: labels.batchConfirm,
                    operationFailed: labels.batchOperationFailed,
                }}
            />

            <BatchChannelDialog
                open={channelDialogOpen}
                onClose={() => setChannelDialogOpen(false)}
                lang={lang}
                ids={selectedIds}
                channels={channels}
                onSuccess={handleBatchSuccess}
                labels={{
                    title: labels.batchSetChannel,
                    imageChannel: labels.imageChannel,
                    noChannel: labels.noChannel,
                    cancel: labels.cancel,
                    confirm: labels.batchConfirm,
                    operationFailed: labels.batchOperationFailed,
                }}
            />
        </div>
    );
}
