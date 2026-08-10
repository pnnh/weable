import type { LangKey } from "@/lib/language";

import en from "@/locales/en.json";
import es from "@/locales/es.json";
import zh from "@/locales/zh.json";

type LocaleMessages = typeof en;

const locales: Record<LangKey, LocaleMessages> = {
  en,
  es,
  zh,
};

export function t(lang: LangKey, key: keyof LocaleMessages): string {
  return locales[lang]?.[key] ?? locales.en[key] ?? key;
}
