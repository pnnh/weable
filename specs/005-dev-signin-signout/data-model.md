# Phase 1 Data Model: 开发环境模拟登录/退出页面

本功能不引入新表、不修改既有 schema。涉及实体及其状态如下。

## 实体

### 用户（users，既有表，无变更）

| 字段 | 类型 | 约束 | 本功能中的用途 |
|------|------|------|----------------|
| id | text | 主键（uuidv7/bs58 生成） | 写入 `user_id` cookie 的会话凭证值；cookie 分支按 id 回查用户 |
| name | text | NOT NULL | 新建用户时取表单"用户名称"；未填写时缺省取邮箱 |
| email | text | NOT NULL、唯一 | 登录时的匹配键；一个邮箱至多一个用户 |
| nickname / bio / createdAt | - | 既有 | 本功能不读不写 |

**校验规则**（源自 FR-002 / FR-004）：

- 邮箱：必填、trim 后非空、通过基础格式校验（含 `@` 与非空 local/domain 段）；入库前 trim。
- 名称：可选、trim；为空串视为未填写，落库缺省为邮箱。

### 登录会话（无持久化实体，由 cookie 承载）

| 属性 | 说明 |
|------|------|
| 载体 | `user_id` cookie（httpOnly、sameSite=lax、path=/） |
| 值 | `users.id` |
| 生效范围 | 仅开发环境可被创建（signin 页面在生产环境 notFound，无法写入） |

## 状态与转换

### 会话状态

```text
未登录 ──signin 成功（邮箱命中/新建）──▶ 已登录（身份 = 匹配或新建的用户）
已登录 ──signin 成功（任意邮箱）────▶ 已登录（身份切换为新用户，旧会话被覆盖）
已登录 ──signout─────────────────▶ 未登录（cookie 删除）
未登录 ──signout─────────────────▶ 未登录（幂等，页面提示后仍可执行跳转）
```

- FR-005（清除旧用户登录状态）由"cookie 单值覆盖"天然满足：写入新 id 即替换旧身份，无需显式清除步骤。
- 无效会话（cookie 中的 id 在 users 表不存在）：身份解析返回 null，等价于未登录（R2 决策）。

### 登录时用户行的解析顺序

```text
按 email 查 users
├── 命中 → 以该行登录（忽略表单名称，不更新行）
└── 未命中 → insert（id 自动生成、name、email），onConflictDoNothing 兜底
             → 按 email 回查 → 以该行登录
```
