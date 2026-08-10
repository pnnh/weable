# Contract: DELETE /[lang]/console/api/images/batch

**Feature**: `010-batch-delete-upload-queue`
**Date**: 2026-08-10

## 概述

在现有 `src/app/[lang]/console/api/images/batch/route.ts` 文件中新增 `DELETE` 处理函数，用于批量删除图片（同时清除 R2 存储文件和 D1 数据库记录）。

现有 `PATCH` 方法（批量设置发布状态/频道）保持不变。

---

## 端点

```
DELETE /{lang}/console/api/images/batch
```

**认证**: 需登录（`requireConsoleUser`，未登录返回 401）

**Content-Type**: `application/json`

---

## 请求体

```json
{
  "ids": ["img_id_1", "img_id_2", "img_id_3"]
}
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `ids` | `string[]` | 非空数组，长度 1–500，元素匹配 `/^[a-zA-Z0-9_-]+$/` | 要删除的图片 ID |

---

## 响应

### 200 成功

```json
{
  "ok": true,
  "deleted": 3
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `ok` | `true` | 操作完成标识 |
| `deleted` | `number` | 实际从数据库删除的记录数（可能少于 `ids.length`，如某些 id 不属于当前用户或已被删除） |

**注意**：`deleted` 可能为 0（所有 id 均不属于当前用户），此时仍返回 200 而非 404，与"批量操作部分成功"语义一致。

### 400 请求非法

```json
{ "error": "ids must be a non-empty array (max 500) of valid id strings" }
```

触发条件：`ids` 不是数组、为空、长度超 500、元素不匹配 id 格式。

### 401 未登录

```json
{ "error": "Unauthorized" }
```

### 404（保留，不用于本方法）

---

## 服务端处理逻辑

```
1. requireConsoleUser(lang) → 认证/授权
2. 解析并校验 ids（格式 + 上限）
3. 查询 DB：SELECT id, filename FROM images WHERE id IN (...) AND userId = user.id AND mimeType != 'directory'
4. 对每条记录：storage.delete(id, filename).catch(() => undefined)  // R2 失败静默忽略
5. db.delete(images).where(inArray(images.id, validIds) AND eq(images.userId, user.id) AND ne(images.mimeType, 'directory'))
6. 返回 { ok: true, deleted: changes }
```

**所有权校验**：步骤 3 的 `userId = user.id` 条件确保只能删除当前用户的图片，无需额外检查。

**目录保护**：`mimeType != 'directory'` 条件确保目录条目不被删除（目录复选框在客户端已禁用，服务端为防御性校验）。

**原子性**：R2 删除与 D1 删除不在同一事务内。R2 删除失败静默忽略（与现有单图删除逻辑一致）；D1 `DELETE` 使用单条 SQL（`inArray`），原子性由 SQLite 事务保证。

---

## 客户端调用示例

```typescript
const res = await fetch(`/${lang}/console/api/images/batch`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ids: selectedIds }),
});

if (!res.ok) {
  // 显示失败提示
  return;
}

// 刷新列表，清空选中状态
await onBatchSuccess();
```
