"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImagesTreeTable, { type ImageEntry } from "./ImagesTreeTable";
import BatchPublishDialog from "./BatchPublishDialog";
import BatchChannelDialog from "./BatchChannelDialog";

export type ChannelOption = {
    id: string;
    name: string;
};

type Props = {
    lang: string;
    initialItems: ImageEntry[];
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
    };
};

// 批量操作容器：持有选中状态，渲染工具栏按钮与受控树形表格
export default function ImagesBatchToolbar({ lang, initialItems, channels, labels }: Props) {
    const router = useRouter();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [channelDialogOpen, setChannelDialogOpen] = useState(false);
    const hasSelection = selectedIds.length > 0;

    function handleBatchSuccess() {
        setSelectedIds([]);
        router.refresh();
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
            </div>

            <ImagesTreeTable
                initialItems={initialItems}
                lang={lang}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                labels={{
                    imagePublished: labels.imagePublished,
                    imageDraft: labels.imageDraft,
                    updated: labels.updated,
                    selectAllImages: labels.selectAllImages,
                }}
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
