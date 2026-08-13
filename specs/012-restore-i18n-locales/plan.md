# 实现计划：恢复法语、日语与繁体中文

**分支**: `012-restore-i18n-locales` | **日期**: 2026-08-13 | **规格**: [spec.md](./spec.md)

**输入**: 功能规格 `specs/012-restore-i18n-locales/spec.md`

## 摘要

将站点支持语言从 3 种（`en`、`es`、`zh`）恢复为 6 种（`en`、`es`、`fr`、`ja`、`zh`、`zh-TW`）。法语、日语、繁体中文在 009 精简前已有的 79 条译文从提交 `dc57f28` 的父版本原样恢复；009 之后新增的 29 条（批量删除、上传队列、AI 识别）以当前 `en.json` 为源补译。`language.ts` 仍是语言列表唯一真相来源；`LanguageSelector` 与 AI 确认框下拉已动态读取该列表。唯一需要同步扩宽的硬编码类型是 `browserAi.ts` 的 `TargetLang`（现为 `"en" | "es" | "zh"`）。不恢复 `de-DE`、`pt-PT`，不改英语 / 西班牙语 / 简体中文文案。宪法技术规范已同步为 6 语。

## 技术上下文

**语言/版本**: TypeScript（Next.js App Router，运行于 Cloudflare Workers）

**主要依赖**:
- `accept-language ^3.0.20`（HTTP Accept-Language 头解析）
- 无第三方 i18n 框架；自定义 `t(lang, key)` 函数

**存储**: 无持久化存储（翻译文件为静态 JSON，构建时打包）

**测试**: Vitest（`language.test.ts`、`i18n.test.ts`、`LanguageSelector.test.tsx`、`ImageAiMetaSection.test.tsx`、`browserAi.test.ts` 已存在）

**目标平台**: Cloudflare Workers（open-next）

**项目类型**: Web 应用（Next.js App Router）

**性能目标**: 恢复 3 个 JSON 后构建与运行时无明显回归；语言切换一次点击完成且无错误页（规格 SC-002）

**约束**:
- 恢复语言：`fr`、`ja`、`zh-TW`
- 保持下线：`de-DE`、`pt-PT`
- 历史 79 条译文的键值必须与 `dc57f28^` 对应文件解析后完全一致，不得改写；允许因追加新键而重写整个 JSON 文件
- 新 29 条必须以当前英语为唯一源，保留 `{count}` 占位符
- 不修改路由结构（`src/app/[lang]/`）
- 不修改 `LanguageSelector.tsx`（动态读取 `supportedLanguages`）
- 不修改 `en.json` / `es.json` / `zh.json`

**规模/范围**: 恢复 3 个 JSON + 补 29 条译文；修改 `language.ts`、`i18n.ts`、`browserAi.ts`；更新相关测试

## 宪法检查

*门控：Phase 0 研究前必须通过。Phase 1 设计后重新检查。*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. 语言规范 | ✅ 通过 | 所有产物使用简体中文 |
| II. 上下文优先 | ✅ 通过 | 已读 README、规格、009 计划、`language.ts` / `i18n.ts` / `browserAi.ts` 源码 |
| III. 精准手术式修改 | ✅ 通过 | 只恢复 3 种语言及相关配置 / 类型 / 测试；不触碰路由、切换器组件、已保留语言文案 |
| IV. 简洁优先 | ✅ 通过 | 无新抽象；`TargetLang` 直接对齐 `LangKey`，不另建语言表 |
| V. 质量门控 | ✅ 通过 | 检查点：`pnpm tsc --noEmit`、`pnpm test`、三语文案与 `en.json` 键集一致、历史 79 条与 `dc57f28^` 一致 |

**宪法技术规范对照**：国际化列表与本功能一致：`en`、`es`、`fr`、`ja`、`zh`、`zh-TW`。

**违规**: 无

## 项目结构

### 文档（本功能）

```text
specs/012-restore-i18n-locales/
├── plan.md          # 本文件
├── research.md      # Phase 0 输出
├── data-model.md    # Phase 1 输出
├── quickstart.md    # Phase 1 输出
├── contracts/
│   └── locale-contract.md
└── tasks.md         # Phase 2 输出（/speckit-tasks 生成，非本命令）
```

### 源代码（仓库根）

```text
src/
├── lib/
│   ├── language.ts                 # 【修改】恢复 fr / ja / zh-TW 常量、LangKey、supportedLanguages
│   ├── language.test.ts            # 【修改】补恢复语言匹配与 de/pt 仍无效的断言
│   ├── i18n.ts                     # 【修改】import 并注册 fr / ja / zh-TW
│   ├── i18n.test.ts                # 【修改】键集对齐 + 恢复语言可读
│   ├── browserAi.ts                # 【修改】TargetLang 对齐 LangKey，补 OUTPUT_LANG_NAME
│   └── browserAi.test.ts           # 【修改】覆盖恢复语言的 prompt 语言名（如需要）
├── locales/
│   ├── en.json                     # 不改（英语源）
│   ├── es.json                     # 不改
│   ├── zh.json                     # 不改
│   ├── fr.json                     # 【恢复+补译】历史 79 条 + 新 29 条
│   ├── ja.json                     # 【恢复+补译】
│   └── zh-TW.json                  # 【恢复+补译】
└── components/
    ├── LanguageSelector.tsx        # 无需修改
    ├── LanguageSelector.test.tsx   # 无需修改（按 supportedLanguages.length 断言）
    ├── ImageAiMetaSection.tsx      # 原则上无需修改（下拉已 map supportedLanguages）
    └── ImageAiMetaSection.test.tsx # 【修改】选项数为 6；可用 fr / ja / zh-TW 作为 pageLang
```

**结构决策**：沿用现有单仓 `src/` 布局。不新增目录。文案仍是每种语言一个扁平 JSON。`de-DE.json` / `pt-PT.json` 不恢复。

## 复杂度跟踪

> 无宪法违规，本节留空。

## Phase 1 后宪法复查

| 原则 | 状态 | 说明 |
|------|------|------|
| I. 语言规范 | ✅ 通过 | plan / research / data-model / contracts / quickstart 均为简体中文 |
| II. 上下文优先 | ✅ 通过 | 设计依据源码而非 009 过时假设；已发现 `TargetLang` 硬编码 |
| III. 精准手术式修改 | ✅ 通过 | `browserAi.ts` 的改动可直接追溯到 FR-011；不重构 AI 识别流程 |
| IV. 简洁优先 | ✅ 通过 | `TargetLang = LangKey`，不引入第二套语言配置 |
| V. 质量门控 | ✅ 通过 | quickstart 给出可运行验证步骤 |

**违规**: 无
