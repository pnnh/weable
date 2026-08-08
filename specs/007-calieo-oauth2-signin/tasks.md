# Tasks: Calieo OAuth2/OIDC 第三方登录接入

**功能目录**：`specs/007-calieo-oauth2-signin/`

**输入文档**：plan.md、spec.md、research.md、data-model.md、contracts/、quickstart.md

**格式说明**：
- **[P]**：可并行执行（不同文件，无未完成的依赖）
- **[USn]**：对应规格中的用户故事编号

---

## Phase 1：Setup（依赖安装与配置）

**目的**：安装 `oauth4webapi`，准备环境变量占位符

- [x] T001 执行 `pnpm add oauth4webapi`，确认 package.json 中新增依赖
- [x] T002 [P] 在项目根目录创建或更新 `.env.local.example`，新增 `CALIEO_CLIENT_ID=`、`CALIEO_CLIENT_SECRET=` 占位行；在 `wrangler.toml` 的 `[vars]` 中追加同名占位键

---

## Phase 2：Foundational（阻塞性基础工作）

**目的**：数据库 schema 变更 + OAuth 客户端工具封装，所有用户故事均依赖此阶段

**⚠️ 重要**：此阶段完成前，不得开始任何用户故事实现

- [x] T003 在 `src/db/schema.ts` 的 `users` 表定义中新增字段：`calieoSub: text("calieo_sub").unique()`
- [x] T004 执行 `pnpm drizzle-kit generate` 生成迁移文件（包含 `ALTER TABLE users ADD COLUMN calieo_sub TEXT UNIQUE`），再执行 `pnpm db:migrate` 应用到本地数据库
- [x] T005 创建 `src/lib/calieo-oauth.ts`：使用 `oauth4webapi` 封装以下内容：
  - `getAuthorizationServer()`：通过 `oauth4webapi.discoveryRequest` 从 `https://portal.calieo.xyz` 获取 AS metadata（含 JWKS URI、endpoints）
  - `buildOAuthClient()`：构造 `ClientAuth = oauth4webapi.ClientSecretPost(CALIEO_CLIENT_SECRET)`，返回 `oauth4webapi.Client` 对象（client_id = CALIEO_CLIENT_ID）
  - `generateAuthorizationUrl(state, codeChallenge, lang, redirectUri)`：构造并返回 Calieo 授权 URL（response_type=code, scope=openid profile email, PKCE S256）
  - `parseAndValidateIdToken(as, client, params, codeVerifier, redirectUri)`：调用 `oauth4webapi.authorizationCodeGrantRequest` + `oauth4webapi.processAuthorizationCodeResponse` + `oauth4webapi.validateAuthResponse`，提取并返回 `{sub, email, name}` claims

**Checkpoint**：基础层就绪，可开始实现用户故事

---

## Phase 3：User Story 1 — 生产环境 Calieo 登录（Priority: P1）🎯 MVP

**目标**：生产环境用户可通过 Calieo 完成完整 OAuth2/OIDC 授权并落地控制台

**独立测试**：生产构建下访问 `/en/account/signin`，点击 Calieo 按钮，完成授权后跳转 `/en/console`，`calieo_session` cookie 存在

### Phase 3 实现任务

- [x] T006 [P] [US1] 创建 `src/components/CalieoSignInButton.tsx`：`"use client"` 组件，渲染 `<a href="/api/auth/signin/calieo?lang={lang}">使用 Calieo 登录</a>` 样式按钮（与现有登录按钮风格一致）；接收 `lang` prop
- [x] T007 [US1] 创建 `src/app/api/auth/signin/calieo/route.ts`（`export async function GET(request: Request)`）：
  - 读取 `?lang` query 参数（缺省 `en`）
  - 调用 `oauth4webapi.generateRandomState()`、`oauth4webapi.generateRandomCodeVerifier()`、`oauth4webapi.calculatePKCECodeChallenge()`
  - 调用 `calieo-oauth.ts` 的 `buildOAuthClient` 和 `generateAuthorizationUrl`
  - 设置 `oauth_state` cookie：值为 `{state}::{codeVerifier}::{lang}`，属性：httpOnly=true, sameSite=lax, maxAge=600, path=/
  - 返回 `Response.redirect(authorizationUrl, 302)`
  - 缺少 `CALIEO_CLIENT_ID` 或 `CALIEO_CLIENT_SECRET` 时返回 500
