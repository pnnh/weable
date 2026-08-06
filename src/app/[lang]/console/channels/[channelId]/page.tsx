import { notFound, redirect } from "next/navigation";
import { eq, and, count } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, images, createId } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChannelAvatarUpload from "@/components/ChannelAvatarUpload";
import ChannelDeleteSection from "@/components/ChannelDeleteSection";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; channelId: string }> };

export default async function ChannelEditorPage({ params }: Props) {
    const { lang, channelId } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    const db = getDb();
    const isNew = channelId === "new";

    const existingChannel = isNew ? null : await db
        .select()
        .from(channels)
        .where(eq(channels.id, channelId))
        .then((rows) => rows[0] ?? null);

    if (!isNew && (!existingChannel || existingChannel.userId !== user.id)) notFound();

    const publishedImageCount = isNew ? 0 : await db
        .select({ cnt: count() })
        .from(images)
        .where(and(eq(images.channelId, channelId), eq(images.isPublished, true)))
        .then(([row]) => row?.cnt ?? 0);

    async function handleSave(formData: FormData) {
        "use server";
        const db2 = getDb();
        const user2 = await getCurrentUser();
        const name = (formData.get("name") as string | null) ?? "";
        const description = (formData.get("description") as string | null) || null;
        const isPublic = formData.get("isPublic") === "true";
        const now = Date.now();

        if (isNew) {
            const id = createId();
            await db2.insert(channels).values({
                id,
                userId: user2.id,
                name,
                description,
                isPublic,
                createdAt: now,
            });
        } else {
            await db2
                .update(channels)
                .set({ name, description, isPublic })
                .where(eq(channels.id, channelId));
        }
        redirect(`/${lang}/console/channels`);
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">
                    {isNew ? t(l, "newChannel") : t(l, "editChannel")}
                </h1>
                {!isNew && existingChannel && (
                    <ChannelAvatarUpload
                        lang={l}
                        channelId={channelId}
                        channelName={existingChannel.name}
                        labels={{
                            avatar: t(l, "avatar"),
                            uploadAvatar: t(l, "uploadAvatar"),
                            avatarHint: t(l, "avatarHint"),
                        }}
                    />
                )}
                <form action={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "channelName")}</label>
                        <input
                            name="name"
                            type="text"
                            defaultValue={existingChannel?.name ?? ""}
                            required
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t(l, "channelDescription")}</label>
                        <textarea
                            name="description"
                            rows={6}
                            defaultValue={existingChannel?.description ?? ""}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isPublic"
                            name="isPublic"
                            value="true"
                            defaultChecked={existingChannel?.isPublic ?? false}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">{t(l, "makeChannelPublic")}</label>
                    </div>
                    <div className="flex gap-3">
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                            {t(l, "save")}
                        </button>
                        <a href={`/${lang}/console/channels`} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
                            {t(l, "cancel")}
                        </a>
                    </div>
                </form>
                {!isNew && (
                    <ChannelDeleteSection
                        lang={l}
                        channelId={channelId}
                        redirectTo={`/${lang}/console/channels`}
                        publishedImageCount={publishedImageCount}
                        labels={{
                            deleteChannel: t(l, "deleteChannel"),
                            deleteChannelConfirm: t(l, "deleteChannelConfirm"),
                            deleteChannelHasImages: t(l, "deleteChannelHasImages"),
                        }}
                    />
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
