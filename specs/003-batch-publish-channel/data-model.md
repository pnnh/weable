# Data Model: 图片批量设置发布状态与频道

**Feature**: 003-batch-publish-channel | **Date**: 2026-08-06

本功能**不新增、不变更任何持久化实体与字段**，仅对既有字段进行批量写入。API 路由迁移与登录门禁（FR-014 ~ FR-016）为纯路由层变更，不涉及数据模型；路由映射清单见 [contracts/console-api-migration.md](./contracts/console-api-migration.md)。

## 持久化实体（既有，无 schema 变更）

### Image（`images` 表）

| 字段 | 类型 | 与本功能的关系 |
|------|------|----------------|
| `id` | text PK | 批量操作的目标标识；格式 `[a-zA-Z0-9_-]+` |
| `userId` | text FK → users.id | 归属校验依据：仅 `userId = 当前用户` 的行可被更新 |
| `channelId` | text FK → channels.id，可空 | **批量设置频道**的写入目标；`null` 表示不归属任何频道 |
| `mimeType` | text | 值为 `"directory"` 时为目录行，不可被选择/批量操作 |
| `isPublished` | boolean，默认 false | **批量设置发布状态**的写入目标 |
| `updatedAt` | integer(ms) | 每次批量更新须同步刷新为当前时间 |

### Channel（`channels` 表）

| 字段 | 类型 | 与本功能的关系 |
|------|------|----------------|
| `id` | text PK | 频道下拉框选项的 value |
| `userId` | text FK → users.id | 下拉框候选过滤：仅列出 `userId = 当前用户` 的频道 |
| `name` | text | 频道下拉框选项的显示文本 |
| `createdAt` | integer(ms) | 下拉框排序依据（升序） |

### 校验规则（由本功能引入，位于服务端）

- `ids`：非空字符串数组；长度 ≤ 500；每个元素匹配 `/^[a-zA-Z0-9_-]+$/`
- `isPublished` 与 `channelId` 二选一且必填其一；`isPublished` 必须为布尔值；`channelId` 为 `null` 或当前用户名下已存在频道的 id
- 更新条件恒为 `id ∈ ids AND userId = 当前用户`，天然排除他人图片与已删除行

## 瞬态实体（客户端，不持久化）

### Selection（选择集）

| 属性 | 类型 | 说明 |
|------|------|------|
| `selectedIds` | `Set<string>` | 当前视图中被勾选的图片 id 集合，持有于 `ImagesBatchToolbar` |

**状态转换**：

```text
空集 ──行勾选/表头全选──▶ 非空（工具栏按钮可用）
非空 ──批量操作成功──▶ 空集（清空并 router.refresh()）
非空 ──弹窗取消──▶ 非空（保持不变）
任意 ──目录导航/页面刷新──▶ 空集（组件卸载自然清空）
```

表头复选框三态由选择集与当前可见图片行集合推导：

| 可见图片被选中数 | 表头状态 |
|------------------|----------|
| 0 | 未选中 |
| 全部 | 选中 |
| 部分 | 半选（indeterminate） |
