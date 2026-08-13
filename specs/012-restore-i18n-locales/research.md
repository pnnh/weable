# 研究报告：恢复法语、日语与繁体中文

**日期**: 2026-08-13 | **功能**: `012-restore-i18n-locales`

## 决策记录

### R1：历史文案从 `dc57f28` 的父版本取出，不整包重写

- **决策**：用 `git show dc57f28^:src/locales/{fr,ja,zh-TW}.json` 恢复三个文件，再只把当前 `en.json` 多出的键追加进去
- **理由**：规格 FR-004 要求 009 下线前的译文原样复用。父提交 `d0624dd` 中三文件各 79 个扁平键，与当前 `en.json` 的交集完整且无多余废弃键
- **考虑的替代方案**：
  - 按英语重新生成全部译文 — 浪费、且无法保证与历史文案一致
  - `git checkout dc57f28^ -- src/locales/` — 会连 `de-DE.json` / `pt-PT.json` 一并带回，超出范围

### R2：新译文范围以「当前英语 − 历史键集」为准

- **决策**：只为下列 29 个键补法语 / 日语 / 繁体中文，英语为唯一源；必须保留 `{count}`

| 分组 | 键 |
|------|-----|
| 批量删除 | `batchDelete` `batchDeleteConfirm` `batchDeleteConfirmBody` `batchDeleteConfirmTitle` `batchDeleteFailed` |
| 上传队列 | `uploadQueue` `uploadQueueAddFiles` `uploadQueueEmpty` `uploadQueueModified` `uploadQueueSkippedDupes` `uploadQueueStart` `uploadQueueStatusFailed` `uploadQueueStatusNeedsFile` `uploadQueueStatusOversized` `uploadQueueStatusPending` `uploadQueueStatusSuccess` `uploadQueueUploading` |
| AI 识别 | `aiRecognize` `aiRecognizeConfirm` `aiRecognizeConfirmBody` `aiRecognizeConfirmTitle` `aiRecognizeEmptyTitle` `aiRecognizeFailed` `aiRecognizeImageUnreadable` `aiRecognizeModelNotReady` `aiRecognizeRunning` `aiRecognizeTargetLang` `aiRecognizeTimeout` `aiRecognizeUnsupported` |

含 `{count}` 的键：`batchDeleteConfirmBody`、`uploadQueueSkippedDupes`、`uploadQueueStatusFailed`

- **理由**：与规格假设一致；`LocaleMessages = typeof en`，缺键会导致 `i18n.ts` 类型不通过
- **考虑的替代方案**：先注册不完整 JSON 再补 — `tsc` 会失败，不可行

### R3：`language.ts` 仍是语言列表唯一真相来源

- **决策**：只在 `supportedLanguages` 中按「历史顺序去掉德语、葡萄牙语」插入三项：`en`、`es`、`fr`、`ja`、`zh`、`zh-TW`。显示名：Français、日本語、繁體中文
- **理由**：009 已验证 `LanguageSelector`、`generateStaticParams`、`acceptLanguage.languages()`、AI 确认框 `<select>` 都读这一数组。改一处即可联动
- **影响**：`LanguageSelector.tsx` 无需修改

### R4：`TargetLang` 对齐 `LangKey`，并补 AI 提示中的语言名

- **决策**：`browserAi.ts` 将 `export type TargetLang = "en" | "es" | "zh"` 改为 `export type TargetLang = LangKey`；`OUTPUT_LANG_NAME` 增加 `fr: "French"`、`ja: "Japanese"`、`zh-TW: "Traditional Chinese"`
- **理由**：011 当时把目标语言写死为站点支持的 3 种。规格 FR-011 要求该列表随站点扩大。UI 已 `map(supportedLanguages)`，不扩类型则 `pageLang: LangKey` 赋给 `TargetLang` 会在恢复后编译失败
- **考虑的替代方案**：
  - 独立维护第二套 `"en"\|"es"\|"zh"\|"fr"\|"ja"\|"zh-TW"` — 与 `LangKey` 重复，易再漂移
  - 把 `OUTPUT_LANG_NAME` 搬进 `language.ts` — 超出本功能，AI 提示用语不属于站点 UI

### R5：`zh` 与 `zh-TW` 独立匹配；`de` / `pt` 仍无效

- **决策**：`acceptLanguage.languages()` 同时注册 `zh` 与 `zh-TW`。测试至少覆盖：
  - `getTargetLang("fr-FR,fr;q=0.9", "en")` → `fr`
  - `getTargetLang("ja-JP,ja;q=0.9", "en")` → `ja`
  - `getTargetLang("zh-TW,zh;q=0.9", "en")` → `zh-TW`
  - `getTargetLang("zh-CN,zh;q=0.9", "en")` → `zh`
  - `isValidLang("de-DE")` / `isValidLang("pt-PT")` → `false`
  - `getTargetLang("de-DE,de;q=0.9", "en")` 与 `pt-PT` 回退到默认英语
- **理由**：规格要求简繁分立，且德语 / 葡萄牙语保持下线。`[lang]/layout.tsx` 对 `!isValidLang` 调用 `notFound()`，无需改路由
- **考虑的替代方案**：为 `de` / `pt` 做 301 到 `en` — 规格明确不要求

### R6：需要改动的测试，不多不少

- **决策**：
  - `language.test.ts`：补 R5 的匹配 / 回退断言
  - `i18n.test.ts`：断言 `fr` / `ja` / `zh-TW` 的既有键能读出非空；三文件键集与 `en.json` 完全一致；与 `dc57f28^` 的交集键值相等
  - `ImageAiMetaSection.test.tsx`：下拉选项数为 6，且含 `fr` / `ja` / `zh-TW`；`pageLang` 可用恢复语言
  - `browserAi.test.ts`：增加一条 `targetLang: "ja"`（或 `fr` / `zh-TW`）断言 prompt 含对应英文语言名
  - `LanguageSelector.test.tsx`：不改
- **理由**：只改会因语言列表变化而失败或无法证明 FR 的测试

### R7：宪法语言列表与运行时 6 语对齐

- **决策**：宪法 §技术规范国际化列表修订为 `en`、`es`、`fr`、`ja`、`zh`、`zh-TW`（v1.0.1）
- **理由**：009 已下线 `de-DE`/`pt-PT`，012 恢复法/日/繁中；列表须与运行时一致，且不得为对齐旧 8 语而恢复德语、葡萄牙语
- **风险**：无。不改变实现范围

## 结论：无 NEEDS CLARIFICATION 残留

所有实现路径已明确，可进入 Phase 1 设计。