- [x] T008 [US1] 创建 `src/app/api/auth/callback/calieo/route.ts`（`export async function GET(request: Request)`），实现完整回调处理：
  1. 读取 `oauth_state` cookie；缺失或格式非三段 → 清除 cookie，redirect `/{lang}/account/signin?error=invalid_state`
  2. 解析 `{storedState, codeVerifier, lang}` 三段
  3. 检查 query `error` 参数 → 存在则 redirect `/{lang}/account/signin?error={error}`
  4. 验证 `query.state === storedState` → 不匹配 redirect `/{lang}/account/signin?error=invalid_state`
  5. 调用 `calieo-oauth.ts` 的 `parseAndValidateIdToken` 换取并验证 token → 失败 redirect `/{lang}/account/signin?error=token_invalid`
  6. 提取 claims；`email` 为空 → redirect `/{lang}/account/signin?error=missing_claims`
  7. 用户查找逻辑（见 data-model.md）：先按 `calieo_sub` 查，再按 `email` 查，都没有则 `createId()` 新建
  8. 写入 `calieo_session` cookie：值为 `users.id`，httpOnly=true, sameSite=lax, maxAge=2592000, path=/
  9. 清除 `oauth_state` cookie（maxAge=0）
  10. redirect `/${lang}/console`
- [x] T009 [US1] 修改 `src/app/[lang]/account/signin/page.tsx`：
  - 移除 `if (process.env.NODE_ENV === "production") notFound()` 这行
  - 生产环境（`process.env.NODE_ENV === "production"`）：渲染标题"登录"+ `<CalieoSignInButton lang={l} />`，不渲染 `<SignInForm>`
  - 读取 `searchParams` 中的 `error` 参数，若存在则在页面顶部渲染友好错误提示（error code → 中文说明的映射）
  - 保持 `export const dynamic = "force-dynamic"`
- [x] T010 [US1] 修改 `src/lib/auth.ts` 的 `getCurrentUserOrNull()`：在 `user_id` cookie 判断块之后，新增第三路：读取 `calieo_session` cookie，若存在则 `db.select().from(users).where(eq(users.id, userId)).limit(1)` 查库，找到则返回用户，否则返回 null

**Checkpoint**：生产构建 + 配置有效凭据后，完整 Calieo 登录流程可端对端验证

---

## Phase 4：User Story 2 — 开发环境双入口（Priority: P2）

**目标**：开发环境登录页同时显示邮箱表单（上）和 Calieo 按钮（下），两者均可独立完成登录

**独立测试**：`pnpm dev` 访问 `/en/account/signin`，邮箱表单可提交，Calieo 按钮可跳转授权

### Phase 4 实现任务

- [x] T011 [US2] 修改 `src/app/[lang]/account/signin/page.tsx`（接续 T009 的改动）：开发环境（`else` 分支）渲染 `<SignInForm lang={l} />`，在其下方加分隔线 `<hr>` 或 `<div>OR</div>` 间隔，再渲染 `<CalieoSignInButton lang={l} />`；标题改为"开发环境登录"

**Checkpoint**：开发环境下两条登录路径均可工作且互不干扰

---

## Phase 5：User Story 3 — 回调安全防护（Priority: P2）

**目标**：所有回调错误路径均有明确处理，伪造 state 100% 被拒绝

**独立测试**：`curl "http://localhost:7600/api/auth/callback/calieo?code=fake&state=wrong"` → 302 to `?error=invalid_state`，无 session cookie

### Phase 5 实现任务

- [x] T012 [US3] 加固 `src/app/api/auth/callback/calieo/route.ts`：确保每条错误分支（网络超时、token 端点返回非 200、oauth4webapi 抛出异常）均被 try/catch 捕获后以 redirect 方式处理（不暴露堆栈），并在所有错误路径中清除 `oauth_state` cookie

**Checkpoint**：伪造/缺失/过期 state 的回调请求全部返回 redirect，不建立会话

---

## Phase 6：User Story 4 — 首次登录用户关联（Priority: P3）

**目标**：同一 Calieo 账号多次登录始终对应唯一 users 记录；已有 email 用户首次 Calieo 登录后自动关联 calieo_sub

**独立测试**：同一 Calieo 账号登录两次，`users` 表中仅一条记录；已有 email 用户登录后 `calieo_sub` 字段被填充

### Phase 6 实现任务

- [x] T013 [US4] 在 `src/app/api/auth/callback/calieo/route.ts` 的用户查找逻辑中补充：按 `email` 找到用户但 `calieo_sub` 为 null 时，执行 `db.update(users).set({ calieoSub: sub }).where(eq(users.id, existingUser.id)).run()` 关联 sub，再返回该用户（已在 T008 的步骤 7 预留位置，本任务补全关联更新逻辑）

