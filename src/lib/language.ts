import acceptLanguage from "accept-language";

export const langEn = "en";
export const langEs = "es";
export const langZh = "zh";

export type LangKey =
  | typeof langEn
  | typeof langEs
  | typeof langZh;

export const defaultLanguage: LangKey = langEn;
export const unknownLanguage = "unknown";

export const supportedLanguages: { key: LangKey; name: string }[] = [
  { key: langEn, name: "English" },
  { key: langEs, name: "Español" },
  { key: langZh, name: "简体中文" },
];

const supportedKeys = supportedLanguages.map((l) => l.key);

acceptLanguage.languages(supportedKeys as string[]);

export function getTargetLang(rawLang: string, fallback: string): string {
  const matched = acceptLanguage.get(rawLang);
  if (matched && supportedKeys.includes(matched as LangKey)) return matched;
  return fallback;
}

export function isValidLang(lang: string): lang is LangKey {
  return supportedKeys.includes(lang as LangKey);
}
