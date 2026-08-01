# API 契约：GET /api/images（扩展 parentId 参数）

**版本**：v1（现有路由扩展）  
**功能**：获取指定父目录下的直接子条目列表（目录 + 图片）  

---

## 请求

```
GET /api/images?parentId={id}
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `parentId` | `string` | 否 | 父目录 ID；缺省时返回根目录（`parent_id IS NULL`）的条目 |

---

## 响应

### 成功（200 OK）

```json
{
  "items": [
    {
      "id": "AbC123XyZ",
      "title": "设计稿",
      "mimeType": "directory",
      "description": "UI 设计相关",
      "size": 0,
      "parentId": null,
      "createdAt": 1753920000000,
      "updatedAt": 1753920000000
    },
    {
      "id": "Qw9ErTy2K",
      "title": "banner.jpg",
      "mimeType": "image/jpeg",
      "description": "",
      "size": 204800,
      "width": 1920,
      "height": 1080,
      "parentId": null,
      "channelId": "ch_abc",
      "isPublished": false,
      "createdAt": 1753920001000,
      "updatedAt": 1753920001000
    }
  ]
}
```

**排序规则**：目录条目优先（`mime_type = 'directory'`），同类型按 `updated_at DESC` 排序。

### 错误响应

| HTTP 状态 | `error` 字段内容 | 触发条件 |
|-----------|-----------------|----------|
| `404` | `"parent directory not found"` | `parentId` 指定的条目不存在或不属于当前用户，或该条目 `mime_type != 'directory'` |
| `401` | `"Unauthorized"` | 用户未登录 |

---

## 说明

- 仅返回直接子条目（不递归展开所有后代）
- 每条目包含完整字段，客户端可据此判断是否为目录（`mimeType === 'directory'`）
- 此路由为**新增路由** `src/app/api/images/route.ts`，与现有 `src/app/api/images/[imageId]/route.ts` 不冲突

---

# API 契约：GET /api/images/breadcrumb

**版本**：v1（新增路由）  
**功能**：返回从根目录到指定目录的祖先路径，用于面包屑导航  

---

## 请求

```
GET /api/images/breadcrumb?parentId={id}
```

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `parentId` | `string` | 是 | 目标目录的 ID |

---

## 响应

### 成功（200 OK）

```json
{
  "breadcrumb": [
    { "id": "root_abc", "title": "设计稿" },
    { "id": "child_xyz", "title": "2026年Q1" }
  ]
}
```

**顺序**：从根（最顶层祖先）到当前目录，最后一项为 `parentId` 对应的目录。

### 错误响应

| HTTP 状态 | `error` 字段内容 | 触发条件 |
|-----------|-----------------|----------|
| `404` | `"directory not found"` | `parentId` 不存在或不属于当前用户 |
| `401` | `"Unauthorized"` | 用户未登录 |

---

# API 契约：POST /api/upload（扩展 parentId 字段）

**变更**：在现有 `multipart/form-data` 请求中新增可选字段 `parentId`，将上传图片归属到指定目录。

| 新增字段 | 类型 | 必填 | 说明 |
|----------|------|------|------|
| `parentId` | `string` | 否 | 父目录 ID；缺省时图片归属根目录（`parent_id = NULL`） |

**现有字段不变，现有响应格式不变。**

**新增校验**：若 `parentId` 存在，服务端必须验证该目录存在且属于当前用户，否则返回 `404 "parent directory not found"`。
