# Research: 图片批量设置发布状态与频道（含 API 迁移）

**Feature**: 003-batch-publish-channel | **Date**: 2026-08-06

所有技术上下文均无 NEEDS CLARIFICATION；spec Clarifications（Session 2026-08-06，3 条）已全部落入 R9 ~ R12 决策。

## R1: 批量更新的接口形态

- **Decision**: 新增单一 Route Handler `PATCH /[lang]/console/api/images/batch`，请求体二选一携带 `{ ids, isPublished: boolean }` 或 `{ ids, channelId: string | null }`，一次调用只执行一种操作。
- **Rationale**: 两种批量操作共享同一套鉴权、归属校验与更新逻辑（`and(inArray(images.id, ids), eq(images.userId, user.id))` + `updatedAt` 刷新），单接口覆盖二者符合宪法"简洁优先"；与现有单图 PATCH 的字段语义完全一致。
- **Alternatives considered**:
  - 前端循环调用单图 PATCH：N 次请求，50 张图片时超出 SC-003（3 秒），且存在部分成功中间态 → 否决
  - 拆成两个独立批量端点：逻辑高度重复 → 否决

## R2: 批量规模上限与校验

- **Decision**: 服务端校验 `ids` 为非空数组、上限 500、元素匹配既有 ID 格式（`/^[a-zA-Z0-9_-]+$/`）；`channelId` 若非 null 须为当前用户名下已存在的频道；更新 WHERE 追加 `mimeType != "directory"`。
- **Rationale**: 选择范围限定为单视图可见图片行，数十至数百量级；500 上限是防滥用护栏；频道归属校验防止把图片挂到他人频道。
- **Alternatives considered**: 不设上限——缺护栏；上限 50——可能误伤大目录视图 → 均否决。

## R3: 部分失败与幂等语义

- **Decision**: 更新以 `userId` 限定 WHERE，天然跳过非本人或已删除的 ID；响应 `{ ok: true, updated: <受影响行数> }`；`updated === 0` 返回 404；整体成功后前端清空选择并 `router.refresh()`。
- **Rationale**: 用受影响行数即可满足 spec 的部分失败提示要求，无需逐条校验；操作幂等。
- **Alternatives considered**: 逐条校验并报告明细——超出需要 → 否决。

## R4: 选择状态与表头半选的持有方式

- **Decision**: 客户端容器组件 `ImagesBatchToolbar` 持有 `selectedIds`；`ImagesTreeTable` 受控化（`selectedIds` + `onSelectionChange` props，并向容器上报当前可见图片 id 集合）；表头三态中半选用 `indeterminate` 属性实现。
- **Rationale**: 选择状态须同时被工具栏与表格读取，提升到共同父级是唯一正确位置；项目无状态管理库，容器组件最简。
- **Alternatives considered**: Context/状态库——过度设计；ref 共享——破坏单向数据流 → 均否决。

## R5: 批量成功后的数据刷新

- **Decision**: 沿用 `router.refresh()`（与 `CreateDirectoryDialog` 一致）；页面 `force-dynamic` SSR，refresh 后 `initialItems` 携带最新状态；容器在 refresh 前清空 `selectedIds`。
- **Rationale**: 零新增机制；展开目录在 refresh 后回到未展开态，属可接受行为。
- **Alternatives considered**: 前端本地改写行树状态——复杂度高 → 否决。

## R6: 频道列表的获取方式

- **Decision**: `page.tsx` SSR 时查询 `channels`（`eq(channels.userId, user.id)`，按创建时间升序），作为 `{ id, name }[]` props 传入弹窗。不新增频道查询接口。
- **Rationale**: 仅该弹窗消费，页面本就每次请求重建；批量整理场景无需实时拉取。
- **Alternatives considered**: 新增 `GET` 频道端点——无第二消费方 → 否决。

## R7: 弹窗与交互模式

- **Decision**: 沿用 `CreateDirectoryDialog` 的弹窗模式（fixed overlay + 白色卡片 + 取消/确认）；发布状态弹窗用互斥 radio；频道弹窗用原生 `<select>`（"空"选项 value 为空字符串）；提交期间确认按钮 `disabled` + "…" 占位（FR-011）。
- **Rationale**: 与现有 UI 代码风格一致；原生控件满足需求。
- **Alternatives considered**: `confirm()` 模式——无法承载选择控件 → 否决。

## R8: i18n 文案

