# Tasks: 图片批量设置发布状态与频道（含控制台 API 迁移）

**Input**: Design documents from `/specs/003-batch-publish-channel/`

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/patch-images-batch.md、contracts/console-api-migration.md、quickstart.md

**Tests**: spec 未要求自动化测试，项目无测试基建；验证以 quickstart.md 的 S1~S8 手工场景为准。

**Organization**: 任务按用户故事分组。API 迁移（FR-014~016）因契约要求原子完成、且 US1 批量接口依赖新前缀，归入 Foundational 阶段。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无未完成依赖）
- **[Story]**: 任务所属用户故事（US1、US2、US3）
- 描述中包含确切文件路径

## Path Conventions

路径均相对仓库根目录：`src/app/`、`src/components/`、`src/lib/`、`src/locales/`。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 项目初始化确认（无新增依赖、无 schema 迁移）

- [X] T001 确认依赖已安装且可正常构建：在仓库根目录执行 `pnpm install`，确认无缺失依赖（本功能不新增任何依赖）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 登录门禁 helper、控制台 API 前缀迁移（含旧路由删除）、选择交互基础设施。**迁移必须原子完成**（contracts/console-api-migration.md 一致性要求），本阶段完成前不得开始用户故事

**⚠️ CRITICAL**: 本阶段完成前不得开始任何用户故事实现

### 登录门禁

- [X] T002 在 `src/lib/auth.ts` 新增 `getCurrentUserOrNull()`：复用 `getCurrentUser()` 的身份解析链（Cloudflare Access JWT → `user_id` cookie → 开发环境回退），但生产环境无身份时返回 `null` 而非抛错（research.md R9）

### i18n

- [X] T003 [P] 在 `src/locales/en.json`、`src/locales/zh.json`、`src/locales/zh-TW.json`、`src/locales/ja.json`、`src/locales/de-DE.json`、`src/locales/es.json`、`src/locales/fr.json`、`src/locales/pt-PT.json` 8 个文件中追加本功能全部文案键（工具栏按钮、发布状态弹窗标题与选项、频道弹窗标题与"空频道"选项、确认/取消、提交中、错误提示、表头全选 aria-label，camelCase，FR-013）

### 控制台前缀新路由（每个路由开头：lang 校验 404 + `getCurrentUserOrNull()` 登录门禁 401 + JSON，FR-014）

- [X] T004 新建图片类控制台路由（迁移自原路由，业务逻辑不变仅加门禁）：`src/app/[lang]/console/api/images/route.ts`（GET 子目录列表）、`src/app/[lang]/console/api/images/breadcrumb/route.ts`（GET）、`src/app/[lang]/console/api/images/[imageId]/route.ts`（PATCH / DELETE）、`src/app/[lang]/console/api/images/[imageId]/file/route.ts`（GET 控制台副本：登录 + 仅本人所有，非本人 404，research.md R10）
- [X] T005 [P] 新建上传与目录控制台路由：`src/app/[lang]/console/api/upload/route.ts`（POST）、`src/app/[lang]/console/api/directories/route.ts`（POST），逻辑迁移自原路由并加门禁
- [X] T006 [P] 新建频道与用户控制台路由：`src/app/[lang]/console/api/channels/[channelId]/route.ts`（DELETE）、`src/app/[lang]/console/api/channel/avatar/[channelId]/route.ts`（仅 POST）、`src/app/[lang]/console/api/user/avatar/route.ts`（POST）、`src/app/[lang]/console/api/user/avatar/[userId]/route.ts`（GET）、`src/app/[lang]/console/api/user/profile/route.ts`（PATCH），逻辑迁移自原路由并加门禁

### 前端调用路径切换（FR-015，lang 传递见 research.md R11）

