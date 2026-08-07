# Contract: 开发环境登录/退出页面

本功能对外接口为两个页面路由与其内嵌 Server Action，不新增 REST API。
所有路由均带 `[lang]` 前缀，lang 非法时与既有页面一致返回 404；生产环境一律 404。

## 页面契约

### GET `/[lang]/account/signin`（仅开发环境）

| 前置状态 | 渲染内容 |
|----------|----------|
| 任意（已登录/未登录均可访问） | 登录表单：邮箱输入框（必填）、用户名称输入框（可选）、提交按钮；上次提交校验失败时展示错误提示 |

### GET `/[lang]/account/signout`（仅开发环境）

| 前置状态 | 渲染内容 |
|----------|----------|
| 已登录 | 当前用户的名称与邮箱 + "退出登录"按钮（提交 signOut Action 的表单） |
| 未登录 | "当前未登录"提示 + 指向 `/[lang]/account/signin` 的链接 |

### 生产环境

两路由在 `NODE_ENV === 'production'` 时返回 404（与不存在的路由一致），不渲染任何内容。

## Server Action 契约

### `signIn`（`signin/actions.ts`）

- **输入**（FormData）：
  - `email`: string，必填；trim 后须通过基础邮箱格式校验
  - `name`: string，可选；trim 后为空视为未填写
- **行为**：
  - 校验失败 → 返回错误信息，页面原址展示，不写 cookie、不跳转
  - 校验通过 → 按 [data-model.md](../data-model.md) 的解析顺序取得用户行 → 设置 `user_id` cookie（值为 `users.id`，httpOnly、sameSite=lax、path=/，覆盖任何旧值）→ 跳转 `/[lang]/console`
- **副作用**：users 表可能新增一行（邮箱不存在时）；旧会话凭证被覆盖（FR-005）

### `signOut`（`signout/actions.ts`）

- **输入**：无
- **行为**：删除 `user_id` cookie → 跳转 `/[lang]/account/signin`
- **副作用**：无数据变更；幂等

## 与既有认证链的关系

`getCurrentUserOrNull`（src/lib/auth.ts）变更后解析顺序：

```text
Cloudflare Access JWT（生产既有，不变）
  → user_id cookie（变更：按 users.id 查库；行不存在视为无效会话返回 null）
  → null（变更：移除开发环境 dev 账号回退）
```

console 页面（`getCurrentUser` 抛错 → 500/错误页）与 `/_lib/gate.ts`（401 + JSON）的消费行为不变，仅"未登录"判定面扩大（不再自动回退 dev 账号）。
