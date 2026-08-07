---

description: "006-test-suite-setup 特性任务清单"
---

# Tasks: 项目测试体系建设（单元测试、组件测试与 E2E 冒烟测试）

**Input**: Design documents from `/specs/006-test-suite-setup/`

**Prerequisites**: plan.md（必需）、spec.md（必需）、research.md、data-model.md、contracts/test-commands.md、quickstart.md

**Tests**: 本特性的交付物本身即测试代码与框架配置，不存在"先写测试再实现"的 TDD 倒置；每个测试文件任务即为该故事的实现任务。

**Organization**: 任务按用户故事分组。US1（单元/组件测试）与 US2（e2e）相互独立，可并行；US3（工作流集成与构建隔离）依赖前两者的产物存在。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 所属用户故事（US1/US2/US3）
- 描述中包含确切文件路径

---

## Phase 1: Setup（共享基础设施）

**Purpose**: 安装两套测试框架依赖

- [x] T001 安装单元/组件测试依赖：执行 `pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`，确认全部落入 `package.json` 的 devDependencies（research.md R2）
- [x] T002 [P] 安装 e2e 依赖：执行 `pnpm add -D @playwright/test` 与 `pnpm exec playwright install chromium`（仅安装 chromium，research.md R4）

---

## Phase 2: Foundational（阻塞性前置）

**Purpose**: 测试运行器配置与命令入口，US1/US2 均依赖

**⚠️ CRITICAL**: 本阶段完成前不得开始任何用户故事任务

- [x] T003 在 package.json 的 scripts 中追加 `"test": "vitest run"`、`"test:watch": "vitest"`、`"test:e2e": "playwright test"`（research.md R7，FR-011）
- [x] T004 创建 vitest 配置：根目录 `vitest.config.ts`（`@vitejs/plugin-react`、`environment: "jsdom"`、`setupFiles` 指向 `vitest.setup.ts`、`resolve.alias` 配置 `@ → ./src`）与 `vitest.setup.ts`（`import "@testing-library/jest-dom/vitest"`），中文注释（research.md R1/R2）
- [x] T005 [P] 创建 e2e 配置：根目录 `playwright.config.ts`——单一 project `chromium`（Desktop Chrome 视口，无其他浏览器/设备）、`testDir: "./e2e"`、`baseURL: "http://localhost:7600"`、`workers: 1`、`webServer: { command: "pnpm dev", url: "http://localhost:7600", reuseExistingServer: true, timeout: 120_000 }`，中文注释（research.md R4，FR-007）

**Checkpoint**: 运行器就绪——`pnpm test` 报"无测试文件"而非报错，`pnpm test:e2e` 可发现空 `e2e/` 目录

---

## Phase 3: User Story 1 - 开发者快速验证低复杂度模块的正确性 (Priority: P1) 🎯 MVP

**Goal**: `pnpm test` 一条命令运行全部单元/组件用例并通过，覆盖 2 个 lib 模块 + 6 个必测组件（另 2 个可选组件）

**Independent Test**: 执行 `pnpm test`，全部用例通过、耗时 < 1 分钟（SC-001/SC-002）

### Implementation for User Story 1

> 各用例文件相互独立，最小断言内容以 contracts/test-commands.md「用例覆盖契约」表为准；禁止为排除清单模块（FR-006）编写任何用例；禁止引入除 `vi.mock("next/navigation")` 之外的 mock。

