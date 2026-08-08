# Phase 0 研究报告：Calieo OAuth2/OIDC 接入

**功能**：007-calieo-oauth2-signin | **日期**：2026-08-08

---

## 研究项 1：Calieo OIDC Provider 能力确认

**来源**：`https://portal.calieo.xyz/.well-known/openid-configuration`（实时抓取验证）

**决策**：使用 Authorization Code Flow + PKCE (S256)

**关键端点**：

| 端点 | URL |
|------|-----|
| Issuer | `https://portal.calieo.xyz` |
| 授权端点 | `https://portal.calieo.xyz/api/oauth/authorize` |
| Token 端点 | `https://portal.calieo.xyz/api/oauth/token` |
| JWKS | `https://portal.calieo.xyz/.well-known/jwks.json` |
| Userinfo | `https://portal.calieo.xyz/api/oauth/userinfo` |

**关键能力**：
- `response_types_supported`：仅 `code`（强制 Authorization Code Flow）
- `id_token_signing_alg_values_supported`：`RS256`
- `code_challenge_methods_supported`：`S256`、`plain`（应使用 S256）
- `claims_supported`：`sub`、`name`、`preferred_username`、`picture`、`email`、`email_verified`
- `token_endpoint_auth_methods_supported`：`client_secret_post`、`client_secret_basic`、`none`

**所需 scopes**：`openid profile email`

**注意**：`access_token_signing_alg_values_supported` 为 `ML-DSA-65`（后量子签名算法）。Access token 不需在客户端验证，只需 id_token（RS256）验证；无影响。

---

## 研究项 2：OAuth2/OIDC 客户端库选型

**决策**：使用 `oauth4webapi`

**理由**：
- Arctic（原推荐）于 2026 年 7 月已正式弃用（作者公告：https://pilcrowonpaper.com/blog/18）
- oslo 系列包同期弃用，仅保留 `@oslojs/encoding`
- `oauth4webapi` 由 Filip Skokan（panva）维护，已获 OpenID Foundation 认证（Basic、FAPI 1.0、FAPI 2.0 RP 合规）
- 无任何外部依赖，纯 ESM，tree-shakeable
- 明确支持 Cloudflare Workers（文档列出）
- 提供 OIDC Authorization Code Flow + PKCE 完整实现，含 JWKS 自动获取与 id_token RS256 验证

**排除方案**：

| 方案 | 排除原因 |
|------|----------|
| Arctic | 2026-07 弃用 |
| next-auth v5 (Auth.js) | Workers adapter 实验性；过度工程化；需 @auth/drizzle-adapter |
| oslo | 弃用（除 encoding 包） |
| 纯手工实现 | 约 200+ 行 Web Crypto 代码；需自行处理 JWKS 缓存、RS256 验证、PKCE；`oauth4webapi` 已经解决 |

---

## 研究项 3：OAuth State + PKCE 存储方案（Workers 无状态约束）

**决策**：单一 httpOnly cookie `oauth_state`，内容格式 `{state}::{codeVerifier}::{lang}`

**理由**：
- Cloudflare Workers 无持久内存，无服务端 KV 可用（未开通 KV namespace）
- httpOnly cookie 天然防 JS 读取；sameSite=lax 阻断跨站 form 提交触发
- state 为 cryptographically random 字符串，即使 cookie 内容明文也无法伪造
- maxAge=600（10 分钟），过期自动失效
- 无需 SESSION_SECRET；不引入额外环境变量复杂度

**Cookie 规格**：
```
名称:   oauth_state
值:     {32字节hex state}::{base64url code_verifier}::{lang}
属性:   httpOnly=true, sameSite=lax, maxAge=600, path=/, secure=true(生产)
```

---

## 研究项 4：users 表与 Calieo Sub 映射

**决策**：新增 `users.calieo_sub` 列（方案 B）

**理由**：
- 现有 `users.id` 是 base58-UUIDv7（由 `createId()` 生成），是应用内部主键
- Cloudflare Access 的 `sub` 通过 `ensureUserRow(id, name, email)` 直接写入 `users.id`（现有逻辑）
- Calieo `sub` 是 Calieo 平台的用户标识，格式不确定（可能为 UUID 或其他），不应污染 `users.id`
- 分离存储：按 `calieo_sub` 查找已有用户，找到则直接用；未找到且 email 已存在则关联；两者都没有则创建

**查找顺序**（回调时）：
1. 按 `calieo_sub` 查找 → 找到则直接登录
2. 按 `email` 查找 → 找到则将 `calieo_sub` 关联到该用户后登录
3. 都未找到 → 创建新用户（`id=createId()`，写入 `calieo_sub`、`email`、`name`）

**迁移**：
```sql
ALTER TABLE users ADD COLUMN calieo_sub TEXT UNIQUE;
```

---

## 研究项 5：Calieo 会话 Cookie 与现有 auth.ts 集成

**决策**：新增 `calieo_session` cookie，auth.ts 解析链第三位

**现有解析链**（`getCurrentUserOrNull`）：
1. `cf-access-jwt-assertion` 请求头 / `CF_Authorization` cookie → CF Access 身份
2. `user_id` cookie → 开发环境模拟登录身份

**新增第三路**：
3. `calieo_session` cookie → 值为 `users.id`，按 id 查库还原身份

**优先级维持**：CF Access JWT 最高优先级不变，不影响生产 Cloudflare Access 保护的路由。

---

## 研究项 6：signin 页面行为调整

**现状**：`page.tsx` 有 `if (process.env.NODE_ENV === "production") notFound()` 拦截。

**决策**：移除该拦截，改为条件渲染：

```
生产环境：只渲染 <CalieoSignInButton>（邮箱表单不渲染）
开发环境：渲染 <SignInForm>（邮箱模拟）+ <CalieoSignInButton>（分隔线下方）
```

**回调 URL 注册**：在 Calieo 控制台需注册：
- 开发：`http://localhost:7600/api/auth/callback/calieo`
- 生产：`https://<your-domain>/api/auth/callback/calieo`

---

## 研究项 7：`lang` 参数传递链

OAuth2 流程跨两个独立 HTTP 请求，`lang` 需跨请求传递：

1. 用户在 `/en/account/signin` 点击按钮 → 导航到 `/api/auth/signin/calieo?lang=en`
2. signin route 将 `lang` 存入 `oauth_state` cookie
3. Calieo 回调 → `/api/auth/callback/calieo?code=...&state=...`
4. callback route 从 cookie 解析出 `lang`，登录后重定向 `/${lang}/console`
