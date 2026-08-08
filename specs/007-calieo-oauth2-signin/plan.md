# 实现计划：Calieo OAuth2/OIDC 第三方登录接入

**分支**：`007-calieo-oauth2-signin` | **日期**：2026-08-08 | **规格**：[spec.md](spec.md)

## 概述

在现有 Cloudflare Access 零信任认证基础上，叠加 Calieo OIDC 客户端流程，实现应用层第三方登录。
生产环境仅显示 Calieo 登录入口；开发环境保留邮箱模拟登录，同时开放 Calieo 流程测试。
使用 `oauth4webapi`（OpenID 认证、无依赖、Cloudflare Workers 原生兼容）实现 Authorization Code Flow + PKCE。

## Technical Context

**Language/Version**：TypeScript 5，Next.js 16.2.4 (App Router)

**新增依赖**：`oauth4webapi`（无子依赖，ESM，OpenID 认证，Cloudflare Workers 兼容）

**Storage**：Cloudflare D1（SQLite），Drizzle ORM；需新增 `users.calieo_sub` 列

**Testing**：Vitest（单元）、Playwright（E2E）

**Target Platform**：Cloudflare Workers（通过 `@opennextjs/cloudflare`）

**Project Type**：Web 应用（Next.js App Router）

**Constraints**：
- 无 Node.js 原生 API（crypto、fs 等）；仅 Web Crypto API + `fetch()`
- 无状态 Workers 架构：不可用服务端内存/KV 存储 OAuth state（使用加密 cookie）
- 现有 `auth.ts` 身份解析链顺序不变（CF Access JWT > calieo_session cookie > user_id cookie）

## Constitution Check

*GATE：Phase 0 研究前必须通过。Phase 1 设计后重新检查。*

| 宪法原则 | 状态 | 说明 |
|----------|------|------|
| **I. 语言规范** | ✅ | 所有产物使用简体中文 |
| **II. 上下文优先** | ✅ | 已读 README、auth.ts、schema.ts、signin page；代码为准 |
| **III. 精准修改** | ✅ | 仅修改 signin page、auth.ts；新增独立文件；不触碰其他业务逻辑 |
| **IV. 简洁优先** | ✅ | `oauth4webapi` 最轻量方案；拒绝 next-auth（过度工程化）；state 用 cookie 而非 KV |
| **V. 质量门控** | ✅ | 有可验证步骤和检查点；见 quickstart.md |
| **技术规范符合性** | ✅ | Next.js App Router + Drizzle ORM + Cloudflare Workers；pnpm 管理依赖 |

**复杂度说明**（宪法 IV）：新增 `oauth4webapi` 依赖有明确必要性——手工实现 OIDC RS256 JWT 验证、PKCE、JWKS 缓存约需 200+ 行 Web Crypto 代码，`oauth4webapi` 将此压缩至 ~60 行，且经过 OpenID 认证。

## Project Structure

### 文档（本功能）

```text
specs/007-calieo-oauth2-signin/
├── plan.md              # 本文件
├── research.md          # Phase 0 研究产物
├── data-model.md        # Phase 1 数据模型
├── quickstart.md        # Phase 1 验证指南
├── contracts/
│   ├── signin-route.md  # GET /api/auth/signin/calieo 合约
│   └── callback-route.md # GET /api/auth/callback/calieo 合约
└── tasks.md             # Phase 2 任务列表（/speckit-tasks 生成）
```

### Source Code

```text
src/
├── app/
│   ├── [lang]/account/signin/
│   │   ├── page.tsx              # 修改：移除 notFound()；条件渲染 CalieoSignInButton
│   │   ├── sign-in-form.tsx      # 不变（开发环境继续使用）
│   │   └── actions.ts            # 不变
│   └── api/auth/
│       ├── signin/calieo/
│       │   └── route.ts          # 新增：GET，生成 state+PKCE，设 cookie，重定向 Calieo
│       └── callback/calieo/
│           └── route.ts          # 新增：GET，验证 state，换 token，建会话
├── components/
│   └── CalieoSignInButton.tsx    # 新增：client component，"使用 Calieo 登录"按钮
└── lib/
    ├── auth.ts                   # 修改：新增 calieo_session cookie 识别路径
    └── calieo-oauth.ts           # 新增：oauth4webapi 客户端封装（构建 client、验 token）

migrations/
└── XXXX_add_calieo_sub.sql       # 新增：ALTER TABLE users ADD COLUMN calieo_sub TEXT UNIQUE
```

**结构决策**：单项目（Next.js App Router），新增文件集中于 `src/lib/`、`src/app/api/auth/`，对现有结构侵入最小。