- [x] T006 [P] [US1] 编写 `src/lib/language.test.ts`：`isValidLang` 合法/非法判定；`getTargetLang` 精确匹配、Accept-Language 前缀匹配（如 `zh-CN` 场景）、无法识别时回退 fallback 参数
- [x] T007 [P] [US1] 编写 `src/lib/i18n.test.ts`：`t()` 命中目标语言文案；key 在目标 locale 缺失时回退英文；构造英文也缺失的场景验证回退 key 本身
- [x] T008 [P] [US1] 编写 `src/components/SiteFooter.test.tsx`：渲染站点名称（`t(lang, "siteName")` 结果）与当前年份
- [x] T009 [P] [US1] 编写 `src/components/GameCoverPlaceholder.test.tsx`：背景色样式、引擎标签文本、`aria-label` 为游戏名
- [x] T010 [P] [US1] 编写 `src/components/GameGrid.test.tsx`：按 games 数组长度渲染对应数量卡片（可引用 `src/data/games.ts` 的真实数据或少量构造数据）
- [x] T011 [P] [US1] 编写 `src/components/GameCard.test.tsx`：名称/描述渲染、标签最多渲染 3 个、详情链接 href 为 `/{lang}/games/{id}/`、外链按钮指向 `game.url`（`next/link` 不 mock，research.md R3）
- [x] T012 [P] [US1] 编写 `src/components/MarkdownContent.test.tsx`：普通 markdown 渲染为 HTML 元素；含 `<script>` 注入的内容被净化（断言容器内无 script 元素/恶意文本）
- [x] T013 [P] [US1] 编写 `src/components/ImagesPagination.test.tsx`：`total ≤ pageSize` 返回 null；页码窗口含首尾页与省略号；首页时"上一页"禁用、末页时"下一页"禁用；点击页码触发 `onPageChange(页码)`；page 越界收敛到合法范围
- [x] T014 [P] [US1] （可选）编写 `src/components/LanguageSelector.test.tsx`：渲染全部 8 个语言选项且当前语言选中；切换选项触发桩 `router.push("/{新语言}/{pathSuffix}")`——仅允许文件内 `vi.mock("next/navigation")` 轻量桩（FR-005）
- [x] T015 [P] [US1] （可选）编写 `src/components/ImageSearchBar.test.tsx`：输入关键词提交触发 `router.push("/{lang}?q=…")`；空输入提交触发 `router.push("/{lang}")`——同样仅限轻量路由桩（FR-005）
- [x] T016 [US1] 运行 `pnpm test` 验证：全部用例通过、退出码 0、耗时 < 1 分钟；若 T014/T015 因 mock 超出轻量范畴而放弃，在对应位置删除文件并保持其余全绿（SC-001/SC-002，Edge Case 处理）

**Checkpoint**: US1 独立可用——`pnpm test` 全绿，MVP 达成

---

## Phase 4: User Story 2 - 通过 E2E 冒烟测试确认关键页面可用 (Priority: P2)

**Goal**: `pnpm test:e2e` 在桌面 Chrome 单浏览器上验证 `/en` 首页与 `/en/console/images` 加载及关键元素渲染

**Independent Test**: 启动 dev server 后执行 `pnpm test:e2e`，2 个用例通过、总耗时 < 2 分钟（SC-003）

### Implementation for User Story 2

> 断言严格限定"加载成功 + 关键元素可见"（FR-010），不做数据增删改与多步交互。

- [x] T017 [P] [US2] 编写 `e2e/home.spec.ts`：访问 `/en`，断言头部站点名称链接、导航链接（Home/Channels）、页脚可见；定位器优先使用角色/文本
- [x] T018 [P] [US2] 编写 `e2e/console-images.spec.ts`：先访问 `/en/account/signin`，填写 `#email`（固定测试邮箱 `e2e@weable.test`）并提交，`waitForURL` 至 `/en/console` 完成会话建立；再访问 `/en/console/images`，断言页面加载成功且列表容器存在（表头或空状态提示任一可见即可，兼容测试账号无数据的情况），定位器使用稳定的区域角色/文本而非数据行内容（research.md R5）
- [x] T019 [US2] 运行 `pnpm test:e2e` 验证：仅 1 个 chromium 项目、2 个 spec 通过、退出码 0、总耗时 < 2 分钟；确认 webServer 复用已运行 dev server 时无重复启动（FR-007/FR-008/FR-009，SC-003）

**Checkpoint**: US1 与 US2 均独立可用

---

## Phase 5: User Story 3 - 测试入口融入项目日常工作流 (Priority: P3)

**Goal**: 测试命令开箱即用，且测试设施零侵入生产构建

**Independent Test**: 执行 `pnpm build` 成功且产物不含测试代码（SC-005）

### Implementation for User Story 3

- [x] T020 [P] [US3] 更新 .gitignore：追加 Playwright 产物目录（`playwright-report/`、`test-results/`）与 vitest 覆盖率目录（`coverage/`），保持现有条目不动
- [x] T021 [US3] 运行 `pnpm build` 验证：构建与类型检查通过（e2e/ 与 `*.test.*` 文件不引发错误）、`.next` 页面清单不含测试文件；再执行 `pnpm start` 抽检 `/en` 正常、`/en/account/signin` 返回 404（既有行为回归确认）（FR-012，SC-005，quickstart 第 4 节）

