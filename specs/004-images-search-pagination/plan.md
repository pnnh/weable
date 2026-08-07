# Implementation Plan: 控制台图片列表关键词搜索与分页

**Branch**: `004-images-search-pagination` | **Date**: 2026-08-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-images-search-pagination/spec.md`

## Summary

为 `[lang]/console/images` 页面增加：① 关键词搜索（搜索框与批量按钮同行，仅匹配当前目录直接条目的标题，参数化查询防注入）；② 传统分页（每页 20 条，上一页/下一页 + 页码窗口）；③ 列表新增频道名称、文件大小（KB/MB）、修改时间列；④ 批量操作成功后改为经列表接口就地刷新数据，替代 `router.refresh()`，保留已展开目录与选择上下文。搜索条件与页码经 URL 查询参数表达（`q`、`page`），翻页全程保留搜索条件且地址可分享还原。

## Technical Context

**Language/Version**: TypeScript 5.x（Next.js App Router，React Server Components + Client Components）

**Primary Dependencies**: Next.js 15、Drizzle ORM、Tailwind CSS；不引入新依赖

**Storage**: SQLite（本地 better-sqlite3 / Cloudflare D1，经 Drizzle ORM 访问）；无 schema 变更、无新迁移

**Testing**: 无自动化测试基建；以 quickstart.md 手工验证场景为准

**Target Platform**: Web（Cloudflare Workers，open-next）

**Project Type**: web-service（Next.js 单体：SSR 页面 + Route Handlers）

**Performance Goals**: 单目录 1000 条以内，搜索/翻页结果 1 秒内可见（SC-001）；批量后就地刷新 2 秒内可见（SC-003）

**Constraints**: 搜索输入 MUST 经参数化查询处理（FR-010）；分页/搜索仅作用于当前目录直接条目（FR-007）；接口沿用 `/[lang]/console/api` 登录门禁（FR-016）；不新增依赖、不新增迁移

**Scale/Scope**: 修改 1 个页面（SSR 查询 + 参数解析）、1 个 API 路由（扩展查询参数）、2 个客户端组件（工具栏/树表格）、新增 1 个分页组件；8 个语言文件追加文案键

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 评估 | 结论 |
|------|------|------|
| I. 语言规范 | 本 plan 及后续产物均使用简体中文，技术标识符保留英文 | 通过 |
| II. 上下文优先 | 已核实现状：页面 SSR 直查、`router.refresh()` 重置交互状态、列表 API 被主列表与树展开共用、`parent_id` 无索引；方案以代码现状为依据 | 通过 |
| III. 精准手术式修改 | 全部改动可追溯到 FR-001 ~ FR-016；不顺带重构树表格既有展开/选择逻辑，仅追加列与受控数据源；既有 API 不传分页参数时行为完全不变 | 通过 |
| IV. 简洁优先 | 服务端分页（limit/offset + count）而非引入状态管理库；搜索为表单提交触发而非实时防抖；文件大小格式化内联不建 lib；不新增索引（数据规模小） | 通过 |
| V. 质量门控 | quickstart.md 覆盖全部用户故事验证路径；假设与决策已显式记录于 research.md | 通过 |

无违规项，无需 Complexity Tracking。

## Project Structure

### Documentation (this feature)

```text
specs/004-images-search-pagination/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── [lang]/console/
│       ├── images/page.tsx                            # 修改：解析 q/page 参数；分页+搜索查询与 total 统计；
│       │                                              #       LEFT JOIN 频道名；向工具栏传递视图状态；调整空态分支
│       └── api/images/route.ts                        # 修改：GET 扩展 q/page/pageSize 参数（仅传 pageSize 时启用分页，
│                                                      #       树展开调用路径行为不变）；响应项新增 channelName；分页时返回 total
├── components/
│   ├── ImagesBatchToolbar.tsx                         # 修改：rows 状态上移至此（受控数据源）；新增搜索框（与批量按钮同行）
│   │                                                  #       与分页控件；搜索/翻页经 router.replace 更新 URL 并 fetch 列表接口；
│   │                                                  #       批量成功后 fetch 当前视图就地合并（替代 router.refresh()）
│   ├── ImagesTreeTable.tsx                            # 修改：新增频道名称、文件大小（KB/MB）、修改时间列（目录行显示空）
│   ├── ImagesPagination.tsx                           # 新增：上一页/下一页 + 页码窗口（首尾 + 当前页邻域 + 省略号）
│   └── （其余组件不动）
└── locales/                                           # 修改：8 个语言文件追加搜索/分页/列头/空结果文案键
```

**Structure Decision**:

1. **服务端分页与搜索**：主列表查询（页面 SSR 与工具栏 fetch 共用 `GET /[lang]/console/api/images`）增加 `q`/`page`/`pageSize` 参数，服务端 limit/offset + count；树展开调用不传 `pageSize`，返回全量，行为不变（见 research.md R1/R4）。
2. **交互状态保持**：rows 数据源上移至 `ImagesBatchToolbar` 客户端状态；批量成功后 fetch 当前视图（同 `parentId`/`q`/`page`）并就地替换 items，React 按 id key 协调使已展开行的本地状态存活；不再调用 `router.refresh()`（见 research.md R2）。
3. **URL 为视图状态唯一真相**：`q`/`page`/`parentId` 均在 URL；搜索提交重置 `page=1`；面包屑与目录行链接保持不带 `q`/`page`（现状），进入新目录自然重置（见 research.md R7）。
4. **注入防护**：Drizzle `like()` 绑定参数 + LIKE 通配符转义（`ESCAPE '\'`），用户输入仅作为普通文本匹配（见 research.md R5）。

## Complexity Tracking

无违规，无需填写。
