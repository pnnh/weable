# Contract: 控制台 API 迁移（/[lang]/console/api 前缀）

## 目的

落实 FR-014 ~ FR-016：全部控制台调用的 API 迁移至 `/[lang]/console/api` 前缀并强制登录校验；迁移完成后删除原 `/api/*` 控制台路由；公开页面接口独立保留。

## 通用约定（适用于全部 `/[lang]/console/api/*` 路由）

1. **lang 校验**：`[lang]` 非合法语言代码 → `404`。
2. **登录校验**：未登录 → `401`，Body 固定为 `{"error": "Unauthorized"}`；登录校验 MUST 先于任何数据读写执行。
3. **归属约束**：所有数据操作沿用既有 `userId = 当前用户` 过滤，不得放宽。
4. **行为保持**：除新增登录门禁与路径变更外，各路由的请求/响应语义与迁移前一致（状态码、Body 结构不变）。

## 路由映射清单

| 原路由 | 迁移后路由 | 方法 | 前端调用方（需同步更新） |
|--------|-----------|------|--------------------------|
| `/api/images` | `/[lang]/console/api/images` | GET | `ImagesTreeTable.tsx` |
| `/api/images/breadcrumb` | `/[lang]/console/api/images/breadcrumb` | GET | 暂无调用方（随迁移保留） |
| `/api/images/batch` | `/[lang]/console/api/images/batch` | PATCH | 新增（`BatchPublishDialog` / `BatchChannelDialog`），契约见 [patch-images-batch.md](./patch-images-batch.md) |
| `/api/images/[imageId]` | `/[lang]/console/api/images/[imageId]` | PATCH / DELETE | `ImageDeleteSection.tsx`（DELETE）；PATCH 暂无前端调用方 |
| `/api/images/[imageId]/file` | `/[lang]/console/api/images/[imageId]/file`（控制台副本：登录 + 仅本人所有，非本人 404） | GET | `ImagesTreeTable.tsx`、`console/images/[imageId]/page.tsx` 的 `<img>` |
| `/api/upload` | `/[lang]/console/api/upload` | POST | `ImageUploadForm.tsx` |
| `/api/directories` | `/[lang]/console/api/directories` | POST | `CreateDirectoryDialog.tsx` |
| `/api/channels/[channelId]` | `/[lang]/console/api/channels/[channelId]` | DELETE | `ChannelDeleteSection.tsx` |
| `/api/channel/avatar/[channelId]` | `/[lang]/console/api/channel/avatar/[channelId]`（仅 POST；GET 留原公开路由） | POST | `ChannelAvatarUpload.tsx`（含其 `<img>` 预览 src） |
| `/api/user/avatar` | `/[lang]/console/api/user/avatar` | POST | `UserProfileClient.tsx` |
| `/api/user/avatar/[userId]` | `/[lang]/console/api/user/avatar/[userId]` | GET | `UserProfileClient.tsx`（`<img>` src） |
| `/api/user/profile` | `/[lang]/console/api/user/profile` | PATCH | `UserProfileClient.tsx` |

## 独立公开接口（FR-016，保留原路径与原逻辑）

| 公开路由 | 方法 | 消费方 | 说明 |
|----------|------|--------|------|
| `/api/images/[imageId]/file` | GET | 公开首页、`/[lang]/images/[id]`、`/[lang]/channels/[id]` | 逻辑不变（无鉴权）；控制台改用上表中的控制台副本 |
| `/api/channel/avatar/[channelId]` | GET | `ChannelAvatar.tsx`（公开频道页） | 原路由文件保留 GET、删除 POST handler |

## 迁移后删除的原路由文件（FR-015）

- `src/app/api/images/route.ts`
- `src/app/api/images/breadcrumb/route.ts`
- `src/app/api/images/[imageId]/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/directories/route.ts`
- `src/app/api/channels/[channelId]/route.ts`
- `src/app/api/user/avatar/route.ts`
- `src/app/api/user/avatar/[userId]/route.ts`
- `src/app/api/user/profile/route.ts`

拆分处理（非整体删除）：

- `src/app/api/channel/avatar/[channelId]/route.ts`：保留 GET，删除 POST

保留（公开接口）：

- `src/app/api/images/[imageId]/file/route.ts`

## 一致性要求

- 迁移 MUST 原子完成：前端路径切换与旧路由删除在同一交付中完成，不得遗留"前端已切换但旧路由仍在"或反向状态。
- 已删除的旧路径访问结果 MUST 为 404（Next.js 默认行为），不得残留任何可绕过登录的数据操作入口。
- 公开页面（非 console）功能 MUST 不受迁移影响。
