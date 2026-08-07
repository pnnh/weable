# Research: 控制台图片列表关键词搜索与分页

**Date**: 2026-08-07 | **Feature**: `004-images-search-pagination`

spec 阶段无遗留 `[NEEDS CLARIFICATION]`；本文档记录实现层决策。

## R1: 搜索与分页的执行位置 —— 服务端查询

- **Decision**: 搜索与分页在服务端执行（页面 SSR 首屏 + `GET /[lang]/console/api/images` 扩展参数），前端仅负责交互与 URL 同步。
- **Rationale**: FR-008 要求视图状态经 URL 表达、地址可分享还原——服务端渲染天然满足；每页固定 20 条限制单页负载；与页面现有 SSR 直查模式一致。
- **Alternatives considered**:
  - 客户端全量拉取后本地过滤/切片：目录条目多时首屏负载不可控，且刷新/分享 URL 需额外同步逻辑，放弃。
  - 服务端组件 + `searchParams` 纯 RSC 方案（不 fetch API）：翻页依赖路由导航，批量后就地刷新仍需 fetch，两套数据路径并存，放弃。

## R2: 批量操作后的就地刷新 —— fetch 当前视图 + 就地合并，替代 `router.refresh()`

- **Decision**: rows 数据源上移至 `ImagesBatchToolbar` 客户端状态（页面 SSR 首屏经 `initialItems` 注入）。批量成功后以当前 `parentId`/`q`/`page` 调用列表接口，就地替换 items。`TreeRow` 以 `item.id` 为 key，React 协调时保留同 key 行的本地状态（`expanded`/`children`/`childState`），已展开目录不被重置。
- **Rationale**: 现状 `handleBatchSuccess` 调用 `router.refresh()` 触发服务端重渲染并下发新 props，树表格展开/选择状态被重置（用户报告的痛点，FR-014）。就地替换 items 无整页刷新、无闪烁（SC-003）。
- **Alternatives considered**:
  - 继续 `router.refresh()`：无法保证展开状态存活，违反 FR-014，放弃。
  - 逐行 PATCH 本地状态（按批量结果手工改字段）：需复制服务端更新语义（updatedAt 等），易与真实数据漂移，放弃。
- **Notes**: 选择集按既有约定在批量成功后清空（`setSelectedIds([])`）；若刷新后某选中 id 已不在当前页，随数据替换自然失效。

## R3: 搜索/分页与已展开子树的共存

- **Decision**: 分页切片与搜索过滤仅作用于当前目录的直接条目；已展开目录的子行由客户端本地状态原样渲染，不参与分页计数、不受搜索过滤。
- **Rationale**: 用户明确"不考虑手动点击三角箭头展开下级的情况"（FR-007）；子行来自独立的展开 API 调用，维持既有行为改动最小。
- **Alternatives considered**: 搜索时同步过滤展开子行 / 收起所有展开目录：交互突兀且需改动 TreeRow 状态模型，放弃。

## R4: 列表 API 扩展与树展开调用的兼容

- **Decision**: `GET /[lang]/console/api/images` 新增可选参数 `q`、`page`、`pageSize`。**仅当显式传入合法 `pageSize` 时启用分页**（limit/offset + count 返回 `total`）；未传时维持现有全量返回。树展开调用（`ImagesTreeTable.handleToggle`，只传 `parentId`）不加参数、不改代码，行为不变。
- **Rationale**: 单一端点覆盖主列表与展开两种消费场景，避免新建重复路由（宪法 IV 简洁优先）。
- **Alternatives considered**: 新建独立的分页列表端点：与现有端点逻辑 90% 重叠，放弃。

## R5: 注入防护与搜索匹配语义

- **Decision**: 关键词经 Drizzle `like(images.title, pattern)` 以绑定参数传入（参数化查询，满足 FR-010）；`pattern = "%" + escaped(q) + "%"`，其中用户输入里的 `%`、`_`、`\` 先以 `\` 转义——SQLite 的 LIKE 默认转义符即 `\`，无需显式 `ESCAPE` 子句（实现中曾尝试显式 `ESCAPE '\'`，因 Drizzle 模板参数化导致"ESCAPE expression must be a single character"错误，遂改用默认转义符，语义等价）。匹配范围限定当前目录直接条目（`userId` + `parentId` 条件不变）。
- **Rationale**: SQLite LIKE 对 ASCII 默认大小写不敏感，满足"不区分大小写"（当前数据以 ASCII 标题为主）；转义防止用户输入的 `%`/`_` 被当作通配符，保证"普通文本匹配"语义（SC-004）。
- **Alternatives considered**:
  - `lower(title) LIKE lower(?)`：SQLite 的 `lower()` 同样只覆盖 ASCII，额外函数无收益，放弃。
  - 应用层过滤：需全量拉取，与 R1 冲突，放弃。
