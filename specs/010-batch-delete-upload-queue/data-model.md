# Data Model: 批量删除与上传队列

**Feature**: `010-batch-delete-upload-queue`
**Date**: 2026-08-10

## 现有数据库实体（无变更）

本 feature 不新增数据库表，也不修改任何现有表结构。所有操作基于现有 `images` 表。

### images 表（相关字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `text` PK | base58(uuidv7)，批量删除的目标 id |
| `userId` | `text` FK | 所有权校验字段，批量删除必须匹配当前用户 |
| `parentId` | `text` FK self-ref | 目录归属，上传队列的隔离维度 |
| `mimeType` | `text` | 批量删除跳过 `'directory'` 类型（目录复选框不可选，此校验为服务端防御） |
| `filename` | `text` | 删除 R2 文件的 key 组成部分（`{id}/{filename}`） |
| `size` | `integer` | 客户端超大检测依据（> 5 MB 则状态 `oversized`） |

---

## 客户端状态实体（Session Storage）

### QueueEntry

表示上传队列中的单个文件条目。`File` 对象仅存于内存 React state，不序列化。

```typescript
type QueueEntryStatus =
  | 'pending'    // 待上传（默认）
  | 'uploading'  // 上传中（仅内存，不持久化）
  | 'success'    // 上传成功，复选框禁用
  | 'failed'     // 上传失败，failCount 递增
  | 'oversized'  // 超过 5 MB，复选框禁用，不可上传
  | 'needs_file' // 刷新后 File 对象丢失，需重新关联（status=failed/pending 但 file=null）

type QueueEntry = {
  name: string;           // 文件名（去重 key，同一 parentId 下唯一）
  size: number;           // 字节数
  lastModified: number;   // Unix 时间戳（毫秒），来自 File.lastModified
  status: QueueEntryStatus;
  failCount: number;      // 0–3，达到 3 后 status='failed' 且复选框禁用
  lastError: string | null; // 最后一次失败的错误信息（用于 tooltip）
  selected: boolean;      // 复选框选中状态
  parentId: string | null; // 所属目录 id（null 表示根目录）
  // 注：file: File | null 仅在内存中，不存入 Session Storage
}
```

**Session Storage 键命名规则**：
```
weable_upload_queue_{parentKey}
```
其中 `parentKey = parentId ?? 'root'`。

**序列化规则**：写入 Session Storage 前过滤掉 `status = 'uploading'`，将其降级为 `'pending'`（上传中断刷新后视为待上传）。

**状态转换图**：

```
[选择文件] → pending
     ↓ 开始上传（selected=true）
  uploading
     ↓ 成功             ↓ 失败（failCount < 3）   ↓ 失败（failCount = 3）
  success            failed（可重试）             failed（不可重试）
  [复选框禁用]       [复选框可选]                 [复选框禁用]

[页面刷新后 file=null & status=pending/failed]
     → needs_file（复选框禁用直到重新关联 File）
```

### UploadBatch（内存，非持久化）

```typescript
type UploadBatch = {
  entries: QueueEntry[]; // 长度 1–3
}
```

用于批次控制逻辑，`entries` 取自 `selected=true` 且可上传的条目，每批最多 3 个。

---

## API 请求/响应实体

### BatchDeleteRequest

```typescript
type BatchDeleteRequest = {
  ids: string[]; // 图片 id 数组，1–500 个，元素匹配 /^[a-zA-Z0-9_-]+$/
}
```

### BatchDeleteResponse（成功）

```typescript
type BatchDeleteResponse = {
  ok: true;
  deleted: number; // 实际删除的记录数
}
```

### BatchDeleteError

```typescript
type BatchDeleteError = {
  error: string;
}
// HTTP status:
// 400 — ids 格式非法
// 401 — 未登录
// 404 — 未找到可删除的图片
```

### UploadSingleResponse（复用现有 upload API）

```typescript
// POST /[lang]/console/api/upload
// 请求：FormData { file: File, parentId?: string }
// 成功响应（201）：
type UploadSingleResponse = {
  ids: string[]; // 单个 id 的数组，长度 1
}
// 失败响应（4xx/5xx）：
type UploadError = {
  error: string; // 错误描述，用于 lastError 字段和 tooltip
}
```
