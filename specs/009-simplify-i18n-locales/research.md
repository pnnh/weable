# 研究报告：简化多语言支持

**日期**: 2026-08-10 | **功能**: `009-simplify-i18n-locales`

## 决策记录

### R1：翻译文件组织方式

- **决策**：每种语言一个独立 JSON 文件，位于 `src/locales/<lang>.json`
- **理由**：这是现有实现的实际结构，无需变更组织方式，直接删除对应文件即可
- **考虑的替代方案**：单文件多语言（如 `translations.ts` 中按 key 分区）——不适用于本项目

### R2：语言配置的唯一入口

- **决策**：`src/lib/language.ts` 是语言列表的**单一真相来源**（Single Source of Truth）
- **理由**：
  - `supportedLanguages` 数组同时驱动：路由校验（`isValidLang`）、Accept-Language 解析（`acceptLanguage.languages()`）、UI 选项（`LanguageSelector` 动态读取）
  - 修改此文件即可联动所有下游消费方，无需逐一更新 UI 组件
- **影响**：`LanguageSelector.tsx` 无需修改，测试文件 `LanguageSelector.test.tsx` 使用 `supportedLanguages.length` 断言，也无需修改

### R3：需要修改的测试文件

- **决策**：`src/lib/language.test.ts` 和 `src/lib/i18n.test.ts` 中引用已移除语言的断言必须更新
- **具体问题**：
  - `language.test.ts:27`：`getTargetLang("de-DE", "en")` 断言 `"de-DE"` ——移除后 `de-DE` 不再有效，断言将失败
  - `language.test.ts:36`：`getTargetLang("xx-YY", "ja")` 回退值用了 `"ja"` ——`ja` 移除后 `acceptLanguage.languages()` 不含 `ja`，回退行为改变；但由于 fallback 参数在无匹配时返回 `supportedLanguages[0].key`（`en`），测试逻辑本身仍然正确（fallback 不变，期望是 `supportedLanguages[0].key` 即 `en`），只有字面量 `"ja"` 作为 fallback 参数值需要替换为有效语言
  - `language.test.ts:40`：同上，`"ja"` 作为 fallback 参数需替换为有效语言
  - `i18n.test.ts:12`：`t("ja", "home")` ——`ja` 移除后 `LangKey` 不含 `ja`，TypeScript 编译失败

### R4：`zh-TW` 的处理

- **决策**：`zh-TW`（繁体中文）一并移除，与 `zh`（简体中文）不同语言
- **理由**：需求明确指定"仅保留简体中文"，`zh-TW` 是独立 locale，功能不同

### R5：宪法语言列表不在本任务更新范围内

- **决策**：宪法（`.specify/memory/constitution.md`）§技术规范 中列出了旧的 8 种语言，本任务不修改宪法
- **理由**：宪法修订需要独立的 `/speckit.constitution` 流程；代码实现完成后，用户可自行决定是否同步更新宪法
- **风险**：低。宪法是治理文档，不影响运行时行为

## 结论：无 NEEDS CLARIFICATION 残留

所有实现路径已明确，可直接进入 Phase 1 设计。
