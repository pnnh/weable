# API 合约：GET /api/auth/signin/calieo

**功能**：007-calieo-oauth2-signin | **文件**：`src/app/api/auth/signin/calieo/route.ts`

---

## 概述

OAuth2 授权流程发起端点。生成 PKCE code verifier 和随机 state，将其存入短期 cookie，
然后将用户重定向至 Calieo 授权页面。

## 请求

```
GET /api/auth/signin/calieo?lang={lang}
```

### Query 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `lang` | string | 否 | 语言代码（`en`、`zh` 等）；缺省使用 `en` |

### 请求头

无特殊要求。

## 响应

### 成功（302 重定向）

```
HTTP/1.1 302 Found
Location: https://portal.calieo.xyz/api/oauth/authorize?
  response_type=code
  &client_id={CALIEO_CLIENT_ID}
  &redirect_uri={CALLBACK_URL}
  &scope=openid%20profile%20email
  &state={random_state}
  &code_challenge={s256_challenge}
  &code_challenge_method=S256
Set-Cookie: oauth_state={state}::{codeVerifier}::{lang}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/
```

### 错误：缺少环境变量（500）

```
HTTP/1.1 500 Internal Server Error
Content-Type: text/plain

OAuth 配置缺失
```

## 环境变量依赖

| 变量 | 说明 |
|------|------|
| `CALIEO_CLIENT_ID` | Calieo 注册的 OAuth2 Client ID |
| `NEXT_PUBLIC_BASE_URL` 或 `process.env.BASE_URL` | 用于构建 redirect_uri；缺省 `http://localhost:7600` |

## 安全要求

- `state` 使用 `oauth4webapi.generateRandomState()` 生成（≥32 字节随机）
- `codeVerifier` 使用 `oauth4webapi.generateRandomCodeVerifier()` 生成
- cookie 必须设置 `HttpOnly`、`SameSite=Lax`、`Max-Age=600`