**Checkpoint**: 三个用户故事全部独立可用

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: 完整性核验与最终验收

- [x] T022 排除契约核验：确认仓库中不存在针对 contracts/test-commands.md「排除契约」清单 14 个模块的任何测试文件（`ls src/lib/*.test.* src/components/*.test.*` 比对清单，FR-006）
- [x] T023 按 specs/006-test-suite-setup/quickstart.md 全流程回归：`pnpm test`、`pnpm test:e2e`、`pnpm build` 三组命令及其预期结果逐项核对，含 SC-004 回归防护抽检（临时破坏 `t()` 确认用例失败后还原）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，T001/T002 可并行
- **Foundational (Phase 2)**: T003 依赖 T001+T002 完成；T004 依赖 T001；T005 依赖 T002
- **US1 (Phase 3)**: 依赖 T003、T004
- **US2 (Phase 4)**: 依赖 T003、T005；与 US1 无相互依赖，可并行
- **US3 (Phase 5)**: 依赖 US1、US2 的产物存在（验证构建隔离需要测试文件就位）
- **Polish**: 依赖全部用户故事完成

### User Story Dependencies

- **US1 (P1)**: Foundational 完成后即可开始，不依赖其他故事
- **US2 (P2)**: Foundational 完成后即可开始，与 US1 完全独立
- **US3 (P3)**: 验证型故事，需要 US1/US2 的文件产物作为验证对象

### Within Each User Story

- 用例编写任务（T006–T015、T017–T018）均为独立文件，可并行
- 每个故事以运行验证任务（T016/T019）收尾

### Parallel Opportunities

- T001 ∥ T002；T004 ∥ T005
- US1 内 T006–T015 最多 10 个任务并行（不同文件）
- US2 内 T017 ∥ T018
- US1 整阶段 ∥ US2 整阶段（双人协作时）

---

## Parallel Example: User Story 1

```bash
# 全部用例文件可同时开工（互不依赖）:
Task: "编写 src/lib/language.test.ts"
Task: "编写 src/lib/i18n.test.ts"
Task: "编写 src/components/SiteFooter.test.tsx"
Task: "编写 src/components/GameCoverPlaceholder.test.tsx"
Task: "编写 src/components/GameGrid.test.tsx"
Task: "编写 src/components/GameCard.test.tsx"
Task: "编写 src/components/MarkdownContent.test.tsx"
Task: "编写 src/components/ImagesPagination.test.tsx"
# 最后统一运行 pnpm test 验证（T016）
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1 Setup（T001 即可启动 US1，T002 可延后）
2. 完成 Phase 2 中 T003、T004
3. 完成 Phase 3 全部任务
4. **STOP and VALIDATE**: `pnpm test` 全绿且 < 1 分钟
5. MVP 交付，可先行合入

### Incremental Delivery

1. Setup + Foundational → 运行器就绪
2. US1 → `pnpm test` 独立验证 → 交付（MVP）
3. US2 → `pnpm test:e2e` 独立验证 → 交付
4. US3 → `pnpm build` 隔离验证 → 交付
5. Polish → quickstart 全流程回归

### Parallel Team Strategy

1. 团队共同完成 Setup + Foundational
2. 开发者 A：US1（10 个并行用例任务）；开发者 B：US2（2 个并行用例任务）
3. US3 与 Polish 由任一开发者在两者完成后串行执行

---

## Notes

- [P] 任务 = 不同文件、无依赖
- T014/T015 为 FR-005 可选项：若实现中发现路由桩超出"单文件 vi.mock"轻量范畴，直接放弃该用例并在 T016 中记录，不得升级为复杂 mock
- 禁止修改任何现有业务源码（宪法 III）；唯一允许触碰的既有文件为 `package.json`（scripts + devDependencies）与 `.gitignore`
- 每个任务或逻辑组完成后提交；在每个 Checkpoint 处可独立验证故事
- 避免：为排除清单模块补测试、引入覆盖率门槛、接入 CI、增加浏览器项目
