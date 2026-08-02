# Contract: POST /api/upload（批量图片上传）

## 目的

在控制台图片上传流程中支持一次上传多张图片，并确保上传成功后可返回当前目录列表。

## 请求

- Method: `POST`
- URL: `/api/upload`
- Content-Type: `multipart/form-data`

### FormData 字段

- `file`: `File`（可重复字段，1~50 个）
- `parentId`: `string`（可选；目标目录 ID）

## 请求约束

- `file` 至少 1 个。
- `file` 最多 50 个。
- 每个 `file` 必须是图片类型。
- 每个 `file` 大小不得超过 5 MB。
- `parentId` 存在时，必须指向当前用户可访问且 `mimeType = directory` 的目录。

## 成功响应

- Status: `201 Created`
- Body:

```json
{
  "ids": ["img_1", "img_2", "img_3"]
}
```

语义：

- `ids` 顺序与接收处理顺序一致。
- 成功后客户端应返回当前目录列表页（包含原 `parentId` 上下文）。

## 失败响应

- Status: `400 Bad Request`
  - 无文件、数量超限、文件类型不合法、文件大小超限。
- Status: `404 Not Found`
  - `parentId` 无效或目录不可访问。
- Status: `500 Internal Server Error`
  - 存储或数据库写入异常。

Body（示例）：

```json
{
  "error": "File too large (max 5 MB)"
}
```

## 一致性要求

- 上传失败时不得产生“部分成功但未明示”的结果。
- 上传成功后，列表页刷新应在当前目录上下文中可见新增图片。
