import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getTargetLang, defaultLanguage } from "@/lib/language";

export const dynamic = "force-dynamic";

export default async function ConsoleRedirect() {
    const headersList = await headers();
    const acceptLang = headersList.get("Accept-Language") ?? "";
    const lang = getTargetLang(acceptLang, defaultLanguage);
    redirect(`/${lang}/console`);
}
