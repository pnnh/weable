# 接口契约：Locale 配置（恢复法 / 日 / 繁中）

**日期**: 2026-08-13 | **功能**: `012-restore-i18n-locales`

本契约取代 009 将支持语言收窄为 3 种的约定；德语、葡萄牙语条款保持 009 的下线行为。

## 公开 API

### `LangKey` 类型

```ts
type LangKey = "en" | "es" | "fr" | "ja" | "zh" | "zh-TW"
```

**消费方**：`t()`、`isValidLang()`、`getTargetLang()`、所有 `/[lang]/` 页面、`ImageAiMetaSection.pageLang`、`TargetLang`

**契约**：`"fr"` / `"ja"` / `"zh-TW"` 为合法字面量；`"de-DE"` / `"pt-PT"` / `"de"` / `"pt"` 仍非法。

---

### `supportedLanguages` 数组

```ts
const supportedLanguages: { key: LangKey; name: string }[] = [
  { key: "en", name: "English" },
  { key: "es", name: "Español" },
  { key: "fr", name: "Français" },
  { key: "ja", name: "日本語" },
  { key: "zh", name: "简体中文" },
  { key: "zh-TW", name: "繁體中文" },
]
```

**消费方**：`LanguageSelector`、AI 确认框输出语言 `<select>`、`acceptLanguage.languages()`、`generateStaticParams()`

**契约**：

- 长度恰好为 6
- 顺序固定如上；`en` 保持首位（默认回退）
- 不含德语、葡萄牙语

---

### `isValidLang(lang: string): lang is LangKey`

**契约**：

| 输入 | 结果 |
|------|------|
| `en` `es` `fr` `ja` `zh` `zh-TW` | `true` |
| `de-DE` `pt-PT` `de` `pt` `zh-CN` `FR` `""` 及其他 | `false` → `[lang]` 布局调用 `notFound()` |

`zh` 与 `zh-TW` 互不替代。

---

### `getTargetLang(rawLang: string, fallback: string): string`

**契约**（在已注册 6 种语言的前提下）：

| Accept-Language 示例 | 期望 |
|----------------------|------|
| `fr` / `fr-FR,fr;q=0.9` | `fr` |
| `ja` / `ja-JP,ja;q=0.9` | `ja` |
| `zh-TW` / `zh-TW,zh;q=0.9` | `zh-TW` |
| `zh` / `zh-CN,zh;q=0.9` | `zh` |
| `de` / `de-DE,de;q=0.9` | 回退 `en`（或列表首项 `en`） |
| `pt` / `pt-PT,pt;q=0.9` | 回退 `en` |
| 空 / 无法识别 | 列表首项 `en` |

---

### `t(lang: LangKey, key: keyof LocaleMessages): string`

**契约**：

- `lang` 接受 6 种 `LangKey`
- `LocaleMessages` 仍由 `en.json` 推断（108 键）
- `fr.json` / `ja.json` / `zh-TW.json` 必须与 `en.json` 键集相同
- 与 `dc57f28^` 共有的 79 个键，值必须与历史文件相同
- 缺键时仍回退英语再回退 key 本身；交付后不应依赖该回退

---

### `TargetLang`（`src/lib/browserAi.ts`）

```ts
type TargetLang = LangKey
```

**契约**：`recognizeImage({ targetLang })` 接受全部 6 种站点语言。写入模型的语言名：

| `targetLang` | prompt 中须包含 |
|--------------|-----------------|
| `en` | English |
| `es` | Spanish |
| `fr` | French |
| `ja` | Japanese |
| `zh` | Simplified Chinese |
| `zh-TW` | Traditional Chinese |

选择输出语言不得改变站点 URL 或界面语言。

---

## URL 路由契约

**现有路由结构**：`/[lang]/...`（不改）

| 路径 | 行为 |
|------|------|
| `/en/` `/es/` `/fr/` `/ja/` `/zh/` `/zh-TW/` 及其子路径 | 正常渲染对应语言 |
| `/de-DE/` `/pt-PT/` `/de/` `/pt/` 及其他未知段 | `isValidLang` 为 false → 404 |
| `/` | `getTargetLang(Accept-Language, en)` 后进入匹配语言或英语 |

不提供德语 / 葡萄牙语到英语的永久跳转。
