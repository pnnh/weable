import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarkdownContent from "@/components/MarkdownContent";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; id: string }> };

export default async function ImageDetailPage({ params }: Props) {
    const { lang, id } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const db = getDb();
    const [result] = await db
        .select()
        .from(images)
        .innerJoin(channels, eq(images.channelId, channels.id))
        .where(
            and(
                eq(images.id, id),
                eq(images.isPublished, true),
                eq(channels.isPublic, true),
            ),
        )
        .limit(1);

    if (!result) notFound();

    const { images: img, channels: channel } = result;

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-4 text-sm text-gray-500">
                    <Link href={`/${l}/channels/${channel.id}`} className="hover:underline text-blue-600">
                        {channel.name}
                    </Link>
                    <span className="mx-2">·</span>
                    <time>{new Date(img.updatedAt).toLocaleDateString()}</time>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-6">{img.title}</h1>
                <div className="mb-8">
                    <img
                        src={`/api/images/${img.id}/file`}
                        alt={img.title}
                        className="max-w-full rounded-lg border border-gray-200"
                    />
                </div>
                {img.description && (
                    <article>
                        <MarkdownContent content={img.description} />
                    </article>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
