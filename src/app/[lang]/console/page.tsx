import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUserOrNull } from "@/lib/auth";
import { getDb } from "@/db/index";
import { channels, images } from "@/db/schema";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function ConsolePage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUserOrNull();
    if (!user) redirect(`/${l}/account/signin`);
    const db = getDb();

    const channelCount = await db.$count(channels, eq(channels.userId, user.id));
    const imageCount = await db.$count(images, eq(images.userId, user.id));

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{t(l, "console")}</h1>
                <p className="text-gray-500 mb-8">
                    {t(l, "welcomeUser")},{" "}
                    <Link href={`/${l}/console/profile`} className="font-medium text-blue-600 hover:underline">
                        {user.nickname || user.name}
                    </Link>
                </p>
                <div className="grid grid-cols-2 gap-6 mb-10">
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <p className="text-3xl font-bold text-gray-900">{channelCount}</p>
                        <p className="text-gray-500 mt-1">{t(l, "channels")}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                        <p className="text-3xl font-bold text-gray-900">{imageCount}</p>
                        <p className="text-gray-500 mt-1">{t(l, "images")}</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <Link
                        href={`/${l}/console/channels`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                        {t(l, "manageChannels")}
                    </Link>
                    <Link
                        href={`/${l}/console/images`}
                        className="inline-flex items-center px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900"
                    >
                        {t(l, "manageImages")}
                    </Link>
                </div>
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
