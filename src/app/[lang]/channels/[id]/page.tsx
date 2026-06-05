import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChannelAvatar from "@/components/ChannelAvatar";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type Props = {
    params: Promise<{ lang: string; id: string }>;
    searchParams: Promise<{ page?: string }>;
};

export default async function ChannelDetailPage({ params, searchParams }: Props) {
    const { lang, id } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const db = getDb();

    const [channel] = await db
        .select()
        .from(channels)
        .where(and(eq(channels.id, id), eq(channels.isPublic, true)))
        .limit(1);

    if (!channel) notFound();

    const sp = await searchParams;
    const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const allImages = await db
        .select()
        .from(images)
        .where(and(eq(images.channelId, id), eq(images.isPublished, true)));

    const total = allImages.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    const pageImages = await db
        .select()
        .from(images)
        .where(and(eq(images.channelId, id), eq(images.isPublished, true)))
        .orderBy(desc(images.updatedAt))
        .limit(PAGE_SIZE)
        .offset(offset);

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center gap-4 mb-8">
                    <ChannelAvatar channelId={channel.id} channelName={channel.name} size={64} />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{channel.name}</h1>
                        {channel.description && (
                            <p className="text-gray-500 mt-1">{channel.description}</p>
                        )}
                    </div>
                </div>

                {pageImages.length === 0 ? (
                    <p className="text-gray-500">No published images in this channel.</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {pageImages.map((img) => (
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
                                    <p className="text-sm font-medium text-gray-900 truncate">{img.title}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                        {currentPage > 1 && (
                            <Link href={`/${l}/channels/${id}?page=${currentPage - 1}`} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">←</Link>
                        )}
                        <span className="px-3 py-1 text-sm text-gray-500">{currentPage} / {totalPages}</span>
                        {currentPage < totalPages && (
                            <Link href={`/${l}/channels/${id}?page=${currentPage + 1}`} className="px-3 py-1 text-sm border rounded hover:bg-gray-50">→</Link>
                        )}
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
