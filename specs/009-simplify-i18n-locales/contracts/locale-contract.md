# 接口契约：Locale 配置

**日期**: 2026-08-10 | **功能**: `009-simplify-i18n-locales`

## 公开 API

本项目的国际化模块（`src/lib/language.ts`、`src/lib/i18n.ts`）对其他模块暴露以下接口。

### `LangKey` 类型

```ts
type LangKey = "en" | "es" | "zh"
```

**消费方**：所有接受语言参数的页面组件（`[lang]/page.tsx`、`[lang]/layout.tsx` 等）、`t()` 函数、`isValidLang()`、`getTargetLang()`

**契约**：变更后，任何传入 `"fr"` / `"de-DE"` / `"pt-PT"` / `"ja"` / `"zh-TW"` 的调用将产生 TypeScript 编译错误。

---

### `supportedLanguages` 数组

```ts
const supportedLanguages: { key: LangKey; name: string }[] = [
  { key: "en", name: "English" },
  { key: "es", name: "Español" },
  { key: "zh", name: "简体中文" },
]
```

**消费方**：`LanguageSelector.tsx`（UI 渲染）、`acceptLanguage.languages()`（HTTP 头匹配）

**契约**：数组顺序影响默认回退行为（`supportedLanguages[0].key` 为首选回退）。`en` 保持首位。

---

### `isValidLang(lang: string): lang is LangKey`

**契约**：仅 `"en"`、`"es"`、`"zh"` 返回 `true`；其他所有输入（包括原来有效的 `"fr"`、`"de-DE"` 等）返回 `false`，触发 `notFound()`

---

### `getTargetLang(rawLang: string, fallback: string): string`

**契约**：Accept-Language 头中出现已移除语言时（如 `Accept-Language: fr,en;q=0.9`），`accept-language` 库在仅注册了 `["en","es","zh"]` 的情况下会匹配到 `en`，不会匹配 `fr`

---

### `t(lang: LangKey, key: keyof LocaleMessages): string`

**契约**：`lang` 参数类型收窄为 3 种，不再接受已移除语言。翻译 key 集合（`keyof LocaleMessages`）不变，由 `en.json` 推断。

---

## URL 路由契约

**现有路由结构**：`/[lang]/...`（Next.js App Router 动态段）

**变更后行为**：
- 访问 `/en/`、`/es/`、`/zh/` — 正常渲染
- 访问 `/fr/`、`/de-DE/`、`/pt-PT/`、`/ja/`、`/zh-TW/` — `isValidLang()` 返回 `false`，触发 `notFound()`，渲染 404 页面
- 根路径 `/` — `getTargetLang()` 读取 Accept-Language 头，在 3 种语言中匹配，回退到 `en`
