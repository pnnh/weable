# 快速验证指南：Calieo OAuth2/OIDC 接入

**功能**：007-calieo-oauth2-signin | **日期**：2026-08-08

---

## 前提条件

### 1. 依赖安装

```bash
pnpm add oauth4webapi
```

### 2. 数据库迁移

```bash
pnpm drizzle-kit generate   # 生成包含 calieo_sub 列的迁移文件
pnpm db:migrate              # 应用到本地 SQLite
```

### 3. 环境变量配置

在 `.env.local` 中添加：

```env
CALIEO_CLIENT_ID=<从 Calieo 控制台获取>
CALIEO_CLIENT_SECRET=<从 Calieo 控制台获取>
# 如需覆盖默认 localhost:7600：
# BASE_URL=http://localhost:7600
```

在 Calieo 控制台注册回调 URL：
- 开发：`http://localhost:7600/api/auth/callback/calieo`
- 生产：`https://<your-domain>/api/auth/callback/calieo`

---

## 验证场景

### 场景 A：开发环境 — 页面条件渲染

```bash
pnpm dev
# 访问 http://localhost:7600/en/account/signin
```

**预期结果**：
- ✅ 邮箱表单显示在上方
- ✅ 分隔线下方显示"使用 Calieo 登录"按钮
- ✅ 两个入口均可交互

---

### 场景 B：生产构建 — 仅显示 Calieo 登录

```bash
pnpm build && pnpm start
# 访问 http://localhost:3000/en/account/signin
```

**预期结果**：
- ✅ 仅显示"使用 Calieo 登录"按钮
- ✅ 邮箱表单不渲染（DOM 中不存在）
- ✅ 页面不返回 404

---

### 场景 C：完整 OAuth2/OIDC 授权流程

```bash
# 开发环境启动
pnpm dev
```

1. 访问 `http://localhost:7600/en/account/signin`
2. 点击"使用 Calieo 登录"
3. **预期**：浏览器跳转至 `https://portal.calieo.xyz/api/oauth/authorize?...`，URL 中包含 `state=`、`code_challenge=`、`code_challenge_method=S256`
4. 在 Calieo 完成登录授权
5. **预期**：浏览器回调至 `http://localhost:7600/api/auth/callback/calieo?code=...&state=...`
6. **预期**：自动重定向至 `http://localhost:7600/en/console`
7. **验证**：浏览器开发者工具 → Cookies → 确认存在 `calieo_session`（httpOnly），`oauth_state` 已被清除

---

### 场景 D：CSRF 防护验证

```bash
# 手动构造伪造回调（开发环境）
curl -v "http://localhost:7600/api/auth/callback/calieo?code=fake&state=wrongstate"
```

**预期结果**：
- ✅ 响应为 302，Location 包含 `error=invalid_state`
- ✅ 无 `calieo_session` cookie 被写入

---

### 场景 E：用户取消授权

在 Calieo 授权页点击"取消"或"拒绝"。

**预期结果**：
- ✅ 浏览器回调至 `/api/auth/callback/calieo?error=access_denied`
- ✅ 重定向至登录页，URL 含 `?error=access_denied`
- ✅ 登录页显示友好错误提示
- ✅ 无会话 cookie 写入

---

### 场景 F：首次登录创建用户

使用从未登录过的 Calieo 账号完成授权。

**验证方式**：
```bash
# 查询本地 SQLite
sqlite3 .data/weable.db \
  "SELECT id, name, email, calieo_sub FROM users ORDER BY created_at DESC LIMIT 3;"
```

**预期结果**：
- ✅ 新增一条记录，`calieo_sub` 字段不为 NULL
- ✅ 再次以相同账号登录后，`users` 表中该账号仍只有一条记录

---

### 场景 G：已有邮箱用户关联 Calieo Sub

用于验证 email 已存在但 `calieo_sub` 为 NULL 的用户（如之前通过 CF Access 登录过）：

1. 使用与已有用户相同 email 的 Calieo 账号完成授权
2. **预期**：不创建新用户，而是将 `calieo_sub` 更新到已有用户记录

---

## 参考文档

- 数据模型：[data-model.md](data-model.md)
- Signin 路由合约：[contracts/signin-route.md](contracts/signin-route.md)
- Callback 路由合约：[contracts/callback-route.md](contracts/callback-route.md)
- oauth4webapi 示例：https://github.com/panva/oauth4webapi/blob/main/examples/oidc.ts
