# 快速验证指南：简化多语言支持

**日期**: 2026-08-10 | **功能**: `009-simplify-i18n-locales`

## 前置条件

- Node.js + pnpm 已安装
- 仓库已克隆并切换至功能分支 `009-simplify-i18n-locales`

## 验证步骤

### 步骤 1：类型检查

```bash
pnpm tsc --noEmit
```

**期望结果**：无 TypeScript 错误。特别验证：`i18n.ts` 不再 import 已移除的 JSON，`language.ts` 的 `LangKey` 不含已移除语言。

---

### 步骤 2：运行测试套件

```bash
pnpm vitest run
```

**期望结果**：全部测试通过，包括：
- `src/lib/language.test.ts` — `isValidLang`、`getTargetLang` 测试全绿
- `src/lib/i18n.test.ts` — `t()` 函数测试全绿
- `src/components/LanguageSelector.test.tsx` — 渲染正确（3 个选项）、路由跳转正确

---

### 步骤 3：构建验证

```bash
pnpm build
```

**期望结果**：构建成功，无错误。构建产物中不包含 `fr.json`、`de-DE.json`、`pt-PT.json`、`ja.json`、`zh-TW.json`。

---

### 步骤 4：运行时验证（可选，本地开发服务器）

```bash
pnpm dev
```

**场景 SC-001**：打开浏览器，访问任意页面，检查语言切换器（`<select>` 元素），确认只有 3 个选项：English、Español、简体中文。

**场景 SC-002**：在浏览器地址栏输入 `http://localhost:7600/ja/`，确认返回 404 页面，不出现白屏或 500 错误。同样验证 `/fr/`、`/de-DE/`、`/pt-PT/`、`/zh-TW/`。

**场景 SC-003**：分别切换到 English、Español、简体中文，访问主要页面（首页、控制台、上传页），确认文案全部正确渲染，无占位符残留。

---

## 参考

- 数据模型变更：[data-model.md](./data-model.md)
- 接口契约：[contracts/locale-contract.md](./contracts/locale-contract.md)
- 研究报告（测试更新说明）：[research.md](./research.md) §R3
