# Phase 0 Research: 开发环境模拟登录/退出页面

本功能无遗留 NEEDS CLARIFICATION。以下为关键技术决策的研究结论。

## R1: 开发环境登录态的承载方式

- **Decision**: 复用既有 `user_id` cookie 认证链。signin 时将用户 id 写入 `user_id` cookie，signout 时删除该 cookie。
- **Rationale**: `getCurrentUserOrNull`（`src/lib/auth.ts`）已包含 `user_id` cookie 分支，console 页面与 `/_lib/gate.ts` 均通过该函数取用户，无需改动任何消费方；cookie 为 httpOnly、同站生效，满足开发用途。
- **Alternatives considered**:
  - 新增独立 session 表 + 签名令牌：需建表、增 migration，违背简洁优先（宪法 IV），拒绝。
  - localStorage + 自定义 header：需改动所有 console API 消费方，侵入面大，拒绝。

## R2: `user_id` cookie 分支的身份解析修正

- **Decision**: 将现状 `ensureUserRow(userId, userId, `${userId}@local`)`（把 cookie 值同时当 id/name/email 的占位逻辑）改为：按 `users.id` 查库返回真实用户行；查不到则返回 `null`（视为无效会话）。
- **Rationale**: 新流程中 cookie 值始终是 `users.id`（signin 写入），按 id 查库即可还原完整身份（含真实邮箱、nickname）。无效 id 返回 null 与"未登录被拒绝"的语义一致。全库检索确认当前无任何代码写入 `user_id` cookie，该分支此前实际未被使用，改造无兼容风险。
- **Alternatives considered**:
  - cookie 直接存邮箱：与现有分支语义（id）冲突，且邮箱唯一索引查询与 id 主键查询相比无额外收益，拒绝。
  - 保留占位逻辑、另加新 cookie：两套会话并存，增加混乱，拒绝。

## R3: 登录时的用户查找/创建策略

- **Decision**: signin 提交后按 `users.email` 查询：命中则以该行登录（忽略表单中的名称，不更新既有资料）；未命中则 `insert`（name 取表单值，缺省用邮箱）后登录。插入用 `onConflictDoNothing` 兜底并复查。
- **Rationale**: `users.email` 为唯一索引；行为与 Cloudflare 分支的 `ensureUserRow` 一致（onConflictDoNothing + 按主键回查），逻辑模式统一。满足 FR-003/FR-004 与 Assumptions 中"不覆盖已有用户名称"。
- **Alternatives considered**: upsert 时顺带更新 name —— 违反规格假设（已有邮箱登录不改既有资料），拒绝。

## R4: 生产环境屏蔽方式

- **Decision**: 两个页面组件在 `process.env.NODE_ENV === 'production'` 时直接调用 `notFound()`。
- **Rationale**: 页面位于 `/[lang]/account/*`，不在 Cloudflare Access 保护的 `/console` 路径内，必须代码自行屏蔽。`notFound()` 使生产行为与不存在的路由一致（FR-011），且该判断在构建时可被静态分析，不会泄露任何登录表单。
- **Alternatives considered**:
  - middleware 拦截：项目当前无 middleware.ts，为两个页面引入新机制过重，拒绝。
  - 仅靠 cookie 不可写入来"事实屏蔽"：页面仍会渲染，暴露开发功能存在，不满足 FR-011，拒绝。

## R5: 表单提交机制

- **Decision**: 使用 Server Action（`signin/actions.ts`、`signout/actions.ts`），不新增 API 路由。校验失败（邮箱为空/格式非法）通过 Server Action 返回错误信息并在页面内展示。
- **Rationale**: 项目 console 侧已有 Server Action / route handler 混用模式；表单仅服务本页，Server Action 最少代码量。邮箱格式采用轻量正则校验（单行 input 场景无需引入 zod 等新依赖）。
- **Alternatives considered**: 新增 `/account/api/signin` route handler —— 多一层路由与 fetch 调用，无额外收益，拒绝。

## R6: dev 账号回退的移除范围

- **Decision**: 删除 `getCurrentUserOrNull` 中 `NODE_ENV !== 'production'` 回退分支及仅供其使用的 `DEV_USER_BASE` 常量；认证链收敛为 Cloudflare JWT → `user_id` cookie → `null`。
- **Rationale**: 满足 FR-010；`DEV_USER_BASE` 仅被该分支引用（全库检索确认），一并删除避免死代码。
- **Alternatives considered**: 保留常量留作它用 —— 无消费方即死代码，违背精准手术原则中"清理因本次修改而无用的内容"，拒绝。
