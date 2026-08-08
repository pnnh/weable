# 功能规格：Calieo OAuth2/OIDC 第三方登录接入

**功能目录**：`specs/007-calieo-oauth2-signin`

**创建日期**：2026-08-08

**状态**：Draft

## 用户场景与测试 *(必填)*

### 用户故事 1 - 生产环境用户通过 Calieo 账号登录（优先级：P1）

一个新访客或已有用户访问登录页，点击"使用 Calieo 登录"按钮，完成 Calieo 标准授权流程后，
自动跳转至控制台。整个过程不需要在本应用输入任何密码或凭证。

**为何此优先级**：生产环境的唯一合法登录入口，直接决定产品能否上线使用。

**独立测试**：在生产构建下访问 `/en/account/signin`，仅显示 Calieo 登录按钮，
点击后被重定向至 Calieo，授权成功后回调并落地控制台，会话有效。

**验收场景**：

1. **Given** 用户在生产环境访问 `/[lang]/account/signin`，**When** 页面加载完成，**Then** 仅显示"使用 Calieo 登录"按钮，不显示任何邮箱/密码表单
2. **Given** 用户点击"使用 Calieo 登录"，**When** 跳转至 Calieo 完成授权，**Then** 浏览器回调到本站，用户被识别并登录，随即跳转控制台
3. **Given** 已登录用户重新访问登录页，**When** 会话仍有效，**Then** 自动跳转控制台，不要求重新登录
4. **Given** 用户在 Calieo 授权页取消或拒绝授权，**When** 回调至本站，**Then** 显示友好错误提示，停留在登录页，不写入任何会话

---

### 用户故事 2 - 开发环境同时支持邮箱模拟登录与 Calieo 登录（优先级：P2）

开发者在本地环境调试时，既可使用原有邮箱模拟登录（无需配置 Calieo 凭据），
也可测试 Calieo 完整 OAuth2 流程（配置凭据后）。

**为何此优先级**：不影响已有开发工作流，同时允许端对端验证 Calieo 流程。

**独立测试**：在 `NODE_ENV=development` 下访问登录页，
同时看到邮箱表单和 Calieo 登录按钮；两条路径各自均可独立完成登录并落地控制台。

**验收场景**：

1. **Given** 开发环境登录页，**When** 页面渲染，**Then** 邮箱表单在上方，Calieo 登录按钮在表单下方，两者均可点击
2. **Given** 开发者通过邮箱表单提交，**When** 邮箱有效，**Then** 沿用现有 mock 登录逻辑，写入 `user_id` cookie 并跳转控制台
3. **Given** 开发者点击 Calieo 登录按钮，**When** 完成 Calieo 授权流程，**Then** 以 Calieo 身份登录，跳转控制台

---

### 用户故事 3 - OAuth2 回调安全防护（优先级：P2）

系统在处理 Calieo 回调时，验证 `state` 参数防止 CSRF，验证 OIDC `id_token` 合法性，
仅在所有校验通过后才建立会话。

**为何此优先级**：安全基线，不可省略；但对终端用户无感知，因此优先级与 P1 并列但以用户流程为首。

**独立测试**：伪造或篡改回调参数（state 不匹配、token 签名无效），
系统应返回登录失败并拒绝建立会话。

**验收场景**：

1. **Given** 回调携带与发起请求不匹配的 `state`，**When** 系统处理回调，**Then** 拒绝登录，显示错误，不写入任何会话 cookie
2. **Given** 回调携带无效或已过期的 `id_token`，**When** 系统校验，**Then** 拒绝登录，显示错误

---

### 用户故事 4 - 首次登录自动创建用户记录（优先级：P3）

Calieo 身份认证成功后，若该用户在本应用数据库中不存在，系统自动创建用户记录；
若已存在则直接使用，不重复创建。

**为何此优先级**：数据层基础能力，构建在 P1 流程之上。

**独立测试**：使用从未登录过的 Calieo 账号完成授权，检查数据库新增一条对应 `users` 记录；
再次登录同一账号，`users` 表中仍只有一条记录。

**验收场景**：

1. **Given** Calieo 返回一个本应用从未见过的 `sub`，**When** 授权成功，**Then** 自动创建用户记录（email、name 来自 OIDC claims），跳转控制台
2. **Given** Calieo 返回已存在的 `sub`，**When** 授权成功，**Then** 直接使用已有用户记录，不重复创建

---

### 边界情况

- Calieo 服务不可用或超时时，登录页如何降级？→ 显示错误提示，不崩溃，回调路由返回 HTTP 错误页
- Calieo 返回的 `email` 为空或缺失时，如何处理？→ 拒绝登录，提示用户联系支持
- 多语言路径（`/zh/account/signin`、`/ja/account/signin`等）是否都正确处理回调 `lang` 参数？→ 是，所有已支持语言均适用

## 需求 *(必填)*

### 功能需求

