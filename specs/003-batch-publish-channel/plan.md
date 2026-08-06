# Implementation Plan: 图片批量设置发布状态与频道（含控制台 API 迁移与登录校验）

**Branch**: `003-batch-publish-channel` | **Date**: 2026-08-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-batch-publish-channel/spec.md`

## Summary

本计划包含两部分：

1. **批量操作功能**：在 `[lang]/console/images` 页面的图片树表格中增加复选框选择能力（表头全选 + 行选择，仅图片文件可选），工具栏新增"设置发布状态"与"设置频道"两个批量操作按钮，均通过二次确认弹窗执行。后端新增批量更新接口，校验归属后更新所选图片的 `is_published` 或 `channel_id` 字段。
2. **API 迁移与登录校验（FR-014 ~ FR-016，来自 Clarifications）**：全部控制台调用的 API（含新增批量接口）迁移至 `/[lang]/console/api` 前缀并统一登录校验（未登录返回 401 + JSON）；迁移后删除原 `/api/*` 控制台路由；公开页面所需的图片文件与频道头像 GET 接口保留原路径作为独立公开接口。

## Technical Context

**Language/Version**: TypeScript 5.x（Next.js App Router，React Server Components + Client Components）

**Primary Dependencies**: Next.js 15、Drizzle ORM、Tailwind CSS；不引入新依赖

**Storage**: SQLite（`.data/weable.db`，经 Drizzle ORM 访问，部署于 Cloudflare Workers）；无 schema 变更

**Testing**: 无自动化测试基建；以 quickstart.md 手工验证场景为准

**Target Platform**: Web（Cloudflare Workers，open-next）

**Project Type**: web-service（Next.js 单体：SSR 页面 + Route Handlers）

**Performance Goals**: 50 张图片的批量操作 3 秒内完成（SC-003）；确认后 2 秒内列表反馈可见（SC-002）

**Constraints**: 所有 `/[lang]/console/api` 路由 MUST 先校验登录（未登录 401 + JSON，FR-014）；仅允许更新当前用户拥有的图片；批量上限 500

**Scale/Scope**: 新增 1 个批量接口；迁移 11 个既有路由处理器；删除 9 个原路由文件（部分拆分保留公开 GET）；更新 7 个客户端组件的 fetch/资源路径；8 个语言文件追加文案

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 评估 | 结论 |
|------|------|------|
| I. 语言规范 | 本 plan 及后续产物均使用简体中文，技术标识符保留英文 | 通过 |
| II. 上下文优先 | 已逐一核实全部 API 引用点（fetch / `<img>` src / server action）、两个公开 GET 路由的无鉴权语义；方案以代码现状为依据 | 通过 |
| III. 精准手术式修改 | 迁移涉及面较广，但每一处改动均可追溯到 FR-014 ~ FR-016（用户经 clarify 显式确认的范围）；不顺带重构路由内部业务逻辑，仅加登录门禁与路径变更 | 通过（范围由用户显式授权） |
| IV. 简洁优先 | 登录校验用单一共享 helper 实现，不引入 middleware；公开接口直接保留原路径（零拷贝），不为无调用方的接口新建消费方 | 通过 |
| V. 质量门控 | quickstart.md 覆盖迁移前后行为对照验证；假设已显式记录 | 通过 |

无违规项，无需 Complexity Tracking。

## Project Structure

### Documentation (this feature)

```text
specs/003-batch-publish-channel/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   └── auth.ts                                        # 修改：新增 getCurrentUserOrNull()（未登录返回 null 而非抛错）
├── app/
│   ├── [lang]/console/
│   │   ├── images/page.tsx                            # 修改：编排批量工具栏 + 受控树表格；SSR 查询频道列表
│   │   └── api/                                       # ★ 新增前缀（FR-014），下列路由均含登录门禁 + lang 校验
│   │       ├── images/route.ts                        # 迁移：GET 子目录列表
│   │       ├── images/breadcrumb/route.ts             # 迁移：GET 面包屑（暂无调用方，随迁移保留）
│   │       ├── images/batch/route.ts                  # ★ 新增：PATCH 批量更新（本功能核心接口）
│   │       ├── images/[imageId]/route.ts              # 迁移：PATCH / DELETE 单图
│   │       ├── images/[imageId]/file/route.ts         # 迁移（控制台副本）：GET 文件（登录 + 本人所有）
│   │       ├── upload/route.ts                        # 迁移：POST 批量上传
│   │       ├── directories/route.ts                   # 迁移：POST 建目录
│   │       ├── channels/[channelId]/route.ts          # 迁移：DELETE 频道
│   │       ├── channel/avatar/[channelId]/route.ts    # 迁移：POST 频道头像（GET 部分留在原公开路由）
│   │       └── user/
│   │           ├── avatar/route.ts                    # 迁移：POST 用户头像
│   │           ├── avatar/[userId]/route.ts           # 迁移：GET 用户头像（仅控制台消费）
│   │           └── profile/route.ts                   # 迁移：PATCH 用户资料
│   └── api/                                           # 迁移后收敛为纯公开接口
│       ├── images/[imageId]/file/route.ts             # 保留：独立公开接口（FR-016，逻辑不变）
│       ├── channel/avatar/[channelId]/route.ts        # 保留：仅 GET（删除 POST handler，POST 已迁走）
│       └── user/avatar/[userId]/route.ts              # 删除（仅控制台消费，已迁移）
│       └── （其余原路由文件全部删除，FR-015）
├── components/
│   ├── ImagesTreeTable.tsx                            # 修改：复选框受控选择；fetch 与 <img> src 改控制台前缀
│   ├── ImagesBatchToolbar.tsx                         # 新增：选择状态容器 + 两个批量按钮
│   ├── BatchPublishDialog.tsx                         # 新增：发布状态弹窗
│   ├── BatchChannelDialog.tsx                         # 新增：频道弹窗（下拉框 + 空选项）
│   ├── CreateDirectoryDialog.tsx                      # 修改：fetch 路径（需 lang）
│   ├── ImageUploadForm.tsx                            # 修改：fetch 路径（需 lang）
│   ├── ImageDeleteSection.tsx                         # 修改：fetch 路径（需 lang）
│   ├── ChannelDeleteSection.tsx                       # 修改：fetch 路径（需 lang）
│   ├── ChannelAvatarUpload.tsx                        # 修改：fetch 与 <img> src 路径（需 lang）
│   ├── UserProfileClient.tsx                          # 修改：fetch 与 <img> src 路径（需 lang）
│   └── ChannelAvatar.tsx                              # 不改：服务公开页面，继续用原公开路径
└── locales/                                           # 修改：8 个语言文件追加新文案键
```

**Structure Decision**:

1. **登录门禁**：`auth.ts` 新增 `getCurrentUserOrNull()`；每个控制台 API 路由开头统一执行 lang 校验（`isValidLang`，非法返回 404）与登录校验（null 返回 `401 + {"error":"Unauthorized"}`）。不引入 middleware——与项目既有"每路由自行调用 `getCurrentUser()`"的模式一致，改动最小（见 research.md R9）。
2. **公开接口**：`GET /api/images/[id]/file` 与 `GET /api/channel/avatar/[id]` 本就无鉴权、服务公开页面，原路径保留即为 FR-016 的"独立公开接口"，无需新建拷贝（见 research.md R10）。
3. **前端路径**：组件构造控制台 API URL 需要 `lang`；已有 `lang` prop 的直接使用，没有的由调用页面补传（见 research.md R11）。
4. **批量操作编排**：`page.tsx` SSR 查询频道列表传入弹窗组件；`ImagesBatchToolbar` 持有选择状态；成功后 `router.refresh()` 刷新（与既有模式一致）。

## Complexity Tracking

无违规，无需填写。
