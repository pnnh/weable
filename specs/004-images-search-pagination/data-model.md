# Data Model: 控制台图片列表关键词搜索与分页

**Date**: 2026-08-07 | **Feature**: `004-images-search-pagination`

本功能**不新增、不修改任何数据库表结构**（无迁移）。所有能力基于既有 `images`/`channels` 表的既有字段，加一个纯客户端的视图状态模型。

## 实体

### 条目（images 表行，既有，不变更）

列表行实体，图片文件与目录共用（`mime_type = 'directory'` 表示目录）。本功能用到的既有字段：

| 字段 | 类型 | 本功能用途 | 校验/规则 |
|------|------|-----------|----------|
| `id` | text PK | 行 key、展开 API 入参 | base58 编码的 UUIDv7 |
| `user_id` | text FK | 数据归属隔离 | 查询 MUST 限定当前用户 |
| `parent_id` | text FK（可空） | 目录层级；分页/搜索作用域边界 | null 表示根目录 |
| `channel_id` | text FK（可空） | 频道名称列来源（LEFT JOIN `channels.name`） | 目录行恒为 null |
| `title` | text | 搜索匹配字段；名称列 | 非空 |
| `mime_type` | text | 区分图片/目录；目录行新列显示空 | `'directory'` 为目录 |
| `size` | integer | 文件大小列（字节） | ≥0；目录无意义（存储值不参与显示） |
| `is_published` | boolean | 状态徽章（既有列） | — |
| `updated_at` | integer(ms) | 修改时间列 + 排序 | — |

### 频道（channels 表行，既有，不变更）

仅用于 LEFT JOIN 取 `name`（`id` PK 关联，无行数放大）。

### 视图状态（View State，纯 URL/客户端模型，不持久化）

| 组成 | 载体 | 取值规则 |
|------|------|---------|
| 当前目录 `parentId` | URL 查询参数（既有） | 缺省 = 根目录 |
| 搜索关键词 `q` | URL 查询参数（新增） | 空白/缺省 = 无搜索条件；服务端去除首尾空白后使用 |
| 页码 `page` | URL 查询参数（新增） | 正整数；非法（非数字/0/负数）回退为 1；每页固定 20 条 |

**状态迁移**：

- 提交搜索：`(q', page=1)`——page 强制重置为 1（FR-003）
- 翻页：`(q, page')`——q 保留（FR-008）
- 进入新目录（面包屑/目录行链接，链接不带 `q`/`page`）：`(parentId', q=∅, page=1)`（FR-004）
- 批量操作成功：视图状态不变，仅就地重新拉取当前 `(parentId, q, page)` 的数据（FR-014）

## 派生展示值（非持久化）

| 展示值 | 计算规则 | 适用行 |
|--------|---------|--------|
| 频道名称 | JOIN 所得 `channels.name`；无关联显示空 | 图片行；目录行显示空 |
| 文件大小 | `size < 1 MB → KB`，否则 `MB`；数值 ≥100 取整、否则保留 1 位小数 | 图片行；目录行显示空 |
| 总页数 | `ceil(total / 20)`；`total` 为过滤后直接条目计数 | 分页控件（`total ≤ 20` 时不渲染） |

## 查询约束（映射 FR）

- 基础过滤：`user_id = 当前用户` AND（`parent_id = :parentId` 或根目录时 `parent_id IS NULL`）——仅直接条目（FR-007）
- 搜索过滤（有 `q` 时追加）：`title LIKE '%' || :escaped_q || '%'`，参数化绑定（FR-002、FR-010）；`:escaped_q` 中 `\`、`%`、`_` 已转义（SQLite LIKE 默认转义符即 `\`）
- 排序（既有，不变）：目录优先，其余按 `updated_at` 倒序——分页在此排序上切片（Assumptions）
- 分页切片（传入合法 `pageSize` 时）：`LIMIT :pageSize OFFSET (:page - 1) * :pageSize`，并额外 `count(*)` 得 `total`
