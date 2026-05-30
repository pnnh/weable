import { notFound } from "next/navigation";
import { isValidLang } from "@/lib/language";
import type { LangKey } from "@/lib/language";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import UserProfileClient from "@/components/UserProfileClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }> };

export default async function ProfilePage({ params }: Props) {
    const { lang } = await params;
    if (!isValidLang(lang)) notFound();
    const l = lang as LangKey;

    const user = await getCurrentUser();

    const labels = {
        avatar: t(l, "avatar"),
        uploadAvatar: t(l, "uploadAvatar"),
        nickname: t(l, "nickname"),
        username: t(l, "username"),
        email: "Email",
        bio: t(l, "bio"),
        saveProfile: t(l, "saveProfile"),
        profileSaved: t(l, "profileSaved"),
        avatarHint: t(l, "avatarHint"),
    };

    return (
        <>
            <SiteHeader lang={l} />
            <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-8">{t(l, "profileTitle")}</h1>
                <UserProfileClient
                    userId={user.id}
                    name={user.name}
                    email={user.email}
                    nickname={user.nickname}
                    bio={user.bio}
                    labels={labels}
                />
            </main>
            <SiteFooter lang={l} />
        </>
    );
}
