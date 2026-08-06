# Contract: PATCH /[lang]/console/api/images/batch（图片批量更新）

## 目的

对当前用户选中的一组图片执行一次批量更新：批量设置发布状态（`isPublished`）或批量设置所属频道（`channelId`，含清空为 `null`）。

## 请求

- Method: `PATCH`
- URL: `/[lang]/console/api/images/batch`（`[lang]` 必须为合法语言代码，否则 404）
- Content-Type: `application/json`
- 鉴权：MUST 登录；未登录返回 401（见 [console-api-migration.md](./console-api-migration.md) 的通用约定）

### Body 字段

- `ids`: `string[]`（必填，1~500 个图片 ID）
- `isPublished`: `boolean`（与 `channelId` 二选一）——批量设置发布状态
- `channelId`: `string | null`（与 `isPublished` 二选一）——批量设置所属频道；`null` 表示清除频道归属

## 请求约束

- `ids` 至少 1 个、至多 500 个；每个元素匹配 `/^[a-zA-Z0-9_-]+$/`。
- `isPublished` 与 `channelId` 必须且只能提供其一。
- `isPublished` 必须为布尔值。
- `channelId` 若非 `null`，必须是当前用户名下已存在的频道 ID。
- 仅 `userId = 当前用户` 且 `mimeType != "directory"` 的目标行会被更新。

## 成功响应

- Status: `200 OK`
- Body:

```json
{
  "ok": true,
  "updated": 3
}
```

语义：

- `updated` 为实际受影响的行数。
- 当 `updated` 小于 `ids.length` 时，表示其中部分 ID 已不存在或非本人所有；请求仍视为成功。
- 成功后客户端应清空选择集并刷新当前列表。

## 失败响应

- Status: `401 Unauthorized`
  - 未登录（Body: `{"error": "Unauthorized"}`）。
- Status: `400 Bad Request`
  - `ids` 为空、超上限、格式非法；`isPublished`/`channelId` 缺失或同时提供；字段类型非法；`channelId` 指向非本人频道。
- Status: `404 Not Found`
  - `[lang]` 非法；或请求合法但没有任何一行被更新（`updated === 0`）。

Body（示例）：

```json
{
  "error": "Invalid request"
}
```

## 一致性要求

- 更新在单条语句中完成，不得产生部分写入的中间态。
- 每次成功更新须同步刷新目标行的 `updatedAt`。
- 操作幂等：重复提交相同目标值不产生额外副作用。
