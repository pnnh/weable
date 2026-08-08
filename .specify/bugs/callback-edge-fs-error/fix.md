# Bug Fix: callback route 因 `export const runtime = "edge"` 导致 fs 模块不可用

- **Slug**: `callback-edge-fs-error`
- **Fixed**: 2026-08-08
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

从 callback 和 signin 两个 OAuth2 路由文件中删除了错误的 `export const runtime = "edge"` 声明，
并修复了 callback 文件在首次编辑时引入的破损 import（孤立的 `import {` 行）。
删除该声明后，Next.js 开发服务器将在 Node.js runtime 中运行这两个路由，
`getDb()` → `require("node:fs")` / `better-sqlite3` 可正常使用；
Cloudflare Workers 部署行为不受影响。

## Changes

| 文件 | 变更 | 备注 |
|------|------|------|
| `src/app/api/auth/callback/calieo/route.ts` | 删除 `export const runtime = "edge"`；修复破损的 `import {` 孤行，补回 `import { eq } from "drizzle-orm"` | 修复时同步纠正了前序误操作引入的语法错误 |
| `src/app/api/auth/signin/calieo/route.ts` | 删除 `export const runtime = "edge"` | 仅删一行，无其他变更 |

## Diff Highlights

**callback/route.ts（修复前 → 修复后）**：

```diff
- import * as oauth from "oauth4webapi";
- import { cookies } from "next/headers";
- import {                              ← 孤立行（误操作遗留）
- import { getDb } from "@/db/index";
- ...
- export const runtime = "edge";       ← 删除

+ import * as oauth from "oauth4webapi";
+ import { cookies } from "next/headers";
+ import { eq } from "drizzle-orm";    ← 补回
+ import { getDb } from "@/db/index";
+ ...
  // 无 runtime 声明
```

**signin/route.ts（修复前 → 修复后）**：

```diff
- export const runtime = "edge";
  // 无其他变更
```

## Tests Added or Updated

无新增测试（规格未要求 TDD；quickstart.md 场景 C 作为手动端对端验证）。

## Local Verification

- **命令**：IDE 诊断（`problems` 工具）→ 两个文件均无 TypeScript 错误
- **人工确认**：文件头 1-15 行目视核查，`export const runtime` 在两文件中均不存在；imports 完整且有效

## Deviations from Assessment

Assessment 仅描述"删除两行"；实际修复还额外纠正了 callback 文件的破损 import（`import {` 孤行 + 缺失 `import { eq } from "drizzle-orm"`），该破损由实现阶段的错误编辑操作引入，不属于原始 bug 范围，但在本次修复中一并处理以恢复文件正确性。

## Follow-ups

- 建议运行 `pnpm dev` 后按 quickstart.md 场景 C 完整验证 Calieo 登录流程
- 如需在 Cloudflare Workers 部署中明确声明运行时，`@opennextjs/cloudflare` 文档指出无需 `runtime = "edge"`，所有路由统一编译为 Worker bundle
