---

description: "移除小游戏导航与隐私政策页面 — 任务清单"
---

# 任务清单：移除小游戏导航与隐私政策页面

**输入**: 设计文档来自 `specs/008-remove-apps-privacy/`

**前置条件**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

**测试**: 本功能规格未要求 TDD，不生成测试任务。验证方式参见 quickstart.md。

**组织**: 任务按用户场景（US1/US2/US3）分组，每个场景可独立实施和验证。

## 格式：`[ID] [P?] [Story] 描述`

- **[P]**: 可并行执行（操作不同文件，无互相依赖）
- **[Story]**: 所属用户场景（US1/US2/US3）
- 每个任务包含精确文件路径

---

## Phase 1：准备阶段（共享基础设施）

**目的**: 确认待操作文件存在，理解当前代码状态

- [X] T001 确认以下文件均存在且内容与 research.md 一致：`src/components/SiteHeader.tsx`（第 5 行 IoAppsSharp import，第 34-40 行 /apps Link 块）
- [X] T002 [P] 确认以下文件存在：`src/app/[lang]/apps/page.tsx`、`src/app/[lang]/games/[game]/page.tsx`、`src/app/[lang]/privacy/page.tsx`
- [X] T003 [P] 确认以下文件存在：`src/data/games.ts`、`src/data/privacy.ts`、`src/components/GameGrid.tsx`、`src/components/GameCard.tsx`、`src/components/GameCoverPlaceholder.tsx`

---

## Phase 2：基础清理（阻塞性前置任务）

**目的**: 本次变更无跨场景共享的"基础设施"依赖，Phase 2 直接进入各用户场景

**⚠️ 说明**: 三个用户场景（US1/US2/US3）互相独立，可并行实施。无需等待其它场景完成。

---

## Phase 3：用户场景 1 — 移除小游戏导航入口（优先级：P1）🎯 MVP

**目标**: 从 SiteHeader 中手术式移除 `/apps` 导航图标入口，使其从所有页面顶栏消失

**独立测试**: 启动开发服务器，访问 `/zh/`，顶部导航条右侧无 Apps 格子图标（IoAppsSharp）；`grep -n "IoAppsSharp\|/apps" src/components/SiteHeader.tsx` 无输出

### 实施 — 用户场景 1

- [X] T004 [US1] 从 `src/components/SiteHeader.tsx` 第 5 行删除 `import { IoAppsSharp } from "react-icons/io5";` 整行
- [X] T005 [US1] 从 `src/components/SiteHeader.tsx` 删除第 34-40 行的 `/apps` Link 块（含 `IoAppsSharp size={20}` 图标的完整 `<Link>` 元素）

**检查点**: 执行 `grep -n "IoAppsSharp\|/apps" src/components/SiteHeader.tsx` → 无输出。手动访问任意页面确认导航条无 Apps 图标，布局无错位。

---

## Phase 4：用户场景 2 — 移除游戏相关页面与数据（优先级：P1）

**目标**: 删除 `/apps` 和 `/games/[game]` 路由页面、所有游戏组件、测试文件及游戏数据文件，并清理相关 i18n 键

**独立测试**: 执行 `npx tsc --noEmit` 无错误；`grep -r "from.*games\|GameGrid\|GameCard\|GameCoverPlaceholder" src/ --include="*.ts" --include="*.tsx"` 无输出；访问 `/{lang}/apps` 和 `/{lang}/games/atetris` 返回 404

### 实施 — 用户场景 2

- [X] T006 [US2] 删除 `src/app/[lang]/apps/page.tsx`（含整个 `src/app/[lang]/apps/` 目录）
- [X] T007 [US2] 删除 `src/app/[lang]/games/[game]/page.tsx`（含整个 `src/app/[lang]/games/` 目录）
- [X] T008 [US2] 删除 `src/data/games.ts`
- [X] T009 [P] [US2] 删除 `src/components/GameGrid.tsx` 和 `src/components/GameGrid.test.tsx`
- [X] T010 [P] [US2] 删除 `src/components/GameCard.tsx` 和 `src/components/GameCard.test.tsx`
- [X] T011 [P] [US2] 删除 `src/components/GameCoverPlaceholder.tsx` 和 `src/components/GameCoverPlaceholder.test.tsx`
- [X] T012 [US2] 从 `src/locales/en.json` 删除以下 12 个键：`siteTagline`、`siteDescription`、`playGame`、`learnMore`、`backToHome`、`allGames`、`features`、`about`、`engine`、`controls`、`gameDetailTitle`、`apps`
- [X] T013 [P] [US2] 从 `src/locales/zh.json` 删除与 T012 相同的 12 个键
- [X] T014 [P] [US2] 从 `src/locales/zh-TW.json` 删除与 T012 相同的 12 个键
- [X] T015 [P] [US2] 从 `src/locales/ja.json` 删除与 T012 相同的 12 个键
- [X] T016 [P] [US2] 从 `src/locales/fr.json` 删除与 T012 相同的 12 个键
- [X] T017 [P] [US2] 从 `src/locales/es.json` 删除与 T012 相同的 12 个键
- [X] T018 [P] [US2] 从 `src/locales/de-DE.json` 删除与 T012 相同的 12 个键
- [X] T019 [P] [US2] 从 `src/locales/pt-PT.json` 删除与 T012 相同的 12 个键

**说明**: T012（修改 en.json）须先完成，它是 `LocaleMessages` 类型基准；T013-T019 可在 T012 完成后并行执行。T006-T008 须先于 locale 清理完成，确保 tsc 验证时无残留 import。