- **Notes**: 空串/纯空白关键词视为无搜索条件。

## R6: 频道名称列的数据来源

- **Decision**: 主列表查询 LEFT JOIN `channels` 取 `name`，响应项新增 `channelName: string | null`；`ImageEntry` 类型同步扩展。目录行 `channelId` 恒为 null，自然显示空。
- **Rationale**: 服务端 join 一次取回，避免客户端二次请求频道映射；`channels.id` 为主键，join 无放大风险。
- **Alternatives considered**: 客户端用既有 `channels` prop 做 id→name 映射：仅批量弹窗持有频道列表，且目录展开的子行（来自 API）无此映射来源，放弃。

## R7: URL 与视图状态同步策略

- **Decision**: URL 是视图状态唯一真相：`parentId`（既有）、`q`、`page`。
  - 首屏/直接访问/刷新：页面 SSR 读取 `searchParams` 渲染。
  - 搜索提交：客户端构造 `?parentId=…&q=…&page=1` → `router.replace` + fetch。
  - 翻页：保留 `parentId` 与 `q`，仅改 `page` → `router.replace` + fetch。
  - 进入新目录（面包屑/目录行链接）：既有链接本就不带 `q`/`page`，维持现状，天然重置（FR-004）。
- **Rationale**: 避免路由软导航触发服务端重渲染与客户端 fetch 双更新竞态——导航类交互由客户端 fetch 驱动数据，URL 仅同步记录（可分享、可刷新还原）。
- **Alternatives considered**: 翻页走 `router.push` 依赖 RSC 重渲染：Next 15 软导航下客户端组件 props 更新与交互状态保留行为不稳定，且与批量就地刷新形成两套数据路径，放弃。
- **Notes**: 翻页使用 `router.replace`（不堆积历史记录）；搜索提交亦用 `replace`（简单起见，避免历史栈污染）。

## R8: 文件大小格式化

- **Decision**: 内联工具函数于 `ImagesTreeTable`：`size < 1024*1024` 显示 KB（`size/1024`），否则显示 MB（`size/(1024*1024)`）；数值 ≥100 取整，否则保留 1 位小数；单位 "KB"/"MB" 为通用符号不进 locale。目录行（`mimeType === "directory"`）显示空。
- **Rationale**: 规格只要求 KB/MB 人类可读；单处使用不建 lib（宪法 IV）。
- **Alternatives considered**: `Intl.NumberFormat` byte 风格（会输出 GiB 等单位，且 locale 差异大）：与"KB 或 MB"要求不符，放弃。

## R9: 分页控件形态

- **Decision**: 新增 `ImagesPagination.tsx`（客户端组件）：上一页/下一页按钮 + 页码窗口——首页、尾页、当前页 ±1，相邻缺口以省略号呈现（最多 7 个元素）；边界禁用（FR-006）；当前页高亮。总页数由 `ceil(total / 20)` 得出。`total ≤ 20` 时不渲染分页控件。
- **Rationale**: 规格要求"传统分页（上一页下一页和页码）"；窗口化避免大目录页码爆炸（Assumptions）。
- **Alternatives considered**: 展开全部页码 / 仅"上一页/下一页"无页码：分别违反假设与规格明示要求，放弃。

## R10: 索引与性能

- **Decision**: 不新增数据库索引、不产生迁移。查询条件 `userId + parentId (+ title LIKE)` 在单目录 ≤1000 条规模下 SQLite/D1 全表扫描成本可忽略（SC-001 < 1s）。
- **Rationale**: 宪法 III/IV（最小改动）；当前数据规模远未到索引收益点。
- **Alternatives considered**: 为 `images(parent_id)` 或 `(user_id, parent_id)` 建索引：需新迁移，收益在当前规模下不可测量，记录为后续规模增长时的备选。

## R11: 搜索触发方式与空结果呈现

- **Decision**: 搜索由表单提交触发（Enter 或搜索按钮），不做逐键防抖实时搜索；提交即重置 `page=1`（FR-003）。搜索结果为空时仍渲染工具栏（含搜索框）与"无匹配结果"提示文案，用户可修改关键词——页面空态分支由"无条目"细化为"无条目且无搜索条件"才显示引导文案。
- **Rationale**: 用户要求"简单的关键词搜索"；避免防抖/竞态复杂度。
- **Alternatives considered**: 输入即搜（300ms 防抖）：请求竞态与 URL 抖动管理成本超出"简单"范围，放弃。

## R12: i18n 文案键

- **Decision**: 8 个语言文件追加键：搜索框占位符、搜索按钮、上一页、下一页、页码 aria、频道列头、文件大小列头、无匹配结果提示（约 8 键）。修改时间列头复用既有 `updated` 键；"Title"/"Status" 既有硬编码表头不在本功能范围，不动。
- **Rationale**: FR-015；精准修改原则不顺带修复既有硬编码。
