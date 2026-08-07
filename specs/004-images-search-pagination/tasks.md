# Tasks: 控制台图片列表关键词搜索与分页

**Input**: Design documents from `/specs/004-images-search-pagination/`

**Prerequisites**: plan.md（必需）、spec.md（必需）、research.md、data-model.md、contracts/get-images-list-search-pagination.md、quickstart.md

**Tests**: 规格未要求自动化测试（项目无测试基建），不生成测试任务；以 quickstart.md 手工验证场景作为各故事的验收手段。

**Organization**: 任务按用户故事分组，每个故事可独立实现与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[Story]**: 所属用户故事（US1 ~ US4）
- 描述中包含确切文件路径

## Path Conventions

本项目为 Next.js 单体应用：页面/路由位于 `src/app/[lang]/console/`，组件位于 `src/components/`，文案位于 `src/locales/`。

---

## Phase 1: Setup（共享基础设施）

**Purpose**: 环境与验证数据准备（不引入新依赖、无迁移）

- [x] T001 验证本地环境可运行（`pnpm install` + `pnpm dev`），登录控制台并按 specs/004-images-search-pagination/quickstart.md「前置条件」准备验证数据（根目录 ≥45 个直接条目、含 `logo` 关键词条目、部分图片关联/未关联频道、含子条目的目录）

---

## Phase 2: Foundational（阻塞性前置）

**Purpose**: 所有用户故事共享的服务端查询能力与客户端数据源骨架，MUST 全部完成后才能开始任何故事

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 扩展 GET 列表接口：新增可选参数 `q`/`page`/`pageSize`（仅合法 `pageSize` 启用分页，`page` 非法回退 1，`q` trim 后为空视为无搜索；LIKE 参数化绑定且对 `%`/`_`/`\` 转义并附加 `ESCAPE '\'`）、LEFT JOIN channels 取 `channelName`、分页时返回 `total`/`page`/`pageSize`；未传 `pageSize` 时保持全量返回（树展开兼容）——实现契约 specs/004-images-search-pagination/contracts/get-images-list-search-pagination.md，文件 src/app/[lang]/console/api/images/route.ts
- [x] T003 页面 SSR 接入分页搜索：解析 `searchParams` 的 `q`/`page`（非法回退），以 pageSize=20 执行与 T002 同规则的查询（含 channelName join 与 total 统计）；将 items/total/page/q 传入 ImagesBatchToolbar；空态分支细化为"无条目且无搜索条件"才显示引导文案——文件 src/app/[lang]/console/images/page.tsx（依赖 T002）
- [x] T004 [P] 扩展 `ImageEntry` 类型新增可选 `channelName?: string | null` 字段——文件 src/components/ImagesTreeTable.tsx
- [x] T005 数据源上移：以 useState 持有 items（初始 `initialItems`）与视图状态（q/page/total，来自页面新 props），`ImagesTreeTable` 改收 items 状态——为搜索/翻页/就地刷新提供单一数据源，文件 src/components/ImagesBatchToolbar.tsx（依赖 T003、T004；同步调整 T003 中的 props 传递）

**Checkpoint**: 接口与页面已按契约返回分页/搜索数据（每页 20 条），客户端数据源骨架就绪——故事实现可以开始

---

## Phase 3: User Story 1 - 按关键词查找当前目录下的条目 (Priority: P1) 🎯 MVP

**Goal**: 工具栏（与批量按钮同行）提供搜索框，提交后仅显示当前目录标题匹配的直接条目，条件经 URL `q` 表达，清空恢复全量

**Independent Test**: 输入关键词提交 → 仅匹配条目可见且 URL 出现 `?q=…`；清空 → 恢复全量（quickstart 场景 1）

### Implementation for User Story 1

- [x] T006 [P] [US1] 追加搜索相关文案键（搜索框占位符、搜索按钮、无匹配结果提示）至全部 8 个语言文件 src/locales/en.json、src/locales/zh.json、src/locales/zh-TW.json、src/locales/ja.json、src/locales/de-DE.json、src/locales/es.json、src/locales/fr.json、src/locales/pt-PT.json
- [x] T007 [P] [US1] 工具栏行内新增搜索表单（受控输入框 + 提交按钮，与批量按钮同行）：提交时构造 `?parentId=…&q=…&page=1` → `router.replace` 并 fetch 列表接口（pageSize=20）就地更新 items/total/page；清空关键词提交恢复全量视图；结果为空时在表格位置显示"无匹配结果"文案——文件 src/components/ImagesBatchToolbar.tsx（依赖 T005；引用 T006 的文案键）
- [x] T008 [US1] 页面侧将新增 labels 传入工具栏——文件 src/app/[lang]/console/images/page.tsx（依赖 T006、T007）
- [x] T009 [US1] 按 quickstart.md 场景 1 验收 US1（含注入试探 `%' OR '1'='1`、`logo_` 通配符转义、大小写不敏感、空结果提示）

