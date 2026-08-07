# Tasks: 开发环境模拟登录/退出页面

**Input**: Design documents from `/specs/005-dev-signin-signout/`

**Prerequisites**: plan.md、spec.md、research.md、data-model.md、contracts/account-pages.md、quickstart.md

**Tests**: 规格未要求自动化测试，本清单不含测试任务；验证统一走 quickstart.md 手工场景。

**Organization**: 任务按用户故事分组，支持各故事独立实现与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 所属用户故事（US1、US2、US3）
- 描述中包含确切文件路径

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 环境基线确认；本功能无新增依赖、无 schema 变更

- [X] T001 确认本地基线可运行：执行 `pnpm install`、`pnpm db:migrate`、`pnpm dev` 启动成功（本功能不引入任何新依赖，无初始化任务）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有用户故事依赖的认证链改造

**⚠️ CRITICAL**: 未完成本阶段前不得开始任何用户故事

- [X] T002 修改 `src/lib/auth.ts` 的 `user_id` cookie 分支：由 `ensureUserRow(userId, userId, \`${userId}@local\`)` 改为按 `users.id` 查库返回真实用户行，行不存在时返回 `null`（视为无效会话）；不动 Cloudflare JWT 分支（见 research.md R2、contracts/account-pages.md）

**Checkpoint**: 认证链就绪，`user_id` cookie 可承载真实用户身份，用户故事可开始

---

## Phase 3: User Story 1 - 开发环境通过模拟登录页显式登录 (Priority: P1) 🎯 MVP

**Goal**: 开发者通过 `/[lang]/account/signin` 以邮箱（必填）+ 名称（可选）登录：邮箱命中已有用户则直接登录，否则新建用户后登录；旧会话被覆盖；成功后跳转控制台。

**Independent Test**: quickstart.md 场景 1–4（新用户登录、已有用户不重复创建、身份切换、表单校验）。

### Implementation for User Story 1

- [X] T003 [P] [US1] 新建 `src/app/[lang]/account/signin/actions.ts`：`signIn` Server Action —— 校验邮箱（trim 非空 + 基础格式正则，名称 trim 后为空视为未填写），校验失败返回错误信息；通过后按 email 查 `users` 表，命中即登录（忽略表单名称），未命中则 insert（name 缺省取邮箱，`onConflictDoNothing` + 按 email 回查），设置 `user_id` cookie（值为 `users.id`，httpOnly、sameSite=lax、path=/），`redirect` 至 `/{lang}/console`（见 data-model.md 解析顺序）
- [X] T004 [US1] 新建 `src/app/[lang]/account/signin/page.tsx`：登录表单页 —— `NODE_ENV === 'production'` 时 `notFound()`；`isValidLang` 校验 lang；渲染邮箱（必填）、名称（可选）输入框与提交按钮（表单含隐藏 lang 字段），提交至 T003 的 `signIn`，校验失败原址展示错误提示；样式沿用既有 Tailwind 风格（参考 `src/app/[lang]/console/page.tsx` 布局）（依赖 T003）

**Checkpoint**: US1 可独立验证 —— 未登录可登录、已有邮箱不重复建用户、可切换身份

---

## Phase 4: User Story 2 - 开发环境查看当前身份并退出登录 (Priority: P2)

**Goal**: `/[lang]/account/signout` 展示当前登录用户的名称与邮箱及退出按钮；退出后跳转登录页；未登录时提示并提供登录链接。

**Independent Test**: quickstart.md 场景 5（已登录展示/退出跳转、未登录提示与链接）。

### Implementation for User Story 2

- [X] T005 [P] [US2] 新建 `src/app/[lang]/account/signout/actions.ts`：`signOut` Server Action —— 删除 `user_id` cookie 后 `redirect` 至 `/{lang}/account/signin`（幂等，无需判断登录态）
- [X] T006 [US2] 新建 `src/app/[lang]/account/signout/page.tsx`：`NODE_ENV === 'production'` 时 `notFound()`；`isValidLang` 校验 lang；经 `getCurrentUserOrNull` 取当前用户 —— 已登录则展示名称与邮箱，并以提交 T005 `signOut` 的表单渲染"退出登录"按钮；未登录则展示"当前未登录"提示及指向 `/{lang}/account/signin` 的链接；`export const dynamic = "force-dynamic"`（依赖 T005）

