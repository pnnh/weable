# 快速验证指南：恢复法语、日语与繁体中文

**日期**: 2026-08-13 | **功能**: `012-restore-i18n-locales`

## 前置条件

- Node.js + pnpm 已安装
- 仓库已克隆；实现完成后在功能分支 `012-restore-i18n-locales` 上验证
- 可读取 git 历史（验证历史文案时需要 `dc57f28`）

## 验证步骤

### 步骤 1：类型检查

```bash
pnpm tsc --noEmit
```

**期望结果**：无 TypeScript 错误。`LangKey` 含 `fr` / `ja` / `zh-TW`，不含 `de-DE` / `pt-PT`；`i18n.ts` 能把三份 JSON 赋给 `Record<LangKey, LocaleMessages>`；`TargetLang` 与 `LangKey` 兼容。

---

### 步骤 2：运行测试套件

```bash
pnpm test
```

**期望结果**：全部测试通过，重点：

- `src/lib/language.test.ts` — 法 / 日 / 繁中可匹配；简繁分立；`de-DE` / `pt-PT` 无效并回退英语
- `src/lib/i18n.test.ts` — 三语文案可读；键集与 `en.json` 一致；历史 79 条与 `dc57f28^` 一致
- `src/components/LanguageSelector.test.tsx` — 选项数 = `supportedLanguages.length`（6）
- `src/components/ImageAiMetaSection.test.tsx` — 输出语言 6 项，含恢复语言
- `src/lib/browserAi.test.ts` — 恢复语言的 prompt 含对应英文语言名

---

### 步骤 3：文案键集与历史一致性（可与步骤 2 的单测合并）

对照 [data-model.md](./data-model.md) 与 [contracts/locale-contract.md](./contracts/locale-contract.md)：

1. `fr.json` / `ja.json` / `zh-TW.json` 的键集合 = `en.json`（108 个，不多不少）
2. 与 `git show dc57f28^:src/locales/<lang>.json` 的交集 79 键，值完全相同
3. 29 个新键均存在，且 `batchDeleteConfirmBody`、`uploadQueueSkippedDupes`、`uploadQueueStatusFailed` 仍含 `{count}`
4. 不存在 `src/locales/de-DE.json`、`src/locales/pt-PT.json`
5. `en.json` / `es.json` / `zh.json` 无改动

---

### 步骤 4：运行时验证（可选，本地开发服务器）

```bash
pnpm dev
```

开发服务器默认 `http://localhost:7600`。

**SC-001 / FR-001**：打开语言切换器，选项恰好为 English、Español、Français、日本語、简体中文、繁體中文。

**SC-002 / FR-003**：从英语切到法语、日语、繁体中文，地址语言段同步变化，无错误页。

**SC-003 / FR-004**：在 `/fr/`、`/ja/`、`/zh-TW/` 抽查首页、频道、图片列表、个人资料，既有文案与精简前一致。

**SC-004 / FR-005**：在上述三种语言下打开批量删除确认、上传队列状态、AI 识别确认，文案为目标语言且无英语残留。

**SC-006 / FR-007 / FR-008**：

- 访问 `http://localhost:7600/fr/`、`/ja/`、`/zh-TW/` → 正常
- 将浏览器首选语言设为法语 / 日语 / 繁体中文后访问 `/` → 进入对应语言

**SC-007 / FR-002**：访问 `/de-DE/`、`/pt-PT/` → 404；浏览器仅偏好德语或葡萄牙语时访问 `/` → 英语。

**SC-008 / FR-011**：图片编辑页 AI 识别确认框的输出语言选项与切换器 6 项一致；页面为 `/ja/...` 时默认选中 日本語。

---

## 参考

- 数据模型：[data-model.md](./data-model.md)
- 接口契约：[contracts/locale-contract.md](./contracts/locale-contract.md)
- 研究决策：[research.md](./research.md)
