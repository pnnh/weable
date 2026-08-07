import Link from "next/link";
import { and, asc, count, desc, eq, isNull, like, sql } from "drizzle-orm";
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
    searchParams: Promise<{ parentId?: string; q?: string; page?: string }>;
};

const PAGE_SIZE = 20;

// 转义 LIKE 通配符（SQLite 默认转义符为 \），保证用户输入仅作普通文本匹配（同 console/api/images 路由）
function escapeLikePattern(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

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

    const { parentId, q: rawQ, page: rawPage } = await searchParams;
    const db = getDb();
    const user = await getCurrentUser();

    // 视图状态：q trim 后为空视为无搜索；page 非法回退为 1（FR-009）
    const q = (rawQ ?? "").trim();
    const pageRaw = Number.parseInt(rawPage ?? "", 10);
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

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

    // 当前目录直接条目 + 可选标题模糊匹配（参数化 + 通配符转义，同 console/api/images 路由）
    const whereClause = and(
        eq(images.userId, user.id),
        parentId ? eq(images.parentId, parentId) : isNull(images.parentId),
        q
            ? like(images.title, sql`'%' || ${escapeLikePattern(q)} || '%'`)
            : undefined,
    );

    const [totalRow] = await db.select({ value: count() }).from(images).where(whereClause);
    const total = totalRow?.value ?? 0;

    const rows = await db
        .select({ images: images, channelName: channels.name })
        .from(images)
        .leftJoin(channels, eq(images.channelId, channels.id))
        .where(whereClause)
        .orderBy(
            asc(sql`CASE WHEN ${images.mimeType} = 'directory' THEN 0 ELSE 1 END`),
            desc(images.updatedAt),
        )
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE);

    const items = rows.map(({ images: img, channelName }) => ({
        id: img.id,
        title: img.title,
        mimeType: img.mimeType,
        description: img.description,
        size: img.size,
        width: img.width,
        height: img.height,
        parentId: img.parentId,
        channelId: img.channelId,
        channelName,
        isPublished: img.isPublished,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
    }));

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
        searchPlaceholder: t(l, "searchPlaceholder"),
        searchButton: t(l, "searchButton"),
        noSearchResults: t(l, "noSearchResults"),
        prevPage: t(l, "prevPage"),
        nextPage: t(l, "nextPage"),
        fileSize: t(l, "fileSize"),
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

                {items.length === 0 && !q ? (
                    <p className="text-gray-500">{t(l, "noImagesYet")}</p>
                ) : (
                    <ImagesBatchToolbar
                        lang={l}
                        parentId={parentId ?? null}
                        initialItems={items}
                        initialQ={q}
                        initialPage={page}
                        initialTotal={total}
                        channels={channelRows}
                        labels={batchLabels}
                    />
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