- **FR-001**：系统 MUST 在 `/[lang]/account/signin` 页面（所有已支持语言）提供"使用 Calieo 登录"入口
- **FR-002**：生产环境（`NODE_ENV=production`）下，系统 MUST 仅显示 Calieo 登录入口，隐藏邮箱模拟登录表单
- **FR-003**：开发环境（`NODE_ENV=development`）下，系统 MUST 同时显示邮箱模拟登录表单（在上）和 Calieo 登录按钮（在下）
- **FR-004**：系统 MUST 实现标准 OAuth2 授权码流程（Authorization Code Flow）：发起授权跳转 → 接收回调 → 用 code 换取 token
- **FR-005**：系统 MUST 在发起 OAuth2 请求时生成不可预测的 `state` 参数，并在回调时验证其一致性（防 CSRF）
- **FR-006**：系统 MUST 验证 Calieo 返回的 OIDC `id_token` 签名合法性（通过 Calieo OIDC 发现文档获取公钥）
- **FR-007**：系统 MUST 从 OIDC claims 中提取 `sub`、`email`、`name`（或 `preferred_username`）作为用户身份
- **FR-008**：授权成功后，系统 MUST 写入安全的会话标识（`httpOnly` cookie），供后续请求身份验证
- **FR-009**：授权成功后，若用户在数据库中不存在，系统 MUST 自动创建用户记录；若已存在，MUST 直接复用
- **FR-010**：OAuth2 回调路由 MUST 处理授权失败、`state` 不匹配、token 校验失败等错误情况，均以友好提示呈现
- **FR-011**：Calieo 的 OAuth2 客户端凭据（Client ID、Client Secret）MUST 通过环境变量注入，不得硬编码

### 关键实体 *(涉及数据)*

- **OAuthSession（临时）**：发起 OAuth2 请求时生成的临时状态，包含 `state`（随机字符串）、`lang`（目标语言）、创建时间；用于回调时校验，校验后丢弃。存储方式：加密 cookie 或服务端 KV，生命周期 ≤ 10 分钟
- **User**：已有实体（`users` 表），新增需考虑通过 Calieo `sub` 查找用户的能力（`sub` 作为 `users.id` 或新增关联字段）

## 成功标准 *(必填)*

### 可度量成果

- **SC-001**：生产环境登录页仅显示 Calieo 登录入口，邮箱表单不可访问（功能验证）
- **SC-002**：完整 OAuth2/OIDC 授权流程可在 30 秒内完成（从点击登录到落地控制台）
- **SC-003**：CSRF 防护有效：伪造 `state` 的回调请求 100% 被拒绝，不建立会话
- **SC-004**：同一 Calieo 账号多次登录，`users` 表中始终只有一条对应记录（幂等性）
- **SC-005**：Calieo 不可用时，登录页正常渲染，不出现未处理异常（优雅降级）

## 假设与技术分析

### 关于现有认证机制

当前生产环境依赖 **Cloudflare Access**（零信任网关）在网络层完成认证，应用层仅消费 `cf-access-jwt-assertion` 请求头。本功能将在应用层**叠加**一套独立的 OIDC 客户端流程，两套机制并存：

- Cloudflare Access JWT 认证优先级高于新 OIDC 会话（`auth.ts` 中现有解析链顺序不变）
- 新增的 Calieo OIDC 会话 cookie 名称需避免与现有 `user_id`、`CF_Authorization` 冲突，建议使用 `calieo_session`

### 关于第三方库选型

| 方案 | 适配性 | 复杂度 | 说明 |
|------|--------|--------|------|
| **Arctic**（推荐） | ✅ Cloudflare Workers 兼容（无 Node.js 原生模块依赖） | 低 | 专为 edge runtime 设计的轻量 OAuth2/OIDC 客户端；支持通用 OIDC provider；与 oslo 配合处理 JWT 验证 |
| next-auth v5（Auth.js） | ⚠️ Cloudflare Workers 兼容性有限（Workers adapter 仍处于实验阶段） | 高 | 功能全面但对本项目属于过度工程化；需 `@auth/drizzle-adapter`；存在已知的 edge runtime 兼容问题 |
| 手工实现 OIDC | ✅ 完全兼容 | 中 | 代码量较多但无额外依赖；需自行实现 PKCE、state、token 验证等 |

**推荐方案**：使用 **Arctic**（`arctic` npm 包）实现 OIDC 客户端流程，配合 **oslo**（`oslo` npm 包）处理 JWT 验证与加密工具。两者均为 edge runtime 优先设计，无 Node.js 原生 API 依赖，与 Cloudflare Workers 部署完全兼容。

### 关于 OAuth2 回调路由

Calieo 需要配置回调 URL。建议使用 `/api/auth/callback/calieo` 作为回调端点（Next.js API Route），
对应 `src/app/api/auth/callback/calieo/route.ts`。

`state` 临时值建议存储在加密的 short-lived cookie（而非服务端 KV），以保持无状态 Cloudflare Workers 架构。

### 关于 users 表与 Calieo sub 映射

现有 `users.id` 字段存储 Cloudflare Access 的 `sub`（UUID 格式）。
Calieo `sub` 可能格式不同，需评估：
- 方案 A：直接用 Calieo `sub` 作为 `users.id`（若格式兼容）
- 方案 B：新增 `users.calieo_sub` 字段存储 Calieo 身份标识（推荐，避免与 Cloudflare Access sub 冲突）

### 关于环境变量

需新增以下环境变量（本地 `.env.local`，生产 Cloudflare 环境变量/Secrets）：
- `CALIEO_CLIENT_ID`
- `CALIEO_CLIENT_SECRET`
- `SESSION_SECRET`（用于加密 state cookie，若尚不存在）

Calieo OIDC 发现文档地址：`https://portal.calieo.xyz/.well-known/openid-configuration`

### 关于开发环境的模拟登录

现有 `src/app/[lang]/account/signin/page.tsx` 已有 `if (process.env.NODE_ENV === "production") notFound()` 保护。
本功能调整为：生产环境可访问登录页，但仅显示 Calieo 按钮；开发环境显示两者。
这意味着需要**移除**现有的 `notFound()` 生产拦截逻辑。
