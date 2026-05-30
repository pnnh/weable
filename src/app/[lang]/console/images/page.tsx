import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function ImagesListPage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();
    const db = getDb();

    const userImages = await db
        .select()
        .from(images)
        .leftJoin(channels, eq(images.channelId, channels.id))
        .where(eq(images.userId, user.id))
        .orderBy(desc(images.updatedAt));

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">{t(l, "images")}</h1>
                    <Link
                        href={`/${l}/console/images/new`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                        {t(l, "newImage")}
                    </Link>
                </div>
                {userImages.length === 0 ? (
                    <p className="text-gray-500">{t(l, "noImagesYet")}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                <tr>
                                    <th className="py-3 pr-4"></th>
                                    <th className="py-3 pr-4">{t(l, "imageTitle")}</th>
                                    <th className="py-3 pr-4">{t(l, "imageChannel")}</th>
                                    <th className="py-3 pr-4">{t(l, "imageStatus")}</th>
                                    <th className="py-3">{t(l, "updated")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {userImages.map(({ images: img, channels: channel }) => (
                                    <tr key={img.id}>
                                        <td className="py-3 pr-4">
                                            <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden">
                                                <img
                                                    src={`/api/images/${img.id}/file`}
                                                    alt={img.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Link
                                                href={`/${l}/console/images/${img.id}`}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                {img.title}
                                            </Link>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500">{channel?.name ?? "—"}</td>
                                        <td className="py-3 pr-4">
                                            <span
                                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${img.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                                            >
                                                {img.isPublished ? t(l, "imagePublished") : t(l, "imageDraft")}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-500">
                                            {new Date(img.updatedAt).toLocaleDateString()}
                                        </td>
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
