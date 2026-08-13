import type { LangKey } from "@/lib/language";

import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import ja from "@/locales/ja.json";
import zh from "@/locales/zh.json";
import zhTW from "@/locales/zh-TW.json";

type LocaleMessages = typeof en;

const locales: Record<LangKey, LocaleMessages> = {
  en,
  es,
  fr,
  ja,
  zh,
  "zh-TW": zhTW,
};

export function t(lang: LangKey, key: keyof LocaleMessages): string {
  return locales[lang]?.[key] ?? locales.en[key] ?? key;
}
