# Bug Assessment: callback route 因 `export const runtime = "edge"` 导致 fs 模块不可用

- **Slug**: `callback-edge-fs-error`
- **Created**: 2026-08-08
- **Source**: 用户粘贴的浏览器控制台错误
- **Verdict**: valid
- **Severity**: critical

## Report（原始错误）

```
GET http://localhost:7600/api/auth/callback/calieo?code=...&state=... 500 (Internal Server Error)

index.tsx:936 Uncaught Error: The edge runtime does not support Node.js 'fs' module.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime
    at Object.get (file:///.../.next/dev/server/edge/chunks/...)
    at promisify (node:internal/util:462:15)
    at module evaluation (file:///...node_modules_pnpm...)
```

## Symptom

完成 Calieo OAuth2 授权、浏览器回调到 `/api/auth/callback/calieo` 时，服务端返回 500，
报错 `The edge runtime does not support Node.js 'fs' module`，登录流程中断，无会话 cookie 写入。
预期行为：回调成功处理后重定向至 `/{lang}/console`。

## Reproduction

1. 启动开发服务器：`pnpm dev`
2. 访问 `/en/account/signin`，点击"使用 Calieo 登录"
3. 在 Calieo 完成授权
4. 浏览器被重定向回 `/api/auth/callback/calieo?code=...&state=...`
5. 观察：浏览器收到 500，控制台报 `fs` 模块不可用

## Suspected Code Paths

- `src/app/api/auth/callback/calieo/route.ts:2` — 声明了 `export const runtime = "edge"`，导致 Next.js 开发服务器在 edge sandbox 中执行此路由
- `src/db/index.ts:15` — `ensureLocalDbDirectory()` 内部调用 `require("node:fs")`，在 edge sandbox 中不可用
- `src/db/index.ts:28` — `drizzleSqlite()` 使用 `better-sqlite3`，是 Node.js 原生模块，同样不可用于 edge runtime
- `src/app/api/auth/signin/calieo/route.ts:2` — 同样声明了 `export const runtime = "edge"`，存在相同隐患（signin 路由不导入 `getDb`，当前未报错，但应一并修复保持一致性）

## Root Cause Hypothesis

**置信度：高（代码直接可见，无需复现验证）**

`src/app/api/auth/callback/calieo/route.ts` 中声明了 `export const runtime = "edge"`。
此声明告知 Next.js 开发服务器（local dev）在 **edge sandbox** 中运行该路由——
这是一个模拟 Cloudflare Workers/Vercel Edge 的沙箱，**不允许任何 Node.js 原生模块**（`fs`、`path`、`net` 等）。

然而，该路由通过 `getDb()` 间接依赖 `src/db/index.ts`，后者在本地开发环境中：
1. 调用 `require("node:fs")` 创建 SQLite 目录
2. 使用 `better-sqlite3`（Node.js 原生 addon）

这两个依赖均不兼容 edge sandbox，导致模块加载失败、路由返回 500。

**关键误解**：本项目通过 `@opennextjs/cloudflare` 部署到 Cloudflare Workers，
`wrangler.jsonc` 中已配置 `"nodejs_compat"` 兼容标志。
`@opennextjs/cloudflare` 在**构建时**将所有 Next.js 路由统一编译为 Worker bundle，
**不依赖** Next.js 的 `runtime = "edge"` 声明来决定部署目标。
因此 `export const runtime = "edge"` 对 Cloudflare 部署毫无帮助，
但在本地开发时会激活 Next.js 内置的 edge 模拟沙箱，造成 `fs` 不可用的错误。

## Proposed Remediation

**首选方案（移除错误的 runtime 声明）**：

从以下两个文件中删除 `export const runtime = "edge"` 这一行：

- `src/app/api/auth/callback/calieo/route.ts`
- `src/app/api/auth/signin/calieo/route.ts`

不声明 `runtime` 时，Next.js 默认使用 Node.js runtime，本地开发可正常访问 `fs`、`better-sqlite3`；
Cloudflare Workers 部署由 `@opennextjs/cloudflare` 的构建流程统一处理，与 runtime 声明无关。

**替代方案**（不推荐）：

将 callback route 改为不依赖 `getDb`，通过在 signin route 生成状态时跳过数据库操作，
在边界内完成 token 验证，最后通过另一个普通（非 edge）API 调用写入数据库。
——这会显著增加架构复杂度，无必要。

**Files likely to change**:
- `src/app/api/auth/callback/calieo/route.ts`（删除第 2 行 `export const runtime = "edge"`）
- `src/app/api/auth/signin/calieo/route.ts`（删除对应行，防止将来同样问题）

**Tests to add or update**:
- 现有快速验证：删除后执行 quickstart.md 场景 C（完整 OAuth 流程），确认 callback 返回 302 而非 500

## Risks & Considerations

- **修改极小**：仅删除两处各一行声明，不影响任何业务逻辑
- **生产无影响**：Cloudflare Workers 部署行为不依赖此声明
- **开发验证**：删除后本地 `pnpm dev` 即可立即测试

## Open Questions

无。根因明确，修复方向确定。
