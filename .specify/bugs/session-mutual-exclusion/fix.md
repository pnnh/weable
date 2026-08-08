# Bug Fix: 多种登录方式会话不互斥，旧 cookie 优先级高于新登录

- **Slug**: `session-mutual-exclusion`
- **Fixed**: 2026-08-08
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

在 Calieo callback 路由和 mock 登录 action 中各新增一行 cookie 清除操作，
确保任何登录行为均清除其他来源的残留会话 cookie，实现多登录方式互斥。

## Changes

| 文件 | 变更 | 备注 |
|------|------|------|
| `src/app/api/auth/callback/calieo/route.ts` | 修改：写 `calieo_session` 前新增 `set("user_id", "", { maxAge: 0 })` | 清除 mock 登录残留 |
| `src/app/[lang]/account/signin/actions.ts` | 修改：写 `user_id` 前新增 `set("calieo_session", "", { maxAge: 0 })` | 清除 Calieo 登录残留 |

## Diff Highlights

**callback/calieo/route.ts**：
```diff
  // 6. 清除临时 cookie，写入会话 cookie，互斥清除其他登录 session
  await clearStateCookie();
  const isProduction = process.env.NODE_ENV === "production";
+ cookieStore.set("user_id", "", { maxAge: 0, path: "/" }); // 清除 mock 登录残留会话
  cookieStore.set("calieo_session", userId, { ... });
```

**actions.ts**：
```diff
  const cookieStore = await cookies();
+ cookieStore.set("calieo_session", "", { maxAge: 0, path: "/" }); // 清除 Calieo 残留会话
  cookieStore.set("user_id", rows[0].id, { ... });
```

## Tests Added or Updated

无新增测试文件（规格未要求 TDD）。

## Local Verification

- IDE 诊断：两个文件均无 TypeScript 错误
- 手动验证步骤（按 quickstart.md）：
  1. mock 登录账号 A → 确认控制台显示账号 A
  2. Calieo 登录账号 B → 确认控制台显示账号 B，`user_id` cookie 已清除
  3. mock 登录账号 A → 确认控制台重新显示账号 A，`calieo_session` cookie 已清除

## Deviations from Assessment

无偏差，完全按照评估的首选方案执行。

## Follow-ups

- `auth.ts:120` 有一个次级问题：`user_id` 存在于 cookie 但不在数据库时直接返回 `null`，
  不继续检查 `calieo_session`。本次修复后由于互斥清除，正常流程下此分支不应同时出现两个 session，
  但若用户手动篡改 cookie 仍可能触发。可在后续将 `return null` 改为 `continue` 式降级逻辑，
  但不属于本次 bug 范围。