**检查点**: 执行 `npx tsc --noEmit` → 无错误。执行 `grep -r "from.*games\|GameGrid\|GameCard\|GameCoverPlaceholder" src/ --include="*.ts" --include="*.tsx"` → 无输出。

---

## Phase 5：用户场景 3 — 移除隐私政策页面与数据（优先级：P2）

**目标**: 删除 `/privacy` 路由页面及其专属数据文件

**独立测试**: 执行 `grep -r "from.*privacy" src/ --include="*.ts" --include="*.tsx"` 无输出；访问 `/{lang}/privacy` 返回 404

### 实施 — 用户场景 3

- [X] T020 [US3] 删除 `src/app/[lang]/privacy/page.tsx`（含整个 `src/app/[lang]/privacy/` 目录）
- [X] T021 [US3] 删除 `src/data/privacy.ts`

**检查点**: 执行 `grep -r "from.*privacy" src/ --include="*.ts" --include="*.tsx"` → 无输出。

---

## Phase 6：收尾与全局验证

**目的**: 跨场景的全量验证，确保整体构建成功、无残留引用、UI 无异常

- [X] T022 执行 `npx tsc --noEmit` 确认类型检查全量通过（零错误）
- [X] T023 执行 `npm run build` 确认 Next.js 生产构建成功（零错误）
- [X] T024 [P] 执行 quickstart.md 中"检查点 A"：`grep -r "from.*games\|from.*privacy\|GameGrid\|GameCard\|GameCoverPlaceholder" src/ --include="*.ts" --include="*.tsx"` → 无输出
- [X] T025 [P] 执行 quickstart.md 中"检查点 B/C"：确认 SiteHeader.tsx 无 IoAppsSharp/apps 引用；locale 文件无游戏专属键
- [X] T026 [P] 手动验证：启动 `npm run dev`，访问 `/zh/`、`/zh/channels`、`/zh/console`，确认页面正常、导航条无 Apps 图标、布局无错位

---

## 依赖关系与执行顺序

### 阶段依赖

- **Phase 1（准备）**: 无依赖，立即开始
- **Phase 3/4/5（用户场景）**: 依赖 Phase 1 完成；三个场景互相独立，可并行
- **Phase 6（收尾）**: 依赖 Phase 3、4、5 全部完成

### 场景内依赖

**US1（Phase 3）**:
- T004 → T005（先删 import 再删 JSX 块，逻辑上同一文件顺序执行）

**US2（Phase 4）**:
- T006/T007/T008（删除路由和数据文件）→ T012（修改 en.json，tsc 类型基准）→ T013-T019（其余 locale 文件，可并行）
- T009/T010/T011（删除组件及测试，可并行）与上述路径无依赖，可同步进行

**US3（Phase 5）**:
- T020 → T021（先删路由页再删数据文件，避免短暂引用孤立）

### 并行机会

- Phase 3（US1）、Phase 4（US2）、Phase 5（US3）可由三名开发者同时推进
- Phase 4 内：T009/T010/T011 可并行；T013-T019 在 T012 完成后可并行
- Phase 6 内：T024/T025/T026 可并行

---

## 并行执行示例：US2（最复杂场景）

```bash
# 第一批：删除路由和数据文件（顺序）
Task: "T006 删除 src/app/[lang]/apps/ 目录"
Task: "T007 删除 src/app/[lang]/games/ 目录"
Task: "T008 删除 src/data/games.ts"

# 第二批：并行删除组件（T006-T008 完成后）
Task: "T009 删除 GameGrid.tsx 和 GameGrid.test.tsx"
Task: "T010 删除 GameCard.tsx 和 GameCard.test.tsx"
Task: "T011 删除 GameCoverPlaceholder.tsx 和 GameCoverPlaceholder.test.tsx"

# 第三批：修改 en.json（T006-T008 完成后，作为 tsc 类型基准）
Task: "T012 从 en.json 删除 12 个游戏专属 i18n 键"

# 第四批：并行同步其余 7 个 locale（T012 完成后）
Task: "T013 zh.json" | Task: "T014 zh-TW.json" | Task: "T015 ja.json"
Task: "T016 fr.json" | Task: "T017 es.json"  | Task: "T018 de-DE.json"
Task: "T019 pt-PT.json"
```

---

## 实施策略

### MVP（仅用户场景 1）

1. 完成 Phase 1：准备
2. 完成 Phase 3（US1）：移除 SiteHeader 中的 Apps 导航入口
3. **停下验证**：顶栏无 Apps 图标 → 对用户可见的核心变更已完成
4. 按需继续 Phase 4/5

### 完整交付

1. Phase 1：准备确认 → 立即开始 Phase 3/4/5（三场景并行）
2. Phase 3（US1）完成：导航入口移除 ✅
3. Phase 4（US2）完成：游戏功能代码清空 ✅
4. Phase 5（US3）完成：隐私功能代码清空 ✅
5. Phase 6：全量构建验证 → 交付

### 单人顺序执行建议

优先级顺序：US1（最小可见变更）→ US2（代码库清理主体）→ US3（隐私清理）→ Phase 6（最终验证）

---

## 备注

- [P] 任务 = 操作不同文件，无互相依赖，可并行
- [Story] 标签将任务与具体用户场景对应，便于追溯
- 所有用户场景均可独立完成和验证
- 每完成一个 Phase 后执行一次 `npx tsc --noEmit` 快速确认
- 最终交付前必须执行 `npm run build` 完整验证
- 参考 quickstart.md 获取完整的验证命令和手动测试场景
