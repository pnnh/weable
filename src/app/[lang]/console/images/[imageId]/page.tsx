import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";
import ImageDeleteSection from "@/components/ImageDeleteSection";
import ImageUploadForm from "@/components/ImageUploadForm";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ lang: string; imageId: string }>;
    searchParams: Promise<{ parentId?: string }>;
};

export default async function ImageEditorPage({ params, searchParams }: Props) {
    const { lang, imageId } = await params;
    const { parentId } = await searchParams;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    const db = getDb();
    const isNew = imageId === "new";
    const listHref = parentId
        ? `/${lang}/console/images?parentId=${encodeURIComponent(parentId)}`
        : `/${lang}/console/images`;

    // For "new", show upload form; for existing, show edit form
    if (isNew) {
        return (
            <>
                <SiteHeader lang={l} />
                <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h1 className="text-2xl font-bold text-gray-900 mb-8">{t(l, "newImage")}</h1>
                    <ImageUploadForm
                        lang={lang}
                        parentId={parentId ?? null}
                        labels={{
                            newImage: t(l, "newImage"),
                            imageTooLarge: t(l, "imageTooLarge"),
                            uploadError: t(l, "uploadError"),
                            uploadTooManyFiles: t(l, "uploadTooManyFiles"),
                            uploadLimitsHint: t(l, "uploadLimitsHint"),
                            uploadingImages: t(l, "uploadingImages"),
                        }}
                    />
                </main>
                <SiteFooter lang={l} />
            </>
        );
    }

    const existingImage = await db
        .select()
        .from(images)
        .where(and(eq(images.id, imageId), eq(images.userId, user.id)))
        .limit(1)
        .then((rows) => rows[0] ?? null);

    if (!existingImage) notFound();
    if (existingImage.mimeType === "directory") notFound();

    const userChannels = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, user.id));

    async function handleSave(formData: FormData) {
        "use server";

        const db2 = getDb();
        const user2 = await getCurrentUser();
        const title = ((formData.get("title") as string | null) ?? "").trim();
        const description = (formData.get("description") as string | null) ?? "";
        const rawChannelId = (formData.get("channelId") as string | null) ?? "";
        const isPublished = formData.get("isPublished") === "true";
        const now = Date.now();

        if (!title) {
            throw new Error("Title is required");
        }

        const channelId = rawChannelId || null;
        if (channelId) {
            const ownedChannel = await db2
                .select()
                .from(channels)
                .where(and(eq(channels.id, channelId), eq(channels.userId, user2.id)))
                .limit(1)
                .then((rows) => rows[0] ?? null);

            if (!ownedChannel) {
                throw new Error("Channel not found");
            }
        }

        await db2
            .update(images)
            .set({ title, description, channelId, isPublished, updatedAt: now })
            .where(and(eq(images.id, imageId), eq(images.userId, user2.id)));

        redirect(listHref);
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">{t(l, "editImage")}</h1>

                <div className="mb-8">
                    <img
                        src={`/api/images/${imageId}/file`}
                        alt={existingImage.title}
                        className="max-w-full max-h-64 rounded-lg border border-gray-200"
                    />
                </div>

                <form action={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "imageTitle")}</label>
                        <input
                            name="title"
                            type="text"
                            defaultValue={existingImage.title}
                            required
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "imageDescription")}</label>
                        <textarea
                            name="description"
                            rows={8}
                            defaultValue={existingImage.description}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "imageChannel")}</label>
                        <select
                            name="channelId"
                            defaultValue={existingImage.channelId ?? ""}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">{t(l, "noChannel")}</option>
                            {userChannels.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                    {ch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isPublished"
                            name="isPublished"
                            value="true"
                            defaultChecked={existingImage.isPublished}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">{t(l, "publishImage")}</label>
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                            {t(l, "save")}
                        </button>
                        <a href={listHref} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                            {t(l, "cancel")}
                        </a>
                    </div>
                </form>

                <ImageDeleteSection
                    imageId={imageId}
                    redirectTo={listHref}
                    labels={{
                        deleteImage: t(l, "deleteImage"),
                        deleteImageConfirm: t(l, "deleteImageConfirm"),
                    }}
                />
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