- [X] T007 修改 `src/components/ImagesTreeTable.tsx`：改造为受控选择组件（新增 `selectedIds`/`onSelectionChange` props；表头最左侧复选框含全选/半选 indeterminate；每个图片行最左侧复选框，目录行不渲染；上报当前可见图片 id 集合，FR-001~FR-003）；同时将子目录 fetch 与 `<img>` src 切换为 `/${lang}/console/api/...`（组件已有 `lang` prop）
- [X] T008 修改 `src/components/CreateDirectoryDialog.tsx`、`src/components/ImageUploadForm.tsx`（二者已有 `lang` prop）与 `src/components/ImageDeleteSection.tsx`（新增 `lang` prop）的 fetch 路径为 `/${lang}/console/api/...`；并更新 `src/app/[lang]/console/images/[imageId]/page.tsx` 向 `ImageDeleteSection` 传入 `lang`
- [X] T009 [P] 修改 `src/components/ChannelDeleteSection.tsx` 与 `src/components/ChannelAvatarUpload.tsx`：新增 `lang` prop，fetch 与 `<img>` src 切换为 `/${lang}/console/api/...`；并更新 `src/app/[lang]/console/channels/[channelId]/page.tsx` 传入 `lang`
- [X] T010 [P] 修改 `src/components/UserProfileClient.tsx`：新增 `lang` prop，fetch 与 `<img>` src 切换为 `/${lang}/console/api/...`；并更新 `src/app/[lang]/console/profile/page.tsx` 传入 `lang`

### 批量操作前端基础设施

- [X] T011 新建客户端容器组件 `src/components/ImagesBatchToolbar.tsx`：持有 `selectedIds` 状态；渲染"设置发布状态"与"设置频道"两个按钮，`selectedIds` 为空时均 `disabled`（FR-004、FR-007）；本阶段按钮为占位，US1/US2 分别接入弹窗
- [X] T012 修改 `src/app/[lang]/console/images/page.tsx`：SSR 查询当前用户频道列表（`channels` 按 `userId` 过滤、`createdAt` 升序，research.md R6）；组装 labels；将工具栏区域重构为 `ImagesBatchToolbar` + 受控 `ImagesTreeTable` 联动结构

### 旧路由删除（FR-015，须在 T004~T010 全部完成后执行）

- [X] T013 删除原控制台路由文件：`src/app/api/images/route.ts`、`src/app/api/images/breadcrumb/route.ts`、`src/app/api/images/[imageId]/route.ts`、`src/app/api/upload/route.ts`、`src/app/api/directories/route.ts`、`src/app/api/channels/[channelId]/route.ts`、`src/app/api/user/avatar/route.ts`、`src/app/api/user/avatar/[userId]/route.ts`、`src/app/api/user/profile/route.ts`；并拆分 `src/app/api/channel/avatar/[channelId]/route.ts`（保留 GET、删除 POST handler）；保留 `src/app/api/images/[imageId]/file/route.ts`（独立公开接口，FR-016）

**Checkpoint**: 选择交互可用（quickstart.md S1）且迁移完整无回归（quickstart.md S7：旧路径全 404、控制台既有流程全部走新前缀）——可以开始用户故事

---

## Phase 3: User Story 1 - 批量设置图片发布状态 (Priority: P1) 🎯 MVP

**Goal**: 勾选图片后经二次确认弹窗批量更新 `is_published`，列表即时反映新状态

**Independent Test**: 勾选若干图片 → 点击"设置发布状态" → 弹窗选择"已发布"并确认 → 状态徽章全部更新、选择清空（quickstart.md S2）

### Implementation for User Story 1

