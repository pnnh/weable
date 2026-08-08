# 数据模型：Calieo OAuth2/OIDC 接入

**功能**：007-calieo-oauth2-signin | **日期**：2026-08-08

---

## 实体变更：users 表

### 现有结构

```sql
CREATE TABLE users (
  id         TEXT PRIMARY KEY,          -- base58-UUIDv7，应用内部主键
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  nickname   TEXT,
  bio        TEXT,
  created_at INTEGER NOT NULL
);
```

### 变更：新增 calieo_sub 列

```sql
ALTER TABLE users ADD COLUMN calieo_sub TEXT UNIQUE;
```

**字段说明**：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `calieo_sub` | TEXT | UNIQUE, NULL 允许 | Calieo OIDC `sub` claim；未通过 Calieo 登录过的用户为 NULL |

**索引**：SQLite UNIQUE 约束自动创建唯一索引，无需额外建索引。

### 变更后完整结构

```sql
CREATE TABLE users (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL UNIQUE,
  nickname    TEXT,
  bio         TEXT,
  created_at  INTEGER NOT NULL,
  calieo_sub  TEXT    UNIQUE          -- 新增
);
```

### Drizzle Schema 变更

**文件**：`src/db/schema.ts`，`users` 表新增：
```typescript
calieoSub: text("calieo_sub").unique(),
```

---

## 临时实体：OAuth State（Cookie，无数据库存储）

OAuth state 和 PKCE code verifier 通过短期 httpOnly cookie 传递，不持久化到数据库。

**Cookie 名称**：`oauth_state`

**值格式**（`::` 分隔，三段）：

```
{state}::{codeVerifier}::{lang}
```

| 段 | 内容 | 生成方式 |
|----|------|----------|
| `state` | 32 字节随机 hex 字符串（64 字符） | `oauth4webapi.generateRandomState()` |
| `codeVerifier` | 43-128 字符 base64url 字符串 | `oauth4webapi.generateRandomCodeVerifier()` |
| `lang` | 语言代码（如 `en`、`zh`） | 从请求 URL query 参数读取 |

**Cookie 属性**：

| 属性 | 值 |
|------|----|
| `httpOnly` | true |
| `sameSite` | `lax` |
| `path` | `/` |
| `maxAge` | 600（10 分钟） |
| `secure` | 生产环境 true，开发环境 false |

---

## 会话实体：calieo_session Cookie

Calieo 授权成功后写入，供后续请求身份识别。

**Cookie 名称**：`calieo_session`

**值**：`users.id`（base58-UUIDv7，本应用内部用户主键）

**Cookie 属性**：

| 属性 | 值 |
|------|----|
| `httpOnly` | true |
| `sameSite` | `lax` |
| `path` | `/` |
| `maxAge` | 2592000（30 天） |
| `secure` | 生产环境 true，开发环境 false |

---

## 用户查找与创建逻辑（回调时）

```
输入：calieoSub（string），email（string），name（string）

1. SELECT * FROM users WHERE calieo_sub = calieoSub LIMIT 1
   → 找到：直接返回该用户

2. SELECT * FROM users WHERE email = email LIMIT 1
   → 找到：UPDATE users SET calieo_sub = calieoSub WHERE id = rows[0].id
            返回该用户

3. INSERT INTO users (name, email, calieo_sub) VALUES (name, email, calieoSub)
   SELECT * FROM users WHERE calieo_sub = calieoSub LIMIT 1
   返回新建用户
```

---

## auth.ts 身份解析链（变更后）

```
请求进入 getCurrentUserOrNull()
        │
        ▼
1. cf-access-jwt-assertion 请求头 / CF_Authorization cookie
   → 解析 CF JWT → ensureUserRow(sub, name, email) → 返回用户
        │（无 CF 头）
        ▼
2. user_id cookie（开发环境模拟登录）
   → 按 id 查库 → 返回用户（或 null）
        │（无 user_id）
        ▼
3. calieo_session cookie（新增）
   → 按 id 查库 → 返回用户（或 null）
        │（无 calieo_session）
        ▼
   返回 null
```

---

## 迁移文件

**路径**：`migrations/`（由 `pnpm drizzle-kit generate` 自动生成）

**预期 SQL**：
```sql
ALTER TABLE `users` ADD `calieo_sub` text;
CREATE UNIQUE INDEX `users_calieo_sub_unique` ON `users` (`calieo_sub`);
```

**执行命令**：
```bash
pnpm drizzle-kit generate   # 生成迁移文件
pnpm db:migrate             # 应用迁移（本地）
```
