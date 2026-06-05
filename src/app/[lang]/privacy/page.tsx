import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { privacyContent } from "@/data/privacy";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function PrivacyPage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const content = privacyContent[l];

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{content.title}</h1>
                <p className="text-sm text-gray-500 mb-8">{content.lastUpdated}</p>
                <p className="text-gray-700 mb-8">{content.intro}</p>
                {content.sections.map((section, i) => (
                    <section key={i} className="mb-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">{section.heading}</h2>
                        <p className="text-gray-700">{section.body}</p>
                    </section>
                ))}
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
