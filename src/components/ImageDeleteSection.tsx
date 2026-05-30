"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
    imageId: string;
    redirectTo: string;
    labels: {
        deleteImage: string;
        deleteImageConfirm: string;
    };
}

export default function ImageDeleteSection({ imageId, redirectTo, labels }: Props) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        if (!confirm(labels.deleteImageConfirm)) return;
        setDeleting(true);
        const res = await fetch(`/api/images/${imageId}`, { method: "DELETE" });
        if (res.ok) {
            router.push(redirectTo);
        } else {
            setDeleting(false);
            alert("Failed to delete image");
        }
    }

    return (
        <div className="mt-10 pt-6 border-t border-gray-200">
            <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
            >
                {labels.deleteImage}
            </button>
        </div>
    );
}
