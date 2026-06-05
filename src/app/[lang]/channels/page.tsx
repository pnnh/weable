import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import { eq, like, or, and, desc } from "drizzle-orm";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChannelAvatar from "@/components/ChannelAvatar";
import ChannelSearch from "@/components/ChannelSearch";
import { t } from "@/lib/i18n";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type Props = {
    params: Promise<{ lang: string }>;
    searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function ChannelsPage({ params, searchParams }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const sp = await searchParams;
    const query = sp.q?.trim() ?? "";
    const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const db = getDb();

    const baseCondition = eq(channels.isPublic, true);
    const condition = query
        ? and(
              baseCondition,
              or(
                  like(channels.name, `%${query}%`),
                  like(channels.description, `%${query}%`),
              ),
          )
        : baseCondition;

    const [allRows, pageRows] = await Promise.all([
        db.select({ id: channels.id }).from(channels).where(condition),
        db
            .select({
                id: channels.id,
                name: channels.name,
                description: channels.description,
                createdAt: channels.createdAt,
            })
            .from(channels)
            .where(condition)
            .orderBy(desc(channels.createdAt))
            .limit(PAGE_SIZE)
            .offset(offset),
    ]);

    const total = allRows.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    const buildUrl = (p: number) => {
        const params2 = new URLSearchParams();
        if (query) params2.set("q", query);
        if (p > 1) params2.set("page", String(p));
        const qs = params2.toString();
        return `/${l}/channels${qs ? `?${qs}` : ""}`;
    };

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">{t(l, "channels")}</h1>
                <div className="mb-8">
                    <Suspense>
                        <ChannelSearch placeholder={t(l, "search")} />
                    </Suspense>
                </div>
                {pageRows.length === 0 ? (
                    <p className="text-gray-500">{t(l, "noResults")}</p>
                ) : (
                    <div className="grid gap-4">
                        {pageRows.map((ch) => (
                            <Link
                                key={ch.id}
                                href={`/${l}/channels/${ch.id}`}
                                className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
                            >
                                <ChannelAvatar channelId={ch.id} channelName={ch.name} size={48} />
                                <div>
                                    <p className="font-medium text-gray-900">{ch.name}</p>
                                    {ch.description && (
                                        <p className="text-sm text-gray-500 line-clamp-1">{ch.description}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                        {currentPage > 1 && (
                            <Link href={buildUrl(currentPage - 1)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">←</Link>
                        )}
                        <span className="px-3 py-1 text-sm text-gray-500">{currentPage} / {totalPages}</span>
                        {currentPage < totalPages && (
                            <Link href={buildUrl(currentPage + 1)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">→</Link>
                        )}
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
