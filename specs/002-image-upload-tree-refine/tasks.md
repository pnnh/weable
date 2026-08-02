# Tasks: 控制台图片批量上传与树形列表优化

**Input**: 设计文档来自 `/specs/002-image-upload-tree-refine/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup（共享准备）

**Purpose**: 准备跨用户故事共用的文案与约束键，避免后续实现中出现分散硬编码。

- [X] T001 在 src/locales/en.json 增加批量上传限制与状态提示文案键（最多50张、单张5MB、上传中、数量超限）
- [X] T002 [P] 在 src/locales/zh.json 增加与 src/locales/en.json 对齐的批量上传限制与状态提示文案键
- [X] T003 [P] 在 src/locales/zh-TW.json、src/locales/ja.json、src/locales/de-DE.json、src/locales/es.json、src/locales/fr.json、src/locales/pt-PT.json 增加同名文案键

---

## Phase 2: Foundational（阻塞前置）

**Purpose**: 建立上传与目录上下文的统一基础能力，完成前所有用户故事实现均不可开始。

**⚠️ CRITICAL**: 本阶段完成前，不进行任一用户故事的功能收尾。

- [X] T004 在 src/app/[lang]/console/images/page.tsx 统一生成“当前目录列表URL”与“上传入口URL”（保留 parentId 语义）
- [X] T005 [P] 在 src/components/ImageUploadForm.tsx 定义批量上传共享常量（最大数量50、单文件5MB）并统一前端错误状态结构
- [X] T006 [P] 在 src/app/api/upload/route.ts 定义服务端批量校验共享常量（最大数量50、单文件5MB）与统一错误响应分支
- [X] T007 [P] 在 src/components/ImagesTreeTable.tsx 定义树形缩进步长与左侧控件固定占位常量，作为后续渲染基础

**Checkpoint**: 批量上传限制、目录上下文URL语义、树形占位常量全部具备，可进入用户故事实现。

---

## Phase 3: User Story 1 - 当前目录内批量上传图片 (Priority: P1) 🎯 MVP

**Goal**: 用户可一次选择并上传多张图片，符合数量与大小限制后入库成功。

**Independent Test**: 在根目录或子目录上传2~50张合法图片，提交成功并完成入库。

### Implementation for User Story 1

- [X] T008 [US1] 在 src/components/ImageUploadForm.tsx 将文件选择改为 multiple，并支持读取多文件列表
- [X] T009 [US1] 在 src/components/ImageUploadForm.tsx 实现前端批量校验（至少1张、最多50张、任一文件不超过5MB）
- [X] T010 [US1] 在 src/app/api/upload/route.ts 将单文件处理改为多文件处理（读取 formData.getAll("file")）
- [X] T011 [US1] 在 src/app/api/upload/route.ts 实现服务端批量校验与整批拒绝逻辑（数量、类型、大小）
- [X] T012 [US1] 在 src/app/api/upload/route.ts 实现批量存储与批量入库，返回 ids 数组响应

**Checkpoint**: US1 完成后，批量上传能力可独立演示与验证。

---

## Phase 4: User Story 2 - 维持目录上下文返回列表 (Priority: P1)

**Goal**: 上传成功后回到发起上传时所在目录列表，且保留 parentId 参数并刷新列表。

**Independent Test**: 从 `/en/console/images?parentId=<id>` 进入上传并成功后，返回仍为同一 parentId 的列表页。

### Implementation for User Story 2

- [X] T013 [US2] 在 src/components/ImageUploadForm.tsx 将上传成功跳转从图片编辑页改为当前目录列表URL，并保留 parentId
- [X] T014 [US2] 在 src/app/[lang]/console/images/[imageId]/page.tsx 修正保存后 redirect 逻辑，保持返回列表时可携带 parentId
- [X] T015 [US2] 在 src/app/[lang]/console/images/[imageId]/page.tsx 修正取消按钮与删除区 redirectTo，保持目录上下文一致
- [X] T016 [US2] 在 src/app/[lang]/console/images/page.tsx 校准上传入口链接生成逻辑，确保根目录与子目录两种路径都正确

**Checkpoint**: US2 完成后，上传流程在任意目录层级都不会丢失上下文。

---

## Phase 5: User Story 3 - 树形表格稳定展开目录 (Priority: P2)

**Goal**: 目录展开以树形表格缩进展示，且展开前后行对齐稳定无横向抖动。

**Independent Test**: 连续展开至少两层目录，验证子级缩进一致且同层级列对齐不变化。

### Implementation for User Story 3

- [X] T017 [US3] 在 src/components/ImagesTreeTable.tsx 重构左侧展开控件列为固定宽高占位（含无子项/图片项占位）
- [X] T018 [US3] 在 src/components/ImagesTreeTable.tsx 调整缩进承载方式，确保深层级展开不会挤压后续列
- [X] T019 [US3] 在 src/components/ImagesTreeTable.tsx 校准子级递归渲染的层级缩进规则（父子层级步长一致）
- [X] T020 [US3] 在 src/components/ImagesTreeTable.tsx 统一空目录与加载失败行的缩进与对齐表现

**Checkpoint**: US3 完成后，树形展开在多层目录下具备稳定、可读的结构化展示。

---

## Phase 6: User Story 4 - 清晰反馈上传限制与结果 (Priority: P3)

**Goal**: 用户能在提交前理解限制并在上传中/失败时获得明确反馈。

**Independent Test**: 选择超限文件集时立即提示；选择合法文件集时上传中状态清晰且不可重复提交。

### Implementation for User Story 4

- [X] T021 [US4] 在 src/components/ImageUploadForm.tsx 增加并展示“最多50张、单张5MB”可见限制提示
- [X] T022 [US4] 在 src/components/ImageUploadForm.tsx 优化上传中状态文案与按钮禁用逻辑，防止重复提交
- [X] T023 [US4] 在 src/components/ImageUploadForm.tsx 与 src/app/api/upload/route.ts 对齐错误信息映射，确保前后端提示一致

**Checkpoint**: US4 完成后，上传交互反馈完整，失败可恢复路径明确。

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事回归、一致性检查与发布前收敛。

- [X] T024 在 src/app/[lang]/console/images/page.tsx 与 src/components/ImagesTreeTable.tsx 进行交互回归清理（去除因改造产生的无用分支）
- [ ] T025 [P] 按 specs/002-image-upload-tree-refine/quickstart.md 执行手工验证并记录结果到 specs/002-image-upload-tree-refine/quickstart.md
- [X] T026 [P] 运行 pnpm build 并修复与本功能相关的构建问题（如有）

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup（Phase 1）: 无依赖，可立即开始。
- Foundational（Phase 2）: 依赖 Setup 完成；阻塞全部用户故事。
- User Stories（Phase 3-6）: 依赖 Foundational 完成。
- Polish（Phase 7）: 依赖目标用户故事完成。

### User Story Dependencies

- US1（P1）: Foundational 完成后可立即开始，是 MVP 主路径。
- US2（P1）: Foundational 完成后可开始；与 US1 同文件有交叉，建议在 US1 主链稳定后合入。
- US3（P2）: Foundational 完成后可开始；主要作用于树表格展示层。
- US4（P3）: 依赖 US1 的批量上传主流程可用，再补齐反馈体验。

### 建议完成顺序

1. Phase 1 → Phase 2
2. US1（MVP）
3. US2
4. US3
5. US4
6. Phase 7

---

## Parallel Opportunities

- Phase 1: `T002` 与 `T003` 可并行（不同语言文件）。
- Phase 2: `T005`、`T006`、`T007` 可并行（不同文件）。
- US1: 无明显安全并行窗口（API 与表单契约紧耦合），建议顺序执行。
- US2: `T014` 与 `T016` 可并行（不同页面文件）；`T015` 依赖 `T014` 语义确定。
- US3: `T019` 与 `T020` 可在 `T017` 基础上并行收尾。
- Polish: `T025` 与 `T026` 可并行。

---

## Parallel Example: User Story 2

```bash
# 可并行启动（不同文件）
Task T014: src/app/[lang]/console/images/[imageId]/page.tsx
Task T016: src/app/[lang]/console/images/page.tsx
```

## Parallel Example: User Story 3

```bash
# 在固定占位重构完成后并行收尾
Task T019: src/components/ImagesTreeTable.tsx
Task T020: src/components/ImagesTreeTable.tsx
```

---

## Implementation Strategy

### MVP First（仅 User Story 1）

1. 完成 Phase 1 与 Phase 2。
2. 完成 US1（T008-T012）。
3. 运行 quickstart 中场景 A/B 的最小验证。
4. MVP 可演示：批量上传能力成立。

### Incremental Delivery

1. MVP（US1）先交付批量上传主价值。
2. US2 交付目录上下文不丢失，消除流程断点。
3. US3 交付树形表格稳定交互。
4. US4 交付限制提示与上传反馈体验完善。
5. 最后执行 Phase 7 回归与构建收口。

### 注意事项

- 每个任务必须保持最小改动，不引入与需求无关重构。
- 涉及 i18n 的变更必须同步到全部已支持语言文件。
- 若发现文档与代码冲突，以代码为准，并在任务执行中补充说明。
