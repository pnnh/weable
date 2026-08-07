# Implementation Plan: 项目测试体系建设（单元测试、组件测试与 E2E 冒烟测试）

**Branch**: `006-test-suite-setup` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-test-suite-setup/spec.md`

## Summary

为 Weable 项目引入两层测试能力：

1. **单元/组件测试**（vitest，用户指定）：覆盖 `src/lib` 中 2 个纯函数模块与 `src/components` 中 6 个纯渲染组件（另 2 个仅需轻量路由桩的组件为可选覆盖）；严格排除依赖数据库、文件系统、网络请求或复杂交互状态的模块，不引入复杂 mock。
2. **E2E 冒烟测试**（Playwright，用户指定）：仅桌面 Chrome 单浏览器项目，覆盖 `/en` 首页与 `/en/console/images` 两个页面，断言限定为"页面加载成功 + 关键元素可见"；console 页面用例通过既有开发模拟登录页（`/en/account/signin`）建立会话。

技术方案核心：vitest + @testing-library/react（jsdom 环境，复用 tsconfig `@/*` 别名）就近放置测试文件；Playwright 单 `chromium` 项目 + `webServer` 自动拉起（复用已运行的 dev server）。测试依赖全部为 devDependencies，不影响 `next build` 产物。

## Technical Context

**Language/Version**: TypeScript 5（strict）、React 19.2.4、Node ≥ 20（pnpm@10.33）

**Primary Dependencies**: Next.js 16.2.4（App Router + Turbopack dev）、react-icons、marked + sanitize-html、accept-language；新增 devDependencies：vitest、@vitejs/plugin-react、jsdom、@testing-library/react（≥16，React 19 兼容）、@testing-library/jest-dom、@playwright/test

**Storage**: 不涉及（测试设施本身无持久化；e2e 复用现有 `.data/weable.db`）

**Testing**: vitest（单元/组件）、Playwright Test（e2e）

**Target Platform**: 本地开发机（macOS/Linux），e2e 仅桌面 Chrome

**Project Type**: Web 应用（Next.js App Router，单包 + pnpm workspace 模式）

**Performance Goals**: 单元/组件测试全量运行 < 1 分钟（SC-001）；e2e 套件总耗时 < 2 分钟（SC-003）

**Constraints**: 测试代码与配置不得进入生产构建产物（FR-012）；不得为复杂依赖模块编写用例或引入复杂 mock（FR-006）；e2e 仅单浏览器单项目（FR-007）

**Scale/Scope**: 2 个 lib 模块 + 6~8 个组件的用例；2 个 e2e 页面用例

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 宪法条款 | 评估 | 结论 |
|----------|------|------|
| I. 语言规范 | 所有治理产物与代码注释使用简体中文，技术标识符保留英文 | ✅ 通过 |
| II. 上下文优先 | 已通读 spec、README 相关背景及全部待测源码后制定方案 | ✅ 通过 |
| III. 精准手术式修改 | 仅新增测试文件与配置、`package.json` 追加 scripts 与 devDependencies，不触碰现有业务源码 | ✅ 通过 |
| IV. 简洁优先 | 最小依赖集（不引入 user-event 之外的交互库、不引入覆盖率工具、不接入 CI）；组件测试不 mock 业务逻辑 | ✅ 通过 |
| V. 质量门控 | 每条 FR 均有 quickstart 中可执行的验证命令与预期结果 | ✅ 通过 |
| 技术规范·新增依赖必要性评估 | vitest/@testing-library/Playwright 为用户明确指定；现有依赖中无任何测试能力可替代 | ✅ 通过（用户指定 + 无替代） |

**Gate 结论**：无违规，无需 Complexity Tracking。

## Project Structure

### Documentation (this feature)

```text
specs/006-test-suite-setup/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出（本特性无数据实体，记录 N/A 结论）
├── quickstart.md        # Phase 1 输出
├── contracts/
│   └── test-commands.md # Phase 1 输出：测试命令契约
└── tasks.md             # Phase 2 输出（/speckit.tasks 生成）
```

### Source Code (repository root)

```text
vitest.config.ts                      # vitest 配置（jsdom、@/* 别名、react 插件）
vitest.setup.ts                       # @testing-library/jest-dom 注册
playwright.config.ts                  # 单 chromium 项目、baseURL、webServer
e2e/
├── home.spec.ts                      # /en 首页冒烟用例
└── console-images.spec.ts            # /en/console/images 冒烟用例（含模拟登录）

src/
├── lib/
│   ├── language.test.ts              # language 模块用例
│   └── i18n.test.ts                  # i18n 模块用例
└── components/
    ├── SiteFooter.test.tsx
    ├── GameCoverPlaceholder.test.tsx
    ├── GameGrid.test.tsx
    ├── GameCard.test.tsx
    ├── MarkdownContent.test.tsx
    ├── ImagesPagination.test.tsx
    ├── LanguageSelector.test.tsx     # 可选：仅 vi.mock next/navigation
    └── ImageSearchBar.test.tsx       # 可选：仅 vi.mock next/navigation
```

**Structure Decision**: 采用"就近共置"布局——单元/组件测试与被测源码同目录（`*.test.ts(x)`）。理由：① 目标文件全部位于 `src/lib` 与 `src/components`，不在 `src/app` 内，不会被 App Router 误识别为路由；② 共置降低查找成本，Next.js 构建自动忽略 `.test.` 文件。E2E 独立于 `src` 放在根目录 `e2e/`，与 Playwright `testDir` 对应，避免被 Next 编译。

## Complexity Tracking

> 宪法检查无违规，本节不适用。
