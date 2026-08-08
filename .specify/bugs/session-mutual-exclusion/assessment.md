# Bug Assessment: 多种登录方式会话不互斥，旧 cookie 优先级高于新登录

- **Slug**: `session-mutual-exclusion`
- **Created**: 2026-08-08
- **Source**: 用户粘贴描述
- **Verdict**: valid
- **Severity**: high

## Report（用户描述）

> 当我使用 Calieo 登录成功并返回后，/en/console 页面显示的个人信息仍是之前的。
> 说明可能之前的用户状态未注销，或者两种登录认证方式可能同时生效了。
> 实际上无论哪种登录方式，用户状态都应该是互斥的，也就是同一时间只允许登录一个账号。
> 新账号登录时需要将旧账号注销。

## Symptom

在开发环境中，先通过邮箱模拟登录（写入 `user_id` cookie），再通过 Calieo 完成 OAuth2 授权（写入 `calieo_session` cookie）后，
`/en/console` 页面仍显示旧账号信息，而非 Calieo 账号信息。
预期行为：新登录应清除旧会话，页面应显示当前 Calieo 账号信息。

## Reproduction

1. 启动开发服务器：`pnpm dev`
2. 访问 `/en/account/signin`，使用邮箱表单以账号 A 登录（写入 `user_id` cookie）
3. 确认 `/en/console` 显示账号 A 的信息
4. 再次访问 `/en/account/signin`，点击"使用 Calieo 登录"，以账号 B 完成授权（写入 `calieo_session` cookie）
5. 回调完成，重定向至 `/en/console`
6. 观察：页面仍显示账号 A 的信息（而非 Calieo 账号 B）

## Suspected Code Paths

- `src/lib/auth.ts:113-121` — `getCurrentUserOrNull()` 先检查 `user_id` cookie，找到有效值立即返回，**不再检查** `calieo_session`；`user_id` 存在时 `calieo_session` 永远不会被读取
- `src/lib/auth.ts:120` — 附加问题：若 `user_id` 存在于 cookie 但已不在数据库中，直接返回 `null`，连 `calieo_session` 都不会尝试
- `src/app/api/auth/callback/calieo/route.ts:111-118` — 写入 `calieo_session` 时**未清除** `user_id` cookie
- `src/app/[lang]/account/signin/actions.ts:42-47` — 写入 `user_id` 时**未清除** `calieo_session` cookie

## Root Cause Hypothesis

**置信度：高（代码直接可见）**

`getCurrentUserOrNull()` 的 cookie 优先级链为：`user_id` > `calieo_session`（`user_id` 在第 113 行先检查）。
但两个登录入口写入各自 cookie 时，均未清除另一方的 cookie：

- **Calieo callback**（`callback/calieo/route.ts`）只调用 `clearStateCookie()`（清除临时 `oauth_state`），不清除 `user_id`
- **Mock login**（`actions.ts`）只写 `user_id`，不清除 `calieo_session`

结果：用户使用 Calieo 登录后，浏览器同时持有旧 `user_id` 和新 `calieo_session` 两个 cookie，
而 `auth.ts` 的优先级链使得旧 `user_id` 始终胜出，新 Calieo 身份被完全忽略。

## Proposed Remediation

**首选方案：登录时互斥清除对方 session cookie**

在每个登录入口写入自身 cookie 时，同时将其余所有 session cookie 清除（`maxAge=0`）：

**变更 1** — `src/app/api/auth/callback/calieo/route.ts`：
在写入 `calieo_session` cookie 前（或后），额外设置：
```
cookieStore.set("user_id", "", { maxAge: 0, path: "/" })
```

**变更 2** — `src/app/[lang]/account/signin/actions.ts`：
在写入 `user_id` cookie 后，额外设置：
```
cookieStore.set("calieo_session", "", { maxAge: 0, path: "/" })
```

这两处各加一行，确保任何登录行为均清除其他来源的残留会话。

**替代方案**（不推荐）：

- 调整 `auth.ts` 优先级链，将 `calieo_session` 提至 `user_id` 之前：
  → 仅解决"Calieo 覆盖 mock"方向，反向（mock 覆盖 Calieo）仍有问题；且语义上优先级重排会影响其他场景
- 引入统一 `session_id` cookie，登录时由服务端统一管理哪个 identity provider 在用：
  → 过度工程化，当前两个 cookie 各自职责清晰，互斥清除已足够

**Files likely to change**:
- `src/app/api/auth/callback/calieo/route.ts`
- `src/app/[lang]/account/signin/actions.ts`

**Tests to add or update**:
- 无新增测试文件（规格未要求 TDD）；按 quickstart.md 场景手动验证：先 mock 登录后 Calieo 登录，确认控制台显示 Calieo 账号信息

## Risks & Considerations

- **修改极小**：每个文件各加一行 `cookieStore.set`，无业务逻辑变化
- **CF Access 场景**：CF Access JWT 优先级最高，由请求头携带，不受 cookie 影响，无需处理
- **旧 `user_id` 清除后**：开发环境如需再次 mock 登录，访问 signin 页面正常提交即可，行为不变

## Open Questions

无。根因明确，修复方向确定。
