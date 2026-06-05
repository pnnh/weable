import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function ChannelsListPage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    const db = getDb();

    const userChannels = await db
        .select()
        .from(channels)
        .where(eq(channels.userId, user.id));

    const userImages = await db
        .select()
        .from(images)
        .where(eq(images.userId, user.id));

    const imageCounts = new Map<string, number>();
    for (const img of userImages) {
        if (!img.channelId) continue;
        imageCounts.set(img.channelId, (imageCounts.get(img.channelId) ?? 0) + 1);
    }

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">{t(l, "channels")}</h1>
                    <Link
                        href={`/${l}/console/channels/new`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                        {t(l, "newChannel")}
                    </Link>
                </div>
                {userChannels.length === 0 ? (
                    <p className="text-gray-500">{t(l, "noChannelsYet")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                <tr>
                                    <th className="py-3 pr-4">{t(l, "channelName")}</th>
                                    <th className="py-3 pr-4">{t(l, "channelVisibility")}</th>
                                    <th className="py-3 pr-4">{t(l, "images")}</th>
                                    <th className="py-3 pr-4">{t(l, "created")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {userChannels.map((ch) => (
                                    <tr key={ch.id}>
                                        <td className="py-3 pr-4">
                                            <Link href={`/${l}/console/channels/${ch.id}`} className="text-blue-600 hover:underline font-medium">
                                                {ch.name}
                                            </Link>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ch.isPublic ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                                                {ch.isPublic ? t(l, "channelPublic") : t(l, "channelPrivate")}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500">{imageCounts.get(ch.id) ?? 0}</td>
                                        <td className="py-3 pr-4 text-gray-500">{new Date(ch.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