**Checkpoint**：已有用户与新用户均可正确关联或创建，幂等性满足 SC-004

---

## Final Phase：Polish & 部署准备

**目的**：完善部署配置，验证 quickstart.md 所有场景

- [x] T014 [P] 在 `wrangler.toml` 中新增 `[vars]` 条目 `CALIEO_CLIENT_ID = ""` 并在注释中说明需通过 `wrangler secret put CALIEO_CLIENT_SECRET` 注入 secret；同步更新项目 README 的环境变量说明章节
- [x] T015 按照 `specs/007-calieo-oauth2-signin/quickstart.md` 逐一执行场景 A-G，确认全部通过；将验证结果记录为 checklist 勾选

---

## 依赖与执行顺序

### 阶段依赖

```
Phase 1 (Setup)
    └─► Phase 2 (Foundational)
            └─► Phase 3 (US1 P1)  ◄── MVP 截止点
                    └─► Phase 4 (US2 P2)
                    └─► Phase 5 (US3 P2)  ← 实为 T008 的加固，可与 Phase 4 并行
                            └─► Phase 6 (US4 P3)
                                    └─► Final Phase
```

### 用户故事内任务依赖

- **Phase 3**：T006 [P]（独立）；T007 → T008（callback 依赖 signin 的 cookie 格式约定）；T008 → T010（auth.ts 依赖 callback 写入的 cookie 名）；T009 依赖 T006（需引用 CalieoSignInButton）
- **Phase 4**：T011 依赖 T009（在同一文件上继续修改）
- **Phase 5**：T012 依赖 T008（加固已有实现）
- **Phase 6**：T013 依赖 T008（补全同一函数内逻辑）

### 文件修改汇总

| 文件 | 修改类型 | 涉及任务 |
|------|----------|----------|
| `src/db/schema.ts` | 修改 | T003 |
| `src/lib/auth.ts` | 修改 | T010 |
| `src/app/[lang]/account/signin/page.tsx` | 修改 | T009、T011 |
| `src/lib/calieo-oauth.ts` | 新增 | T005 |
| `src/components/CalieoSignInButton.tsx` | 新增 | T006 |
| `src/app/api/auth/signin/calieo/route.ts` | 新增 | T007 |
| `src/app/api/auth/callback/calieo/route.ts` | 新增 | T008、T012、T013 |
| `wrangler.toml` | 修改 | T002、T014 |
| `.env.local.example` | 新增/修改 | T002 |
| `migrations/*` | 新增 | T004 |

---

## 并行执行示例

### Phase 2 内部并行（T005 与 T003+T004 可并行）

```
同时开始：
  任务 A：T003 + T004（schema 变更 + 迁移）
  任务 B：T005（calieo-oauth.ts 封装，不依赖 schema）
```

### Phase 3 内部并行

```
T006（CalieoSignInButton）可与 T007、T008 同时进行（不同文件）
T009（page.tsx）依赖 T006 完成
T010（auth.ts）依赖 T008 确认 cookie 名称
```

---

## 实现策略

### MVP 优先（仅 User Story 1）

1. 完成 Phase 1：Setup
2. 完成 Phase 2：Foundational（必须，阻塞后续）
3. 完成 Phase 3：User Story 1（T006～T010）
4. **验证**：配置有效 Calieo 凭据，执行 quickstart.md 场景 B、C、D
5. 此时生产登录已完全可用

### 增量交付

1. Phase 1 + Phase 2 → 基础就绪
2. Phase 3 → 生产 Calieo 登录可用（MVP）
3. Phase 4 → 开发体验完善
4. Phase 5 → 安全防护加固（实际大部分在 Phase 3 的 T008 中已实现）
5. Phase 6 → 用户关联完整性
6. Final → 部署就绪

---

## 备注

- [P] 任务 = 不同文件，可并行，无未完成的前置依赖
- [USn] 标签追踪任务到规格用户故事
- T008 是核心任务，包含安全、user lookup、会话写入全部逻辑；编写时参考 `contracts/callback-route.md` 的完整流程图
- 本功能不需要新增测试文件（规格未明确要求 TDD）；quickstart.md 场景作为手动验证替代
- 提交顺序建议：T001-T004 → T005 → T006-T010（一次提交）→ T011 → T012-T013 → T014-T015
