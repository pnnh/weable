# Quickstart: 图片批量设置发布状态与频道（含 API 迁移）

**Feature**: 003-batch-publish-channel | **Date**: 2026-08-06

本指南提供端到端手工验证场景。批量接口契约见 [contracts/patch-images-batch.md](./contracts/patch-images-batch.md)，迁移映射与 401 约定见 [contracts/console-api-migration.md](./contracts/console-api-migration.md)，实体与校验规则见 [data-model.md](./data-model.md)。

## 前置条件

1. `pnpm install`
2. `pnpm dev` 启动开发服务器，访问 `http://localhost:3000/en/console/images`
3. 当前账号已有：至少 1 个频道、根目录下至少 1 个含图片的目录、根目录下至少 2 张图片

> 注意：开发环境下未登录会回退到 dev user，401 门禁不会触发；401 相关验证（S6）需用生产构建。

## 验证场景

### S1: 复选框与选择交互（FR-001 ~ FR-003）

1. 打开列表页，确认表头最左侧出现复选框，每个**图片**行最左侧出现复选框，**目录行没有**复选框
2. 勾选 2 张图片 → 工具栏"设置发布状态""设置频道"按钮从禁用变为可用
3. 点击表头复选框 → 当前视图所有图片被勾选，表头变为选中态；取消其中 1 张 → 表头变为半选态
4. 展开某目录 → 其子行中的图片同样可勾选，且纳入表头全选范围
5. 进入某目录后再返回根目录 → 选择已清空，工具栏按钮回到禁用态

**预期**：选择状态纯前端，刷新页面后选择清空。

### S2: 批量设置发布状态（P1，FR-004 ~ FR-006）

1. 勾选 3 张未发布图片 → 点击"设置发布状态" → 弹窗出现，含"已发布/未发布"互斥选项
2. 选择"已发布"并确认 → 确认按钮进入提交态（不可重复点击）；成功后弹窗关闭、选择清空、3 张图片状态徽章变为"已发布"
3. 再次勾选同 3 张 → 设置"未发布" → 徽章回到未发布态
4. 打开弹窗后点击取消/关闭 → 数据无任何变化
5. 验证数据：`sqlite3 .data/weable.db "select id, is_published from images where id in (...)"` 与界面一致，且 `updatedAt` 已刷新；浏览器网络面板确认请求发往 `/en/console/api/images/batch`

### S3: 批量设置频道（P2，FR-007 ~ FR-009）

1. 勾选 2 张图片 → 点击"设置频道" → 弹窗下拉框列出本人全部频道 + "空"选项
2. 选择某频道并确认 → 2 张图片归属该频道（数据库 `channel_id` 一致）
3. 再次勾选 → 选择"空"并确认 → `channel_id` 变为 NULL
4. （可选）临时删除账号下全部频道后重试 → 下拉框仅含"空"选项，确认后仍可清除归属

### S4: 批量接口边界与安全（FR-012、SC-005）

1. 不勾选任何图片 → 两个批量按钮均禁用
2. 用 curl 携带登录态直接调用 `/en/console/api/images/batch`（契约各失败用例）：
   - `ids` 为空 / 超过 500 / 含非法字符 → `400`
   - 同时传 `isPublished` 与 `channelId` → `400`
   - `channelId` 传他人频道 ID → `400`
   - `ids` 全部为已删除或不存在的 ID → `404`
   - `ids` 混入目录 ID → 目录不受影响，`updated` 不包含该行
   - `[lang]` 传非法值（如 `/xx/console/api/images/batch`）→ `404`

### S5: 多语言（FR-013）

1. 依次访问 `/zh/console/images`、`/ja/console/images` 等语言变体
2. 确认工具栏按钮、两个弹窗、下拉框"空"选项的文案均按当前语言显示，无英文键名裸露

### S6: 登录门禁（FR-014，需生产构建）

1. `pnpm build && pnpm start`，使用**无** `CF_Authorization` / `user_id` cookie 的浏览器（或 curl 不带 cookie）
2. 请求任一控制台 API（如 `curl -i http://localhost:3000/en/console/api/images`）→ 期望 `401` 且 Body 为 `{"error":"Unauthorized"}`
3. 对全部迁移路由各抽查至少 1 个方法与路径（含 GET 类与 POST 类），均返回 401
4. 恢复登录态后同请求恢复正常响应

### S7: 旧路由删除与迁移完整性（FR-015）

1. 开发服务器下逐一请求已删除的旧路径（如 `/api/images`、`/api/upload`、`/api/directories`、`/api/channels/x`、`/api/user/profile`）→ 全部 `404`
2. 走查控制台全部既有流程无回归：树展开加载子目录、新建目录、上传单张/多张图片、编辑保存、删除图片、频道删除、频道头像上传、个人资料与头像修改——网络面板确认请求全部发往 `/{lang}/console/api/...`
3. 全局搜索 `src/` 确认不再有指向已删除旧路径的 `fetch` 或 `<img>` src

### S8: 公开页面不受影响（FR-016）

1. 未登录状态访问公开首页 `/en`、`/en/images/[某已发布图片id]`、`/en/channels`、`/en/channels/[id]` → 页面正常渲染
2. 图片缩略图/详情图（`/api/images/[id]/file`）与频道头像（`/api/channel/avatar/[id]`）正常加载
3. 控制台内图片缩略图与详情页预览图改走控制台副本后仍正常显示，且请求路径为 `/{lang}/console/api/images/[id]/file`

## 完成标准

- S1 ~ S8 全部通过
- `pnpm build` 无类型/构建错误
