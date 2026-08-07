# Contract: GET /[lang]/console/api/images（列表查询：搜索与分页扩展）

## 目的

在既有"按目录列出当前用户直接条目"能力之上，新增可选的关键词搜索（`q`）与服务端分页（`page`/`pageSize`），并在响应项中附带频道名称。既有调用方（树展开，仅传 `parentId`）行为完全不变。

## 请求

- Method: `GET`
- URL: `/[lang]/console/api/images`（`[lang]` 必须为合法语言代码，否则 404）
- 鉴权：MUST 登录；未登录返回 401（见 [../003-batch-publish-channel/contracts/console-api-migration.md](../003-batch-publish-channel/contracts/console-api-migration.md) 的通用约定）

### Query 参数

| 参数 | 类型 | 必填 | 规则 |
|------|------|------|------|
| `parentId` | string | 否 | 目标目录 ID；MUST 为当前用户名下存在的目录，否则 404；缺省表示根目录（`parent_id IS NULL`） |
| `q` | string | 否 | 搜索关键词；服务端 trim 后为空视为无搜索条件；非空时对标题做不区分大小写的包含匹配（参数化，LIKE 通配符已转义） |
| `page` | string | 否 | 页码，1 起；非法值（非正整数）回退为 1；仅在启用分页时生效 |
| `pageSize` | string | 否 | **分页开关**：提供合法正整数时启用分页（主列表调用固定传 20）；缺省或非法时返回全量（树展开调用路径，行为同现状） |

## 响应

### 启用分页（传入合法 `pageSize`）

- Status: `200 OK`
- Body:

```json
{
  "items": [
    {
      "id": "…",
      "title": "logo-dark",
      "mimeType": "image/png",
      "description": "",
      "size": 524288,
      "width": 1200,
      "height": 800,
      "parentId": "…" ,
      "channelId": "…" ,
      "channelName": "旅行",
      "isPublished": true,
      "createdAt": 1754000000000,
      "updatedAt": 1754100000000
    }
  ],
  "total": 45,
  "page": 2,
  "pageSize": 20
}
```

语义：

- `items`：当前页条目（≤ `pageSize` 条），排序与现状一致（目录优先，其余按 `updatedAt` 倒序）。
- `total`：应用 `q` 过滤后的直接条目总数（含目录与图片），用于计算总页数 `ceil(total / pageSize)`。
- `page`：实际生效的页码（非法入参回退后的值）。
- `channelName`：关联频道名称；未关联频道或目录行为 `null`。
- `page` 超出总页数时 `items` 为空数组，请求仍为 200（FR-009 安全回退）。

### 未启用分页（未传合法 `pageSize`，树展开路径）

- Status: `200 OK`
- Body：`{ "items": [ …同上结构（含 channelName） ] }`——全量返回，无 `total`/`page`/`pageSize` 字段，与现状兼容。

## 失败响应

- Status: `401 Unauthorized` —— 未登录（Body: `{"error": "Unauthorized"}`）。
- Status: `404 Not Found` —— `[lang]` 非法；或 `parentId` 非当前用户名下目录。

Body（示例）：

```json
{
  "error": "parent directory not found"
}
```

## 一致性要求

- 搜索关键词 MUST 以绑定参数传入（参数化查询），MUST NOT 拼接进查询语句；关键词中的 `%`、`_`、`\` MUST 以 `\` 转义（SQLite 默认 LIKE 转义符即 `\`，无需显式 ESCAPE 子句）（FR-010）。
- 查询范围 MUST 限定 `userId = 当前用户` 且仅当前目录直接条目（FR-007、FR-016）。
- 分页切片 MUST 在既有排序规则上执行，保证同一数据集翻页结果稳定不重不漏。

## 页面 URL 约定（消费方）

`/[lang]/console/images` 页面地址与上述参数对齐：`?parentId=…&q=…&page=…`。

- 搜索提交 → `page` 重置为 1；清空 `q` → 恢复全量视图。
- 翻页 → 保留 `parentId` 与 `q`（FR-008）。
- 面包屑/目录行链接不带 `q`/`page`，进入新目录即重置（FR-004）。
