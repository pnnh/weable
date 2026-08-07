# Quickstart: 开发环境模拟登录/退出页面验证

## 前置条件

- 已安装依赖：`pnpm install`
- 本地数据库已迁移：`pnpm db:migrate`

## 启动

```bash
pnpm dev   # http://localhost:7600
```

以下场景均使用 `http://localhost:7600/zh/account/signin` 演示（其他受支持语言前缀行为一致）。
建议每场景开始前在浏览器 DevTools 中删除 `user_id` cookie 以重置状态。

## 验证场景

### 1. 新用户登录（US1 场景 1）

1. 确认未登录（无 `user_id` cookie），访问 `/zh/console` → 页面报错/不可用（不再自动获得 dev 账号）。
2. 访问 `/zh/account/signin`，输入全新邮箱（如 `alice@example.com`）与名称"张三"，提交。
3. **预期**：跳转 `/zh/console`，欢迎语显示"张三"；`user_id` cookie 已设置。

### 2. 已有用户登录不重复创建（US1 场景 2）

1. 清除 cookie 后再次访问 signin，输入同一邮箱 `alice@example.com`，名称填"李四"，提交。
2. **预期**：跳转 console 后欢迎语仍为"张三"（以邮箱匹配已有用户，名称不覆盖既有资料）；users 表无新增行。

### 3. 身份切换（US1 场景 3）

1. 保持场景 2 的登录态，访问 signin，输入另一邮箱 `bob@example.com` 提交。
2. **预期**：跳转 console 后身份为 bob；`user_id` cookie 值已变更（旧会话被覆盖）。

### 4. 表单校验（US1 场景 4）

1. 空邮箱提交 → **预期**：停留原页并提示邮箱必填。
2. 输入非法格式（如 `abc`）提交 → **预期**：停留原页并提示邮箱格式错误。

### 5. 退出页（US2）

1. 已登录时访问 `/zh/account/signout` → **预期**：展示当前用户名称与邮箱及退出按钮。
2. 点击退出 → **预期**：跳转回 signin 页；`user_id` cookie 被删除；此时访问 `/zh/console` 不可用。
3. 未登录时访问 signout → **预期**：显示"当前未登录"提示与前往 signin 的链接，点击可到达 signin。

### 6. 取消 dev 回退（US3）

1. 删除 `user_id` cookie，访问 `/zh/console/images` 与任一 `/zh/console/api/*` 接口。
2. **预期**：页面不可用、接口返回 401 + JSON（不再出现 dev@local 身份）。

### 7. 生产环境屏蔽（SC-004）

```bash
pnpm build && pnpm start
```

1. 访问 `/zh/account/signin` 与 `/zh/account/signout` → **预期**：均为 404，无任何表单内容。
2. 验证 console 相关页面行为无回归。

## 类型检查

```bash
npx tsc --noEmit
```

**预期**：无错误。