**Checkpoint**: US1、US2 均可独立工作 —— 登录、查看身份、退出、回到登录页闭环完整

---

## Phase 5: User Story 3 - 取消开发环境自动回退账号，强制显式登录 (Priority: P3)

**Goal**: 移除 dev 账号自动回退，未登录访问受保护功能被拒绝，显式登录成为开发环境唯一身份来源。

**Independent Test**: quickstart.md 场景 6（未登录访问 console 页面与 API 被拒绝，登录后恢复）。

### Implementation for User Story 3

- [X] T007 [US3] 修改 `src/lib/auth.ts`：删除 `getCurrentUserOrNull` 末尾 `NODE_ENV !== 'production'` 的 dev 账号回退分支及仅被其引用的 `DEV_USER_BASE` 常量；认证链收敛为 Cloudflare JWT → `user_id` cookie → `null`（见 research.md R6）

**Checkpoint**: 三个用户故事全部独立可用；未登录不再获得任何默认身份

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 质量门控与端到端验证

- [X] T008 运行 `npx tsc --noEmit` 确认无类型错误
- [X] T009 按 `specs/005-dev-signin-signout/quickstart.md` 逐一执行场景 1–7（含 `pnpm build && pnpm start` 验证生产环境两页面 404 且 console 无回归）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，立即开始
- **Foundational (Phase 2)**: 依赖 Setup —— 阻塞所有用户故事
- **US1 (Phase 3) / US2 (Phase 4) / US3 (Phase 5)**: 均仅依赖 Foundational，三者相互独立，可按优先级顺序执行或并行
- **Polish (Phase 6)**: 依赖全部用户故事完成

### User Story Dependencies

- **US1 (P1)**: 依赖 T002（cookie 分支按真实用户解析），无其他故事依赖
- **US2 (P2)**: 依赖 T002；退出页展示的身份来自 US1 可创建的会话，但代码上与 US1 无直接依赖，可独立实现
- **US3 (P3)**: 仅修改 `src/lib/auth.ts`，与 US1/US2 文件无冲突；建议在 US1/US2 验证完成后执行，避免开发过程中无身份可用的中间态

### Within Each User Story

- Server Action 先于页面（页面 import action）
- 页面内先核心渲染分支，后样式细节

### Parallel Opportunities

- T002 完成后，T003（signin action）与 T005（signout action）可并行
- T004 与 T006 分别仅依赖各自 action，完成后可并行
- T007 与 US1/US2 页面无文件冲突，可并行（但注意执行时机说明）

---

## Parallel Example: User Story 1 & 2 启动

```bash
# T002 完成后同时启动两个 action：
Task: "新建 src/app/[lang]/account/signin/actions.ts（signIn）"
Task: "新建 src/app/[lang]/account/signout/actions.ts（signOut）"

# 各自 action 完成后并行两个页面：
Task: "新建 src/app/[lang]/account/signin/page.tsx"
Task: "新建 src/app/[lang]/account/signout/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（T002，阻塞项）
3. 完成 Phase 3: US1（T003–T004）
4. **STOP and VALIDATE**: 按 quickstart.md 场景 1–4 独立验证
5. 即可交付最小可用版本（显式登录能力）

### Incremental Delivery

1. Setup + Foundational → 认证链就绪
2. US1 → 验证 → 登录能力可用（MVP）
3. US2 → 验证 → 登录/退出闭环完整
4. US3 → 验证 → 强制显式登录，行为与生产对齐
5. Polish → `tsc` 通过 + quickstart 全场景通过

---

## Notes

- [P] 任务 = 不同文件、无未完成依赖
- 每个用户故事可独立完成与验证
- 每任务或逻辑组完成后提交
- 任一 checkpoint 均可停下独立验证
- 避免：跨故事文件冲突（US3 与 US1/US2 同改 `src/lib/auth.ts` 时注意先后，T002 与 T007 改动区域不同）
