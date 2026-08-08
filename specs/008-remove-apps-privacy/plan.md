# 实施计划：移除小游戏导航与隐私政策页面

**分支**: `008-remove-apps-privacy` | **日期**: 2026-08-08 | **规格**: [spec.md](./spec.md)

**输入**: 功能规格来自 `specs/008-remove-apps-privacy/spec.md`

## 摘要

移除两个历史遗留功能模块：

1. **小游戏导航功能**（`/apps` 路由）：删除专属路由页、游戏详情路由、游戏组件链（GameGrid/GameCard/GameCoverPlaceholder）及游戏数据文件；并从 `SiteHeader` 中手术式移除 Apps 导航入口及其专属 i18n 键。
2. **隐私政策页面**（`/privacy` 路由）：删除路由页及专属隐私数据文件。

所有共享文件（SiteHeader、SiteFooter、i18n 工具、language 工具）保留完整。

---

## 技术上下文

**语言/版本**: TypeScript 5.x / React 19 / Next.js 15（App Router）

**主要依赖**: Next.js App Router、react-icons（`io5` 子包中的 `IoAppsSharp`）、i18n 自研工具（`src/lib/i18n.ts`）

**存储**: 无（本次变更不涉及数据库）

**测试**: 项目内有 Vitest 单元测试（`.test.tsx` 文件），本次删除游戏组件时需一并删除其测试文件

**目标平台**: Web（Next.js SSR/SSG，全语言路由 `[lang]`）

**项目类型**: Web 应用

**性能目标**: 本次为代码删除，目标是减少构建产物体积

**约束**: 删除后 `tsc` 类型检查和 `next build` 必须全部通过；不得破坏其它功能页面

**规模/范围**:
- 删除文件：11 个（3 路由页 + 3 组件 + 3 测试 + 2 数据文件）
- 修改文件：9 个（1 SiteHeader + 8 locale JSON）

---

## Constitution Check

*关卡：Phase 0 研究前必须通过。Phase 1 设计后重新检查。*

| 检查项 | 状态 | 说明 |
|---|---|---|
| 手术式修改原则（只改必要部分） | ✅ 通过 | SiteHeader 仅删除 Apps 相关 6 行；locale 文件仅删除专属键 |
| 不破坏共享文件 | ✅ 通过 | SiteHeader/SiteFooter/i18n/language 均保留完整 |
| 类型安全 | ✅ 通过 | 删除 locale 键后 `en.json` 为类型基准，其它语言同步修改 |
| 构建验证 | ✅ 通过（需执行） | 变更后必须运行 `next build` 验证 |
| 无残留引用 | ✅ 通过（需执行） | 删除后需搜索确认无孤立 import |

*Phase 1 后复查：无新设计引入，所有修改均为删除操作，Constitution Check 保持通过。*

---

## 项目结构

### 文档（本功能）

```text
specs/008-remove-apps-privacy/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
└── checklists/
    └── requirements.md  # 规格质量检查清单
```

### 源代码（仓库根目录）

```text
src/
├── app/
│   └── [lang]/
│       ├── apps/
│       │   └── page.tsx              ← 【删除】整个 apps/ 目录
│       ├── games/
│       │   └── [game]/
│       │       └── page.tsx          ← 【删除】整个 games/ 目录
│       └── privacy/
│           └── page.tsx              ← 【删除】整个 privacy/ 目录
├── components/
│   ├── SiteHeader.tsx                ← 【手术修改】移除 IoAppsSharp import 及 /apps 链接
│   ├── GameGrid.tsx                  ← 【删除】
│   ├── GameGrid.test.tsx             ← 【删除】
│   ├── GameCard.tsx                  ← 【删除】
│   ├── GameCard.test.tsx             ← 【删除】
│   ├── GameCoverPlaceholder.tsx      ← 【删除】
│   └── GameCoverPlaceholder.test.tsx ← 【删除】
├── data/
│   ├── games.ts                      ← 【删除】
│   └── privacy.ts                    ← 【删除】
└── locales/
    ├── en.json                       ← 【手术修改】删除 10 个专属键
    ├── zh.json                       ← 【手术修改】同步删除相同键
    ├── zh-TW.json                    ← 【手术修改】同步删除
    ├── ja.json                       ← 【手术修改】同步删除
    ├── fr.json                       ← 【手术修改】同步删除
    ├── es.json                       ← 【手术修改】同步删除
    ├── de-DE.json                    ← 【手术修改】同步删除
    └── pt-PT.json                    ← 【手术修改】同步删除
```

**结构决策**：本次为纯删除任务，不新增任何目录。遵循项目现有的 Next.js App Router 路由结构和 `src/` 单项目布局。

---

## 复杂度跟踪

> Constitution Check 无违规，本节无需填写。
