# API 合约：GET /api/auth/callback/calieo

**功能**：007-calieo-oauth2-signin | **文件**：`src/app/api/auth/callback/calieo/route.ts`

---

## 概述

OAuth2 授权回调端点。验证 state、使用 code 换取 token、验证 id_token 签名，
查找或创建用户，写入会话 cookie，重定向至控制台。

## 请求

```
GET /api/auth/callback/calieo?code={code}&state={state}
```

Calieo 在用户授权后将浏览器重定向至此 URL。

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `code` | string | 是 | Authorization code，由 Calieo 签发 |
| `state` | string | 是 | 必须与 `oauth_state` cookie 中存储的 state 匹配 |
| `error` | string | 否 | 用户取消或授权失败时由 Calieo 传入（如 `access_denied`） |
| `error_description` | string | 否 | 错误描述 |

### Cookie（由浏览器自动携带）

| Cookie | 说明 |
|--------|------|
| `oauth_state` | 格式 `{state}::{codeVerifier}::{lang}`，由 signin 路由写入 |

## 响应

### 成功（302 重定向至控制台）

```
HTTP/1.1 302 Found
Location: /{lang}/console
Set-Cookie: calieo_session={users.id}; HttpOnly; SameSite=Lax; Max-Age=2592000; Path=/
Set-Cookie: oauth_state=; Max-Age=0; Path=/   ← 清除临时 cookie
```

### 错误：用户取消授权（302 重定向回登录页，含错误提示）

```
HTTP/1.1 302 Found
Location: /{lang}/account/signin?error=access_denied
```

### 错误：state 不匹配（302 重定向，CSRF 防护触发）

```
HTTP/1.1 302 Found
Location: /{lang}/account/signin?error=invalid_state
```

### 错误：token 验证失败（302 重定向）

```
HTTP/1.1 302 Found
Location: /{lang}/account/signin?error=token_invalid
```

### 错误：缺少必要 claims（email 为空）

```
HTTP/1.1 302 Found
Location: /{lang}/account/signin?error=missing_claims
```

## 处理流程

```
1. 读取 oauth_state cookie，解析出 storedState、codeVerifier、lang
   └─ cookie 缺失或格式错误 → redirect error=invalid_state

2. 检查 query error 参数
   └─ 存在 → redirect error=access_denied（或原始 error 值）

3. 验证 query.state === storedState
   └─ 不匹配 → redirect error=invalid_state

4. 调用 Calieo token 端点，使用 code + codeVerifier 换取 token
   └─ 网络错误或 token 端点返回错误 → redirect error=token_exchange_failed

5. 验证 id_token（oauth4webapi 自动验证签名、issuer、audience、exp）
   └─ 验证失败 → redirect error=token_invalid

6. 提取 claims：sub、email、name（或 preferred_username）
   └─ email 为空 → redirect error=missing_claims

7. 查找或创建 users 记录（见 data-model.md 查找逻辑）

8. 写入 calieo_session cookie，清除 oauth_state cookie

9. redirect /{lang}/console
```

## 环境变量依赖

| 变量 | 说明 |
|------|------|
| `CALIEO_CLIENT_ID` | Calieo Client ID |
| `CALIEO_CLIENT_SECRET` | Calieo Client Secret（用于 token 换取） |
| `NEXT_PUBLIC_BASE_URL` 或 `BASE_URL` | 用于重建 redirect_uri（必须与注册时一致） |

## 安全要求

- state 验证必须在任何 token 操作之前完成
- id_token 验证由 `oauth4webapi` 完成（issuer 检查 + RS256 签名 + exp 检查）
- `oauth_state` cookie 验证后必须立即清除（防重放）
- `calieo_session` cookie 必须设置 `HttpOnly`、`SameSite=Lax`
- 所有错误路径均通过重定向处理，不暴露详细错误信息给浏览器
