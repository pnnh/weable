# 数据模型：恢复法语、日语与繁体中文

**日期**: 2026-08-13 | **功能**: `012-restore-i18n-locales`

## 实体变更

### LangKey（类型联合）

**当前**：

```ts
type LangKey = "en" | "es" | "zh"
```

**变更后**：

```ts
type LangKey = "en" | "es" | "fr" | "ja" | "zh" | "zh-TW"
```

**不包含**：`"de-DE"`、`"pt-PT"`

**影响**：`t(lang, key)`、`isValidLang()`、`getTargetLang()`、`ImageAiMetaSection.pageLang`、以及对齐后的 `TargetLang` 自动接受恢复语言。传入 `"de-DE"` / `"pt-PT"` 仍为类型错误。

---

### supportedLanguages（配置数组）

**当前**（3 项）：

| key | name |
|-----|------|
| `en` | English |
| `es` | Español |
| `zh` | 简体中文 |

**变更后**（6 项，历史顺序去掉德语、葡萄牙语）：

| key | name |
|-----|------|
| `en` | English |
| `es` | Español |
| `fr` | Français |
| `ja` | 日本語 |
| `zh` | 简体中文 |
| `zh-TW` | 繁體中文 |

**关系**：

- `acceptLanguage.languages()` 从此数组派生，决定 Accept-Language 匹配范围
- `LanguageSelector` 与 AI 确认框 `<select>` 直接渲染此数组
- `generateStaticParams()` 为此数组生成 `/[lang]/` 静态参数
- `isValidLang()` 只认此数组中的 `key`
- 数组首位 `en` 仍是默认回退语言

---

### locales（翻译映射）

**当前**：`Record<LangKey, LocaleMessages>`，3 个键（`en`、`es`、`zh`）

**变更后**：6 个键（加上 `fr`、`ja`、`zh-TW`）

**LocaleMessages**：仍由 `typeof en` 推断，108 个扁平字符串键。每种恢复语言的 JSON 必须：

1. **历史键（79）**：值与 `dc57f28^` 对应文件完全一致
2. **新增键（29）**：见 [research.md](./research.md) §R2，值由英语新译，语义等价，保留 `{count}`
3. **不得**包含当前英语中不存在的键

`t()` 回退链不变：`locales[lang][key] ?? locales.en[key] ?? key`。实现完成后不应再走到英语回退。

---

### TargetLang（AI 输出语言）

**当前**（`src/lib/browserAi.ts` 硬编码）：

```ts
type TargetLang = "en" | "es" | "zh"
```

**变更后**：

```ts
type TargetLang = LangKey
```

**OUTPUT_LANG_NAME**（写入模型的英文语言名，不是 UI 文案）：

| key | name |
|-----|------|
| `en` | English |
| `es` | Spanish |
| `fr` | French |
| `ja` | Japanese |
| `zh` | Simplified Chinese |
| `zh-TW` | Traditional Chinese |

**关系**：确认框选项来自 `supportedLanguages`；选中值作为 `recognizeImage({ targetLang })` 传入；页面 URL `[lang]` 不变。

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/locales/fr.json` | 恢复 + 补译 | 历史 79 条来自 `dc57f28^`，再追加 29 条 |
| `src/locales/ja.json` | 恢复 + 补译 | 同上 |
| `src/locales/zh-TW.json` | 恢复 + 补译 | 同上 |
| `src/locales/de-DE.json` | 不恢复 | 超出范围 |
| `src/locales/pt-PT.json` | 不恢复 | 超出范围 |
| `src/locales/en.json` | 不改 | 英语源 |
| `src/locales/es.json` | 不改 | |
| `src/locales/zh.json` | 不改 | |
| `src/lib/language.ts` | 修改 | 恢复 3 个常量、扩 `LangKey`、扩 `supportedLanguages` |
| `src/lib/i18n.ts` | 修改 | import 并注册 3 个 JSON |
| `src/lib/browserAi.ts` | 修改 | `TargetLang = LangKey`，补 `OUTPUT_LANG_NAME` |
| `src/lib/language.test.ts` | 修改 | 恢复语言匹配；de / pt 无效 |
| `src/lib/i18n.test.ts` | 修改 | 键集对齐 + 历史值一致性 |
| `src/lib/browserAi.test.ts` | 修改 | 恢复语言的 prompt 语言名 |
| `src/components/ImageAiMetaSection.test.tsx` | 修改 | 6 个选项；可用恢复语言作 `pageLang` |
| `src/components/LanguageSelector.tsx` | 无需修改 | 动态读取 `supportedLanguages` |
| `src/components/ImageAiMetaSection.tsx` | 原则上无需修改 | 下拉已 map `supportedLanguages` |

## 状态转换

无持久化状态机。语言选择仍是 URL `[lang]` 段。

运行时判定：

```text
请求 /[lang]/...
  ├─ lang ∈ {en, es, fr, ja, zh, zh-TW} → 渲染对应语言
  └─ 其他（含 de-DE、pt-PT、de、pt） → notFound()

请求 /
  └─ getTargetLang(Accept-Language, en)
       ├─ 匹配到 6 种之一 → 进入该语言
       └─ 否则（含仅 de / pt） → en
```
