import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ImageSearchBar from "@/components/ImageSearchBar";
import { t } from "@/lib/i18n";
import { getDb } from "@/db/index";
import { images, channels } from "@/db/schema";
import { eq, and, desc, like, or } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function HomePage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const { q = "", page: pageStr = "1" } = await searchParams;
    const page = Math.max(1, parseInt(pageStr, 10) || 1);
    const query = q.trim();

    const db = getDb();

    const baseWhere = and(
        eq(images.isPublished, true),
        eq(channels.isPublic, true),
        query
            ? or(
                  like(images.title, `%${query}%`),
                  like(images.description, `%${query}%`)
              )
            : undefined
    );

    const [allIds, pageRows] = await Promise.all([
        db
            .select()
            .from(images)
            .innerJoin(channels, eq(images.channelId, channels.id))
            .where(baseWhere),
        db
            .select()
            .from(images)
            .innerJoin(channels, eq(images.channelId, channels.id))
            .where(baseWhere)
            .orderBy(desc(images.updatedAt))
            .limit(PAGE_SIZE)
            .offset((page - 1) * PAGE_SIZE),
    ]);

    const total = allIds.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    function buildUrl(p: number) {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (p > 1) params.set("page", String(p));
        const qs = params.toString();
        return `/${l}${qs ? `?${qs}` : ""}`;
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8 flex flex-col items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        {t(l, "latestImages")}
                    </h1>
                    <ImageSearchBar
                        lang={l}
                        defaultValue={query}
                        placeholder={t(l, "searchImages")}
                        searchLabel={t(l, "search")}
                    />
                </div>

                {pageRows.length === 0 ? (
                    <p className="text-center text-gray-500 py-20">{t(l, "noResults")}</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {pageRows.map(({ images: img }) => (
                            <Link
                                key={img.id}
                                href={`/${l}/images/${img.id}`}
                                className="group rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition"
                            >
                                <div className="aspect-square bg-gray-100">
                                    <img
                                        src={`/api/images/${img.id}/file`}
                                        alt={img.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-2">
                                    <p className="text-xs font-medium text-gray-900 truncate">{img.title}</p>
                                    {img.description && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{img.description}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <nav className="mt-10 flex items-center justify-center gap-2 flex-wrap">
                        {currentPage > 1 && (
                            <Link
                                href={buildUrl(currentPage - 1)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            >
                                {t(l, "prevPage")}
                            </Link>
                        )}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <Link
                                key={p}
                                href={buildUrl(p)}
                                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                                    p === currentPage
                                        ? "bg-blue-600 border-blue-600 text-white font-medium"
                                        : "border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                {p}
                            </Link>
                        ))}
                        {currentPage < totalPages && (
                            <Link
                                href={buildUrl(currentPage + 1)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                            >
                                {t(l, "nextPage")}
                            </Link>
                        )}
                    </nav>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}