- [X] T014 [US1] 新建 `src/app/[lang]/console/api/images/batch/route.ts`，实现 `PATCH`：开头执行 lang 校验 + 登录门禁（401）；校验请求体（`ids` 非空、≤500、元素匹配 `/^[a-zA-Z0-9_-]+$/`；本阶段仅接受 `isPublished` 布尔字段）；以 `and(inArray(images.id, ids), eq(images.userId, user.id), ne(images.mimeType, "directory"))` 单条 UPDATE 写入 `isPublished` 与 `updatedAt`；按 contracts/patch-images-batch.md 返回 `{ ok: true, updated }`，`updated === 0` 返回 404，校验失败返回 400
- [X] T015 [US1] 新建 `src/components/BatchPublishDialog.tsx`：沿用 `CreateDirectoryDialog` 弹窗模式（fixed overlay + 白色卡片）；"已发布/未发布"互斥 radio 与取消/确认按钮；确认时调用 `PATCH /${lang}/console/api/images/batch`，提交期间确认按钮 `disabled` + 占位符（FR-005、FR-011）；成功后回调父组件（清空选择 + `router.refresh()`），失败显示 locale 错误文案（FR-012）
- [X] T016 [US1] 在 `src/components/ImagesBatchToolbar.tsx` 中将"设置发布状态"按钮接入 `BatchPublishDialog`：按钮启用时点击打开弹窗；成功回调中清空 `selectedIds` 并触发刷新

**Checkpoint**: User Story 1 独立可用（quickstart.md S2 全部通过）

---

## Phase 4: User Story 2 - 批量设置图片所属频道 (Priority: P2)

**Goal**: 勾选图片后经二次确认弹窗批量更新 `channel_id`（含清空为 `null`），频道来源为下拉框

**Independent Test**: 勾选图片 → 点击"设置频道" → 下拉框选择频道（或"空"）并确认 → `channel_id` 更新/清空（quickstart.md S3）

### Implementation for User Story 2

- [X] T017 [US2] 扩展 `src/app/[lang]/console/api/images/batch/route.ts`：支持 `channelId` 分支（`null` 或字符串，与 `isPublished` 二选一，同时提供或均缺失返回 400）；`channelId` 非 null 时先查询 `channels` 表校验其为当前用户名下已存在频道，否则 400（research.md R2）
- [X] T018 [P] [US2] 新建 `src/components/BatchChannelDialog.tsx`：沿用 `CreateDirectoryDialog` 弹窗模式；原生 `<select>` 列出 props 传入的频道列表（`{ id, name }[]`）并附加"空"选项（value 为空字符串，文案来自 T003 locale 键）；确认时调用 `PATCH /${lang}/console/api/images/batch`（空选项传 `channelId: null`），提交期间防重复提交（FR-008、FR-009、FR-011）
- [X] T019 [US2] 在 `src/components/ImagesBatchToolbar.tsx` 中将"设置频道"按钮接入 `BatchChannelDialog`（接收 `src/app/[lang]/console/images/page.tsx` 经 props 传入的频道列表），成功回调复用 US1 的清空选择 + 刷新逻辑

**Checkpoint**: User Story 1 与 2 均独立可用（quickstart.md S2、S3 全部通过）

---

## Phase 5: User Story 3 - 通过表头复选框快速全选当前视图 (Priority: P3)

**Goal**: 表头复选框全选/取消全选当前视图全部可见图片，支持半选态

**Independent Test**: 点击表头复选框全选 → 取消单张 → 表头呈半选态；目录行不受影响（quickstart.md S1 第 3~4 步）

### Implementation for User Story 3

- [X] T020 [US3] 在 `src/components/ImagesBatchToolbar.tsx` 与 `src/components/ImagesTreeTable.tsx` 中补全表头三态联动：依据表格上报的可见图片 id 集合计算表头复选框选中/半选/未选状态；验证已展开目录子行纳入全选范围、目录行排除在外（若 T007/T011 已完整覆盖，此任务为回归验证并修复缺口）

**Checkpoint**: 全部用户故事独立可用（quickstart.md S1 全部通过）

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 安全门禁验证、多语言与公开页面回归、构建走查

