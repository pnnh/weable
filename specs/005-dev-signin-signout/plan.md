# Implementation Plan: 开发环境模拟登录/退出页面

**Branch**: `005-dev-signin-signout` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-dev-signin-signout/spec.md`

## Summary

为本地开发提供模拟登录/退出闭环：新增 `/[lang]/account/signin`（邮箱必填、名称可选，按邮箱匹配或新建用户后登录）与 `/[lang]/account/signout`（展示当前用户、退出后跳回登录页；未登录时提示并提供登录链接）两个仅开发环境可访问的页面；登录态复用既有 `user_id` cookie 认证链（将其中"id 即身份"的占位逻辑改为按真实用户 id 查库）；同时移除 `getCurrentUserOrNull` 中开发环境自动回退 dev 账号的逻辑，使显式登录成为开发环境唯一身份来源；生产环境两页面 `notFound()`，认证机制不变。

## Technical Context

**Language/Version**: TypeScript 5.x（Next.js 16.2 App Router，React 19）

**Primary Dependencies**: 仅使用现有依赖 —— next、drizzle-orm、better-sqlite3（本地）/ Cloudflare（生产）、Tailwind CSS。无新增依赖。

**Storage**: 既有 SQLite（Drizzle ORM，`users` 表），无 schema 变更；登录会话通过 `user_id` cookie 承载。

**Testing**: 项目无自动化测试设施；按 `quickstart.md` 手工验证（`pnpm dev`）+ `tsc` 类型检查。

**Target Platform**: 本地开发（`next dev`）；生产（Cloudflare Workers）仅验证页面不可达。

**Project Type**: web-service（Next.js 单体应用，既有单项目结构）。

**Performance Goals**: 登录/退出为低频开发操作，无专项性能目标（SC-001：全流程 < 30 秒，属人工操作时长）。

**Constraints**: 生产环境零影响 —— 页面不可达、不改变 Cloudflare Access 认证链；不引入任何密码/凭证机制。

**Scale/Scope**: 2 个新页面（含 2 个 Server Action）、`src/lib/auth.ts` 2 处小改。单开发者使用，无并发规模要求。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 结论 | 说明 |
|------|------|------|
| I. 语言规范 | PASS | 本计划及后续产物全部使用简体中文，技术标识符保留英文 |
| II. 上下文优先 | PASS | 已核对 `src/lib/auth.ts`、`gate.ts`、console 页面等源码，与记忆中的认证约定一致 |
| III. 精准手术式修改 | PASS | 仅新增 2 个页面目录；对 `auth.ts` 仅改动 `user_id` 分支与删除 dev 回退两处 |
| IV. 简洁优先 | PASS | 复用既有 cookie 认证链与 `ensureUserRow`，无新抽象、无新依赖、无新 API 路由 |
| V. 质量门控 | PASS | quickstart.md 提供可执行验证步骤；交付前运行 `tsc` 检查 |

初评与 Phase 1 设计后复评均无违规，无需 Complexity Tracking。

## Project Structure

### Documentation (this feature)

```text
specs/005-dev-signin-signout/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出
│   └── account-pages.md
└── tasks.md             # /speckit.tasks 输出（本命令不生成）
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── auth.ts                              # 修改：user_id 分支按真实用户查库；删除 dev 账号回退
└── app/[lang]/account/
    ├── signin/
    │   ├── page.tsx                         # 新增：登录表单页（邮箱必填、名称可选）
    │   └── actions.ts                       # 新增：signIn Server Action（查找/新建用户、写 cookie、redirect）
    └── signout/
        ├── page.tsx                         # 新增：已登录展示用户信息+退出按钮；未登录展示提示+登录链接
        └── actions.ts                       # 新增：signOut Server Action（清 cookie、redirect）
```

**Structure Decision**: 沿用既有 Next.js App Router 单项目结构。页面放在 `src/app/[lang]/account/` 下（位于 `console` 之外，不受 Cloudflare Access 对 `/console` 路由的保护约束，因此必须由代码自身做生产环境屏蔽）。Server Action 与页面同目录，不新增 API 路由与共享组件。

## Complexity Tracking

无宪法违规项，本节留空。
