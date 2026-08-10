# 实现计划：简化多语言支持

**分支**: `009-simplify-i18n-locales` | **日期**: 2026-08-10 | **规格**: [spec.md](./spec.md)

**输入**: 功能规格 `specs/009-simplify-i18n-locales/spec.md`

## 摘要

将项目支持的语言从 8 种（en、es、fr、de-DE、pt-PT、ja、zh、zh-TW）精简为 3 种（en、es、zh）。变更涉及：删除 5 个翻译 JSON 文件、更新语言配置模块（`language.ts`）、更新翻译加载模块（`i18n.ts`），无需修改路由结构或 UI 组件（`LanguageSelector.tsx` 动态读取 `supportedLanguages`，自动适配）。

## 技术上下文

**语言/版本**: TypeScript（Next.js App Router，运行于 Cloudflare Workers）

**主要依赖**:
- `accept-language ^3.0.20`（HTTP Accept-Language 头解析）
- 无第三方 i18n 框架；自定义 `t(lang, key)` 函数

**存储**: 无持久化存储（翻译文件为静态 JSON，构建时打包）

**测试**: Vitest（`LanguageSelector.test.tsx` 已存在）

**目标平台**: Cloudflare Workers（open-next）

**项目类型**: Web 应用（Next.js App Router）

**性能目标**: 构建产物体积减小（移除 5 个 JSON 文件）；运行时无影响

**约束**:
- 保留语言：`en`、`es`、`zh`
- 移除语言：`fr`、`de-DE`、`pt-PT`、`ja`、`zh-TW`
- 不修改路由结构（`src/app/[lang]/`）
- 不修改 UI 组件（动态读取配置）

**规模/范围**: 3 个核心文件修改 + 5 个 JSON 文件删除

## 宪法检查

*门控：Phase 0 研究前必须通过。Phase 1 设计后重新检查。*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. 语言规范 | ✅ 通过 | 所有产物使用简体中文 |
| II. 上下文优先 | ✅ 通过 | 已读取 README + 相关源文件 |
| III. 精准手术式修改 | ✅ 通过 | 只改动 3 个文件，删除 5 个文件；不触碰路由、组件、其他逻辑 |
| IV. 简洁优先 | ✅ 通过 | 无新增抽象，纯删减操作 |
| V. 质量门控 | ✅ 通过 | 有可验证检查点（构建 + 测试） |

**宪法技术规范对照**：宪法 §技术规范 列出 `ja`、`de-DE`、`fr`、`pt-PT` 为支持语言，本功能将更新实现，宪法文档记录的语言列表需在完成后由用户决定是否同步修订（本任务不直接修改宪法）。

**违规**: 无

## 项目结构

### 文档（本功能）

```text
specs/009-simplify-i18n-locales/
├── plan.md          # 本文件
├── research.md      # Phase 0 输出
├── data-model.md    # Phase 1 输出
├── quickstart.md    # Phase 1 输出
└── tasks.md         # Phase 2 输出（/speckit.tasks 生成，非本命令）
```

### 源代码（仓库根）

```text
src/
├── lib/
│   ├── language.ts          # 【修改】移除 fr/de-DE/pt-PT/ja/zh-TW 常量、类型、配置
│   └── i18n.ts              # 【修改】移除对应 JSON import 和 locales 映射条目
├── locales/
│   ├── en.json              # 保留
│   ├── es.json              # 保留
│   ├── zh.json              # 保留
│   ├── fr.json              # 【删除】
│   ├── de-DE.json           # 【删除】
│   ├── pt-PT.json           # 【删除】
│   ├── ja.json              # 【删除】
│   └── zh-TW.json           # 【删除】
└── components/
    └── LanguageSelector.tsx  # 无需修改（动态读取 supportedLanguages）

src/components/LanguageSelector.test.tsx  # 可能需要更新测试用例中的语言列表
```

**结构决策**：无新增目录或文件。所有变更为减法操作（删除文件、收窄类型定义、缩短数组）。

## 复杂度跟踪

> 无宪法违规，本节留空。
