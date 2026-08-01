# API 契约：POST /api/directories

**版本**：v1  
**功能**：创建目录条目  

---

## 请求

```
POST /api/directories
Content-Type: application/json
```

### 请求体（JSON）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | `string` | 是 | 目录名称，1–200 字符，不含 `/`、`\`、`..` |
| `description` | `string` | 否 | 目录描述，最长 1000 字符，默认为空字符串 |
| `parentId` | `string` | 否 | 父目录 ID；缺省或 `null` 表示创建在根目录 |

### 示例

```json
{
  "title": "设计稿",
  "description": "UI 设计相关图片",
  "parentId": "AbC123XyZ"
}
```

---

## 响应

### 成功（201 Created）

```json
{
  "id": "Qw9ErTy2K"
}
```

### 错误响应

| HTTP 状态 | `error` 字段内容 | 触发条件 |
|-----------|-----------------|----------|
| `400` | `"title is required"` | `title` 缺失或为空字符串 |
| `400` | `"title contains invalid characters"` | `title` 包含 `/`、`\` 或 `..` |
| `400` | `"title too long"` | `title` 超过 200 字符 |
| `400` | `"description too long"` | `description` 超过 1000 字符 |
| `404` | `"parent directory not found"` | `parentId` 指定的条目不存在或不属于当前用户 |
| `409` | `"an entry with this name already exists in the same directory"` | 同级已存在相同 `title` 的条目 |
| `401` | `"Unauthorized"` | 用户未登录（由 `getCurrentUser()` 抛出） |

---

## 认证

与现有 API 路由一致，通过 `getCurrentUser()` 从 session/token 中获取当前用户，不通过请求体传递 `userId`。

---

## 副作用

- 在 `images` 表中插入一条 `mime_type = 'directory'` 的记录
- `filename` 设置为与 `title` 相同的值
- `size = 0`，`width = NULL`，`height = NULL`
- `is_published = false`
- 不写入任何文件到存储（R2 / 本地文件系统）