**Checkpoint**: User Story 1 可独立交付：搜索可用、URL 可分享还原、注入输入按普通文本处理

---

## Phase 4: User Story 2 - 分页浏览当前目录条目 (Priority: P2)

**Goal**: 每页 20 条的传统分页（上一页/下一页 + 页码窗口），翻页全程保留搜索条件，URL 同步 `page`

**Independent Test**: ≥45 条目目录仅显示 20 条且分页控件正确；搜索后翻页条件保留；带条件 URL 新标签页还原相同视图（quickstart 场景 2）

### Implementation for User Story 2

- [x] T010 [P] [US2] 追加分页文案键（上一页、下一页、页码 aria 标签）至全部 8 个语言文件 src/locales/*.json（en、zh、zh-TW、ja、de-DE、es、fr、pt-PT）
- [x] T011 [P] [US2] 新增分页控件组件：上一页/下一页按钮 + 页码窗口（首页、尾页、当前页 ±1，缺口省略号，最多 7 元素）、边界禁用、当前页高亮、`total ≤ 20` 不渲染——文件 src/components/ImagesPagination.tsx（引用 T010 的文案键）
- [x] T012 [US2] 工具栏接入分页：翻页保留 `parentId` 与 `q` 仅改 `page` → `router.replace` + fetch 更新 items/page/total；表格下方渲染 ImagesPagination——文件 src/components/ImagesBatchToolbar.tsx（依赖 T007、T011）
- [x] T013 [US2] 按 quickstart.md 场景 2 验收 US2（含非法 `page` 参数回退、URL 分享还原、进入新目录重置、≤20 条不显示控件）

**Checkpoint**: User Story 1 与 2 均可独立工作：搜索 + 分页组合下条件全程保留

---

## Phase 5: User Story 3 - 列表中查看频道归属、文件大小与修改时间 (Priority: P3)

**Goal**: 表格新增频道名称、文件大小（KB/MB）、修改时间三列；未关联频道与目录行相应列显示空

**Independent Test**: 图片行显示频道名/KB 或 MB 大小/修改时间；未关联频道与目录行为空；展开子行同样显示（quickstart 场景 3）

### Implementation for User Story 3

- [x] T014 [P] [US3] 追加列头文案键（频道、文件大小）至全部 8 个语言文件 src/locales/*.json（en、zh、zh-TW、ja、de-DE、es、fr、pt-PT）
- [x] T015 [P] [US3] 表格新增三列：频道名称（`channelName`，null/目录显示空）、文件大小（内联 formatSize：<1MB 显示 KB、≥1MB 显示 MB，数值 ≥100 取整否则保留 1 位小数；目录显示空）、修改时间列头改用 labels（既有 `updated` 键）；表头同步新增两格；展开子行/空目录占位行的 colSpan 随列数调整——文件 src/components/ImagesTreeTable.tsx（依赖 T004；引用 T014 的文案键）
- [x] T016 [US3] 标签透传：页面 batchLabels/dialogLabels 体系追加新列头键并传入工具栏，工具栏转传表格 labels——文件 src/app/[lang]/console/images/page.tsx 与 src/components/ImagesBatchToolbar.tsx（依赖 T014、T015）
- [x] T017 [US3] 按 quickstart.md 场景 3 验收 US3（含展开子行的新列展示与修改后时间更新）

**Checkpoint**: 三个新列在图片行、目录行、展开子行均按规则正确呈现

---

## Phase 6: User Story 4 - 批量操作后列表就地刷新且保留交互状态 (Priority: P4)

**Goal**: 批量设置发布状态/频道确认后，经列表接口就地刷新当前视图数据，不整页刷新、不重置已展开目录

**Independent Test**: 展开子目录并勾选图片 → 批量设置频道确认 → 频道列即时更新、展开保持、无整页刷新（quickstart 场景 4）

### Implementation for User Story 4

- [x] T018 [US4] 重写 handleBatchSuccess：以当前 `parentId`/`q`/`page` fetch 列表接口（pageSize=20）就地替换 items/total（React 按 id key 协调保留 TreeRow 展开状态），清空选择集；fetch 失败时保留操作前数据并沿用既有友好错误提示；移除 `router.refresh()` 调用——文件 src/components/ImagesBatchToolbar.tsx（依赖 T005）
- [x] T019 [US4] 按 quickstart.md 场景 4 验收 US4（含搜索条件下的批量刷新、展开状态保持、选择集清空、失败回退）

**Checkpoint**: 批量操作闭环完成：数据即时准确、交互状态零丢失

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 回归与质量门控

- [x] T020 按 quickstart.md 场景 5 回归验证（树展开/收起不受搜索分页影响、上传/建目录/单图编辑删除无回归、8 语言文案切换正确）
- [x] T021 按 quickstart.md 场景 6 接口级抽查（未登录 401 + JSON、分页字段齐全、树展开路径不传 `pageSize` 时全量兼容）
- [x] T022 运行 `pnpm build` 确认无类型错误，快速走查改动文件无越界修改（宪法 III 精准修改自查）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，立即开始
- **Foundational (Phase 2)**: 依赖 Setup；T002 → T003 → T005（T004 与 T002 并行）——**阻塞所有用户故事**
- **User Stories (Phase 3-6)**: 均依赖 Foundational 完成
  - US1 → US2（US2 复用 US1 的 URL/fetch 管线且需保留 `q`；同文件 ImagesBatchToolbar.tsx 亦要求串行）
  - US3、US4 逻辑上不依赖 US1/US2，但均触碰 toolbar/table/page 同一组文件，建议按 US1 → US2 → US3 → US4 顺序串行执行
- **Polish (Phase 7)**: 依赖全部用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: 仅依赖 Foundational（T002-T005）
- **User Story 2 (P2)**: 依赖 US1（翻页保留搜索条件 + 同一工具栏文件）
- **User Story 3 (P3)**: 仅依赖 Foundational（channelName 数据由 T002/T004 提供），与 US1/US2 无逻辑依赖
- **User Story 4 (P4)**: 仅依赖 Foundational（T005 数据源骨架），与 US1-US3 无逻辑依赖

### Within Each User Story

- 文案键与组件实现可并行（不同文件），页面接线在组件之后
- 每个故事以 quickstart 对应场景验收后方可进入下一故事

### Parallel Opportunities

- Phase 2：T004 [P] 与 T002 并行（不同文件）
- US1：T006 [P]（locales）与 T007 [P]（toolbar）并行
- US2：T010 [P]（locales）与 T011 [P]（新组件）并行
- US3：T014 [P]（locales）与 T015 [P]（table）并行
- 注意：8 个 locale 文件被多个故事先后修改，跨故事的 locale 任务不可并行；ImagesBatchToolbar.tsx 被 T005/T007/T012/T016/T018 先后修改，严格串行

---

## Parallel Example: User Story 1

```bash
# US1 内可并行启动（不同文件）：
Task: "追加搜索相关文案键至 src/locales/*.json（8 个语言文件）"
Task: "工具栏新增搜索表单（src/components/ImagesBatchToolbar.tsx）"
```

## Parallel Example: User Story 3

```bash
# US3 内可并行启动（不同文件）：
Task: "追加列头文案键至 src/locales/*.json（8 个语言文件）"
Task: "表格新增频道/大小/修改时间三列（src/components/ImagesTreeTable.tsx）"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup（T001）
2. 完成 Phase 2: Foundational（T002-T005，阻塞项）
3. 完成 Phase 3: User Story 1（T006-T009）
4. **STOP and VALIDATE**: 按 quickstart 场景 1 独立验收搜索功能
5. 可先行交付/演示 MVP

### Incremental Delivery

1. Setup + Foundational → 服务端分页搜索能力就绪
2. + User Story 1 → 搜索独立验收 → 交付（MVP）
3. + User Story 2 → 搜索 + 分页组合验收 → 交付
4. + User Story 3 → 新列展示验收 → 交付
5. + User Story 4 → 批量就地刷新验收 → 完整功能
6. 每个故事独立增值，不破坏既有能力（树展开、批量操作、上传等）

### Parallel Team Strategy

本功能改动集中于 3 个共享文件（toolbar/table/page），跨故事并行收益有限；建议单人按优先级顺序执行，仅在故事内部利用 [P] 任务并行（locales + 组件）。

---

## Notes

- [P] 任务 = 不同文件、无依赖
- [Story] 标签用于追溯到 spec.md 用户故事
- 本功能无自动化测试要求，各故事以 quickstart.md 场景为验收标准
- 每个任务或逻辑组完成后提交一次 git
- 严守宪法 III：不顺带重构树表格既有展开/选择逻辑，不改动既有硬编码表头（Title/Status）