- **Decision**: 8 个 locale 文件追加 camelCase 新键；labels 由 `page.tsx` 经 `t(l, ...)` 组装后传入组件。
- **Rationale**: FR-013 要求全量多语言；沿用既有 labels props 模式。

## R9: 登录门禁的实现方式（FR-014）

- **Decision**: `src/lib/auth.ts` 新增 `getCurrentUserOrNull()`：与 `getCurrentUser()` 相同的身份解析（Cloudflare Access JWT → `user_id` cookie → 开发环境回退），但生产环境无身份时返回 `null` 而非抛错。每个 `/[lang]/console/api/*` 路由开头执行：`isValidLang(lang)` 校验（非法 → 404）+ `getCurrentUserOrNull()`（null → `401 + {"error":"Unauthorized"}`）。
- **Rationale**: 现有路由均为"每路由自行调用鉴权"模式，helper 复用同一解析逻辑且改动收敛在单文件；401 + JSON 是 Clarifications Q3 的确认结果，前端 fetch 可明确识别。开发环境保留 dev user 回退，不影响本地调试。
- **Alternatives considered**:
  - Next.js middleware 统一拦截：项目无 middleware 先例，且 open-next 环境下增加新的运行时面，排查成本高 → 否决
  - 直接捕获 `getCurrentUser()` 的抛错转 401：依赖异常控制流，语义不清 → 否决

## R10: 公开接口的处置（FR-016）

- **Decision**: `GET /api/images/[id]/file` 与 `GET /api/channel/avatar/[id]` 保留原路径、原逻辑，即为"独立公开接口"——二者本就无鉴权且被公开页面（`[lang]` 首页、`images/[id]`、`channels`、`channels/[id]`）引用。控制台侧另建带登录门禁的副本：图片文件副本限定本人所有（404 拒绝非本人），频道头像副本仅登录校验（头像无归属差异语义）。
- **Rationale**: 公开路由保留原路径实现零拷贝、公开页面零改动；控制台副本满足 FR-014 前缀要求。已核实两个 GET 原实现均无鉴权调用点，保留不引入新风险。
- **Alternatives considered**: 新建不同路径的公开接口再删原路径——公开页面全部要改 URL，纯增工作量 → 否决。
- **备注**：现有公开图片文件端点对任意 ID 无条件返回（含未发布与他人图片），属既有行为；本功能不扩大也不收紧该行为（宪法：手术式修改），如需收紧另立需求。

## R11: 前端调用路径与 lang 传递（FR-015）

- **Decision**: 控制台 API URL 形如 `/${lang}/console/api/...`。组件按现状分两类：已有 `lang` prop 的（`ImagesTreeTable`、`CreateDirectoryDialog`、`ImageUploadForm`）直接使用；缺少 `lang` 的（`ImageDeleteSection`、`ChannelDeleteSection`、`ChannelAvatarUpload`、`UserProfileClient`）新增 `lang` prop，由调用页面传入。`ChannelAvatar.tsx` 服务公开页面，继续使用原公开路径，不改。
- **Rationale**: 相对路径 fetch 会随页面层级变化而失效，绝对路径 + `lang` 是唯一可靠方式；补 prop 与项目既有传参风格一致。
- **Alternatives considered**: 客户端从 `window.location` 解析 lang——隐式依赖、SSR 不友好 → 否决。

## R12: 原路由删除清单与拆分（FR-015）

- **Decision**: 迁移完成后删除原路由文件：`api/images/route.ts`、`api/images/breadcrumb/route.ts`、`api/images/[imageId]/route.ts`、`api/upload/route.ts`、`api/directories/route.ts`、`api/channels/[channelId]/route.ts`、`api/user/avatar/route.ts`（POST）、`api/user/avatar/[userId]/route.ts`（GET）、`api/user/profile/route.ts`。两个文件做拆分处理：`api/images/[imageId]/file/route.ts` 整体保留（公开接口）；`api/channel/avatar/[channelId]/route.ts` 保留 GET、删除 POST handler（POST 迁至控制台前缀）。`PATCH /api/images/[imageId]` 当前无前端调用方（编辑走 server action），仍按 FR-015 迁移至控制台前缀保留；`GET /api/images/breadcrumb` 同样无调用方，随迁移保留以维持边界一致。
- **Rationale**: 删除是 Clarifications Q2 的确认结果，防止旧路径绕过登录校验；拆分处理保证公开功能不中断。无调用方接口选择迁移而非删除，避免本功能承担"判定死代码"的额外责任。
- **Alternatives considered**: 删除无调用方接口——超出请求范围 → 否决。
