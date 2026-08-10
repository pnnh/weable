# Contract: 上传队列 Session Storage 协议

**Feature**: `010-batch-delete-upload-queue`
**Date**: 2026-08-10

## 概述

`UploadQueue` 组件使用浏览器 `sessionStorage` 持久化队列元数据，以支持页面刷新后的状态恢复。`File` 对象本身不可序列化，仅存储可 JSON 序列化的元数据。

---

## Key 命名规则

```
weable_upload_queue_{parentKey}
```

其中：
- `parentKey = parentId` 若 `parentId` 为非空字符串
- `parentKey = "root"` 若 `parentId` 为 `null` 或 `undefined`

**示例**：
- 根目录队列：`weable_upload_queue_root`
- id 为 `abc123` 的子目录队列：`weable_upload_queue_abc123`

---

## 存储格式

Value 为 `QueueEntry[]` 的 JSON 字符串。

### QueueEntry（序列化格式）

```typescript
type SerializedQueueEntry = {
  name: string;           // 文件名（同一 parentId 下唯一）
  size: number;           // 字节数
  lastModified: number;   // Unix 毫秒时间戳
  status: 'pending' | 'success' | 'failed' | 'oversized' | 'needs_file';
                          // 'uploading' 写入前降级为 'pending'
  failCount: number;      // 0–3
  lastError: string | null;
  selected: boolean;
  parentId: string | null;
  // 注：file 字段不存储
}
```

**示例**：

```json
[
  {
    "name": "photo.jpg",
    "size": 1048576,
    "lastModified": 1722000000000,
    "status": "success",
    "failCount": 0,
    "lastError": null,
    "selected": false,
    "parentId": null
  },
  {
    "name": "avatar.png",
    "size": 2097152,
    "lastModified": 1722001000000,
    "status": "failed",
    "failCount": 2,
    "lastError": "HTTP 429: Too Many Requests",
    "selected": true,
    "parentId": null
  }
]
```

---

## 读写时机

| 时机 | 操作 |
|------|------|
| 组件挂载 | 读取并恢复队列状态（同 `parentId`） |
| 文件选择（`onChange`） | 追加新条目后写入 |
| 每张文件上传完成（成功/失败） | 更新对应条目状态后写入 |
| 复选框状态变更 | 写入（防止刷新丢失选中状态） |

---

## 状态恢复规则

| 存储的 status | 恢复后行为 |
|--------------|-----------|
| `success` | 复选框禁用，状态显示"成功"，`file = null`，无影响 |
| `failed`（failCount = 3）| 复选框禁用，状态显示"失败（3 次）"，`file = null`，无影响 |
| `failed`（failCount < 3）| 状态改为 `needs_file`，复选框禁用，提示"需重新选择" |
| `pending` | 状态改为 `needs_file`，复选框禁用，提示"需重新选择" |
| `oversized` | 复选框禁用，状态显示"文件过大"，`file = null`，无影响 |

**重新关联文件**：用户再次通过文件选择器选择与 `needs_file` 条目同名的文件时，组件将该 `File` 对象与对应条目关联，status 恢复为 `pending` / `failed`（按 `failCount`），复选框恢复可选。

---

## 清理策略

- `UploadQueue` 组件不主动清理 Session Storage，依赖浏览器在会话结束（标签关闭）时自动清除。
- 用户可通过"清空队列"按钮（可选功能，见 tasks.md）手动清除当前 `parentId` 对应的 key。

---

## 上传流程伪代码

```typescript
async function startUpload(entries: QueueEntry[]) {
  const selected = entries.filter(e =>
    e.selected &&
    e.status !== 'success' &&
    e.status !== 'oversized' &&
    !(e.status === 'failed' && e.failCount >= 3) &&
    e.file != null
  );

  // 按每批 3 个串行执行
  for (let i = 0; i < selected.length; i += 3) {
    const batch = selected.slice(i, i + 3);
    await Promise.allSettled(batch.map(entry => uploadOne(entry)));
  }
}

async function uploadOne(entry: QueueEntry) {
  setStatus(entry.name, 'uploading');

  const formData = new FormData();
  formData.append('file', entry.file!);
  if (entry.parentId) formData.append('parentId', entry.parentId);

  try {
    const res = await fetch(`/${lang}/console/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      setStatus(entry.name, 'success');
    } else {
      const data = await res.json().catch(() => ({}));
      setFailed(entry.name, `HTTP ${res.status}: ${data.error ?? 'Unknown error'}`);
    }
  } catch (err) {
    setFailed(entry.name, err instanceof Error ? err.message : 'Network error');
  }
}
```
