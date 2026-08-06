import Link from "next/link";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";
import ImagesBatchToolbar from "@/components/ImagesBatchToolbar";
import CreateDirectoryDialog from "@/components/CreateDirectoryDialog";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ parentId?: string }>;
};

async function buildBreadcrumb(
    db: ReturnType<typeof getDb>,
    userId: string,
    startId: string,
): Promise<{ id: string; title: string }[]> {
    const breadcrumb: { id: string; title: string }[] = [];
    let currentId: string | null = startId;
    for (let i = 0; i < 20 && currentId !== null; i++) {
        const [row] = await db
            .select()
            .from(images)
            .where(and(eq(images.id, currentId), eq(images.userId, userId)))
            .limit(1);
        if (!row) break;
        breadcrumb.unshift({ id: row.id, title: row.title });
        currentId = row.parentId ?? null;
    }
    return breadcrumb;
}

export default async function ImagesListPage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const { parentId } = await searchParams;
    const db = getDb();
    const user = await getCurrentUser();

    // validate parentId when provided
    if (parentId) {
        const [dir] = await db
            .select()
            .from(images)
            .where(
                and(
                    eq(images.id, parentId),
                    eq(images.userId, user.id),
                    eq(images.mimeType, "directory"),
                ),
            )
            .limit(1);
        if (!dir) notFound();
    }

    const rows = await db
        .select()
        .from(images)
        .where(
            and(
                eq(images.userId, user.id),
                parentId ? eq(images.parentId, parentId) : isNull(images.parentId),
            ),
        )
        .orderBy(
            asc(sql`CASE WHEN ${images.mimeType} = 'directory' THEN 0 ELSE 1 END`),
            desc(images.updatedAt),
        );

    const breadcrumb = parentId ? await buildBreadcrumb(db, user.id, parentId) : [];

    // 频道列表供批量设置频道弹窗使用（research.md R6）
    const channelRows = await db
        .select({ id: channels.id, name: channels.name })
        .from(channels)
        .where(eq(channels.userId, user.id))
        .orderBy(asc(channels.createdAt));

    const uploadHref = parentId
        ? `/${l}/console/images/new?parentId=${encodeURIComponent(parentId)}`
        : `/${l}/console/images/new`;

    const dialogLabels = {
        newDirectory: t(l, "newDirectory"),
        directoryName: t(l, "directoryName"),
        directoryNamePlaceholder: t(l, "directoryNamePlaceholder"),
        directoryDescriptionPlaceholder: t(l, "directoryDescriptionPlaceholder"),
        createDirectory: t(l, "createDirectory"),
        cancel: t(l, "cancel"),
        nameRequired: t(l, "nameRequired"),
        duplicateEntryName: t(l, "duplicateEntryName"),
        invalidTitleChars: t(l, "invalidTitleChars"),
    };

    const batchLabels = {
        batchSetPublishStatus: t(l, "batchSetPublishStatus"),
        batchSetChannel: t(l, "batchSetChannel"),
        imagePublished: t(l, "imagePublished"),
        imageDraft: t(l, "imageDraft"),
        updated: t(l, "updated"),
        selectAllImages: t(l, "selectAllImages"),
        cancel: t(l, "cancel"),
        batchConfirm: t(l, "batchConfirm"),
        batchOperationFailed: t(l, "batchOperationFailed"),
        imageChannel: t(l, "imageChannel"),
        noChannel: t(l, "noChannel"),
    };

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* breadcrumb */}
                {breadcrumb.length > 0 && (
                    <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4 flex-wrap">
                        <Link href={`/${l}/console/images`} className="hover:underline text-blue-600">
                            {t(l, "breadcrumbRoot")}
                        </Link>
                        {breadcrumb.map((crumb) => (
                            <span key={crumb.id} className="flex items-center gap-1">
                                <span>/</span>
                                <Link
                                    href={`/${l}/console/images?parentId=${encodeURIComponent(crumb.id)}`}
                                    className="hover:underline text-blue-600"
                                >
                                    {crumb.title}
                                </Link>
                            </span>
                        ))}
                    </nav>
                )}

                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">{t(l, "images")}</h1>
                    <div className="flex items-center gap-2">
                        <CreateDirectoryDialog
                            lang={l}
                            parentId={parentId ?? null}
                            labels={dialogLabels}
                        />
                        <Link
                            href={uploadHref}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                        >
                            {t(l, "newImage")}
                        </Link>
                    </div>
                </div>

                {rows.length === 0 ? (
                    <p className="text-gray-500">{t(l, "noImagesYet")}</p>
                ) : (
                    <ImagesBatchToolbar
                        lang={l}
                        initialItems={rows}
                        channels={channelRows}
                        labels={batchLabels}
                    />
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
