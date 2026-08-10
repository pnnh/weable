# 数据模型：简化多语言支持

**日期**: 2026-08-10 | **功能**: `009-simplify-i18n-locales`

## 实体变更

### LangKey（类型联合）

**当前**：
```ts
type LangKey = "en" | "es" | "fr" | "de-DE" | "pt-PT" | "ja" | "zh" | "zh-TW"
```

**变更后**：
```ts
type LangKey = "en" | "es" | "zh"
```

**影响**：所有接受 `LangKey` 参数的函数（`t(lang, key)`、`isValidLang()`、`getTargetLang()`）自动收窄类型；TypeScript 编译器会在引用已移除语言字面量时报错，起到静态检查作用。

---

### supportedLanguages（配置数组）

**当前**（8 项）：

| key | name |
|-----|------|
| `en` | English |
| `es` | Español |
| `fr` | Français |
| `de-DE` | Deutsch |
| `pt-PT` | Português |
| `ja` | 日本語 |
| `zh` | 简体中文 |
| `zh-TW` | 繁體中文 |

**变更后**（3 项）：

| key | name |
|-----|------|
| `en` | English |
| `es` | Español |
| `zh` | 简体中文 |

**关系**：`acceptLanguage.languages()` 从此数组派生，驱动 Accept-Language 头的匹配范围。

---

### locales（翻译映射）

**当前**：`Record<LangKey, LocaleMessages>`，8 个键

**变更后**：`Record<LangKey, LocaleMessages>`，3 个键（`en`、`es`、`zh`）

**翻译 key 结构**：不变。保留语言的 JSON 内容完整保留，无任何 key 删减。

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/locales/fr.json` | 删除 | 法语翻译 |
| `src/locales/de-DE.json` | 删除 | 德语翻译 |
| `src/locales/pt-PT.json` | 删除 | 葡萄牙语翻译 |
| `src/locales/ja.json` | 删除 | 日语翻译 |
| `src/locales/zh-TW.json` | 删除 | 繁体中文翻译 |
| `src/lib/language.ts` | 修改 | 移除 5 个常量、收窄 `LangKey`、缩短 `supportedLanguages` |
| `src/lib/i18n.ts` | 修改 | 移除 5 个 JSON import 和对应 `locales` 映射条目 |
| `src/lib/language.test.ts` | 修改 | 替换引用已移除语言的测试断言 |
| `src/lib/i18n.test.ts` | 修改 | 替换 `t("ja", ...)` 断言为有效语言 |
| `src/components/LanguageSelector.tsx` | 无需修改 | 动态读取 `supportedLanguages` |
| `src/components/LanguageSelector.test.tsx` | 无需修改 | 使用 `supportedLanguages.length` 断言，自动适配 |

## 状态转换

无状态机变更。语言选择是无状态路由参数（URL `[lang]` 段），不涉及持久化状态转换。