- [X] T021 按 quickstart.md S4 执行批量接口边界验证（curl 各失败用例：空/超限/非法 ids、字段互斥、他人频道、不存在的 ids、目录 ID 混入、非法 lang），修复发现的问题
- [X] T022 按 quickstart.md S6 执行登录门禁验证：`pnpm build && pnpm start` 生产构建，无 cookie 请求各控制台 API 均返回 `401 + {"error":"Unauthorized"}`，登录后恢复正常；修复发现的问题
- [X] T023 按 quickstart.md S5 与 S8 执行多语言与公开页面验证：切换 `/zh`、`/ja` 等变体确认文案无键名裸露；未登录访问 `/en`、`/en/images/[id]`、`/en/channels`、`/en/channels/[id]` 确认公开接口（`/api/images/[id]/file`、`/api/channel/avatar/[id]`）正常；并全局搜索 `src/` 确认无残留旧路径引用
- [X] T024 在仓库根目录执行 `pnpm build` 确认无类型/构建错误，按 quickstart.md 完成标准（S1~S8）做最终走查

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖
- **Foundational (Phase 2)**: 依赖 Setup——阻塞所有用户故事；其中 T002 先行（T004~T006 依赖门禁 helper）；T013（删除旧路由）必须最后执行（依赖 T004~T010 全部完成）
- **User Stories (Phase 3+)**: 均依赖 Phase 2；US1 → US2 部分串行（同文件），US3 最后
- **Polish (Phase 6)**: 依赖全部用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: 依赖 Foundational，不依赖其他故事
- **User Story 2 (P2)**: T017 与 T014 同文件须顺序执行（先 T014 后 T017）；T018 可基于契约与 T017 并行
- **User Story 3 (P3)**: 依赖 T007/T011，属回归完善性质

### Within Foundational

- T002 →（T004、T005、T006 可并行）→（T007~T010 组件切换可并行）→ T011、T012 → T013（删除旧路由必须最后，原子迁移）

### Parallel Opportunities

- T003（locale）与 T002 文件不同可并行
- T004/T005/T006 三组新路由互不重叠，可并行
- T008/T009/T010 三组组件切换文件不重叠，可并行
- US2 的 T018 可与 T017 并行

---

## Parallel Example: Foundational 阶段

```text
# T002 完成后并行启动三组新路由：
Task: "T004 图片类控制台路由（src/app/[lang]/console/api/images/...）"
Task: "T005 上传/目录控制台路由（upload、directories）"
Task: "T006 频道/用户控制台路由（channels、channel/avatar、user/...）"

# 新路由就绪后并行切换前端路径：
Task: "T008 CreateDirectoryDialog/ImageUploadForm/ImageDeleteSection 路径切换"
Task: "T009 ChannelDeleteSection/ChannelAvatarUpload 路径切换"
Task: "T010 UserProfileClient 路径切换"

# 全部切换完成后串行收尾：
Task: "T012 console/images/page.tsx 编排"
Task: "T013 删除旧路由 + 拆分 channel/avatar"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（含完整 API 迁移，原子交付）
3. 完成 Phase 3: User Story 1
4. **STOP and VALIDATE**: 按 quickstart.md S1、S2、S7 独立验证
5. 可交付/演示

### Incremental Delivery

1. Setup + Foundational → 选择交互可用 + 控制台 API 全部迁移至登录门禁前缀
2. 追加 User Story 1 → 独立验证 → 交付（MVP）
3. 追加 User Story 2 → 独立验证 → 交付
4. 追加 User Story 3 → 独立验证 → 交付
5. Polish 阶段完成 S4/S6/S8 安全与回归验证后整体收口

---

## Notes

- [P] 任务 = 不同文件、无未完成依赖
- [Story] 标签用于追溯任务所属用户故事；Foundational 中的迁移任务无 Story 标签（服务全部故事与 FR-014~016）
- 迁移原子性：T013 删除旧路由前，必须确认 T004~T010 全部完成，避免前端指向已删路由或旧路由绕过门禁
- 本项目无自动化测试基建，验证以 quickstart.md 手工场景为准
- 每个任务或逻辑分组完成后提交一次 git commit
