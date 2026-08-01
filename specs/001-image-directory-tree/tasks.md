# 任务列表：图片目录管理与树形表格展示

**输入**：`specs/001-image-directory-tree/` 下的设计文档

**前置条件**：plan.md ✅、spec.md ✅、research.md ✅、data-model.md ✅、contracts/ ✅、quickstart.md ✅

**测试**：无自动化测试基础设施，以 quickstart.md 中的手动冒烟场景作为验收依据

**组织方式**：按用户故事分阶段，每个故事独立可测试

## 格式：`[ID] [P?] [Story?] 描述 文件路径`

- **[P]**：可并行执行（操作不同文件，无未完成的依赖）
- **[US?]**：所属用户故事（US1–US4）
- 所有描述包含精确的文件路径

---

## Phase 1：Setup（共享基础设施）

**目的**：数据层变更，所有用户故事的前置条件

- [X] T001 在 `src/db/schema.ts` 的 `images` 表中新增 `parentId` 自引用字段，并在 `imagesRelations` 中新增 `parent`/`children` 自引用关系
- [X] T002 执行 `pnpm drizzle-kit generate` 生成迁移文件并验证 SQL 包含 `parent_id` 字段定义

**检查点**：`pnpm db:migrate` 执行无错误，`sqlite3 .data/weable.db ".schema images"` 输出包含 `parent_id`

---

## Phase 2：Foundational（所有故事共用的 API 与 i18n）

**目的**：所有用户故事依赖的公共接口与文案，MUST 在用户故事实现前完成

**⚠️ 关键**：GET /api/images 路由（T004）是 US2 树形展开的必要依赖

- [X] T003 [P] 向 `src/locales/zh.json`、`en.json`、`zh-TW.json`、`ja.json`、`de-DE.json`、`es.json`、`fr.json`、`pt-PT.json` 全部 8 个文件新增以下 i18n 键：`newDirectory`、`directoryName`、`directoryNamePlaceholder`、`directoryDescriptionPlaceholder`、`createDirectory`、`cancel`、`duplicateEntryName`、`nameRequired`、`breadcrumbRoot`、`invalidTitleChars`
- [X] T004 [P] 新建 `src/app/api/images/route.ts`，实现 `GET /api/images?parentId=` 路由：按 `parent_id` 过滤当前用户的直接子条目，目录优先排序，返回 `{ items: [...] }`
- [X] T005 [P] 新建 `src/app/api/images/breadcrumb/route.ts`，实现 `GET /api/images/breadcrumb?parentId=` 路由：服务端迭代向上最多 20 步，返回 `{ breadcrumb: [{ id, title }] }`

**检查点**：`GET /api/images` 返回 `{ items: [] }`；`GET /api/images/breadcrumb?parentId=nonexistent` 返回 404

---

## Phase 3：用户故事 1 — 创建目录（优先级：P1）🎯 MVP

**目标**：管理员可在根目录（初始实现）创建新目录条目

**独立测试**：执行 quickstart.md 场景 1 和场景 2；新目录出现在页面列表中，重名创建被拒绝

### US1 实现任务

- [X] T006 [P] [US1] 新建 `src/app/api/directories/route.ts`，实现 `POST /api/directories`：校验 `title`（必填、字符限制、长度限制）、`parentId` 存在性、同级重名，写入 `mime_type='directory'` 记录，返回 `{ id }`
- [X] T007 [P] [US1] 新建 `src/components/CreateDirectoryDialog.tsx`（`"use client"`）：弹框接受 `parentId?: string | null` 和 `onCreated: () => void` props，包含名称输入（必填校验）、描述输入（选填）、确认/取消按钮，提交时调用 `POST /api/directories`，展示服务端错误（重名等）
- [X] T008 [US1] 修改 `src/app/[lang]/console/images/page.tsx`：在"上传图片"按钮左侧添加"新建目录"按钮，引入 `CreateDirectoryDialog`，传入 `parentId={undefined}`（US3 将更新为读取 URL 参数），创建成功后调用 `router.refresh()`

**检查点**：执行 quickstart.md 场景 1（创建成功）和场景 2（重名拒绝）后可进入 Phase 4

---

## Phase 4：用户故事 2 — 树形表格展开/折叠（优先级：P2）

**目标**：列表页显示树形表格，点击目录三角图标内联展开/折叠子条目

**独立测试**：执行 quickstart.md 场景 3；点击三角图标后看到子条目，再次点击折叠

**依赖**：T004（GET /api/images 路由）必须已完成

### US2 实现任务

- [X] T009 [US2] 新建 `src/components/ImagesTreeTable.tsx`（`"use client"`）：接受 `initialItems: ImageEntry[]`、`lang: LangKey`、`depth?: number` props；目录行最左侧显示 ▶/▼ 三角按钮（空目录不显示或禁用），点击时调用 `GET /api/images?parentId={id}` 懒加载子条目并内联渲染子层（递归）；图片行显示缩略图、标题（Link 到 `/${lang}/console/images/${id}`）、状态、更新时间；目录行标题为普通 Link（US3 中将指向子级页面）
- [X] T010 [US2] 修改 `src/app/[lang]/console/images/page.tsx`：将现有 `<table>` 替换为 `<ImagesTreeTable>`，将初始查询结果作为 `initialItems` 传入

**检查点**：执行 quickstart.md 场景 3（展开折叠）后可进入 Phase 5

---

## Phase 5：用户故事 3 — 点击目录进入子级列表（优先级：P2）

**目标**：点击目录名称跳转至子级列表页，URL 含 `parentId` 参数，显示面包屑导航

**独立测试**：执行 quickstart.md 场景 4（点击目录）和场景 7（面包屑多级导航）

**依赖**：T005（breadcrumb 路由）、T009（ImagesTreeTable 中目录 Link 已存在）

### US3 实现任务

- [X] T011 [US3] 修改 `src/app/[lang]/console/images/page.tsx`：从 `props.searchParams` 读取 `parentId`，将数据库查询改为按 `parentId` 过滤（`parentId` 为空查询 `parent_id IS NULL`，否则查询 `parent_id = parentId`），将 `parentId` 作为 prop 传入 `ImagesTreeTable` 和 `CreateDirectoryDialog`
- [X] T012 [US3] 修改 `src/app/[lang]/console/images/page.tsx`：在 `parentId` 存在时，于标题区域上方添加面包屑导航区域，服务端迭代查询祖先链（无需调用 breadcrumb API，直接在 Server Component 中执行），以 `<Link>` 渲染每一级，根目录链接指向无 `parentId` 的列表页
- [X] T013 [US3] 修改 `src/app/[lang]/console/images/page.tsx`：若 `parentId` 非空但查询不到该目录（不存在、不属于当前用户或 `mime_type != 'directory'`），调用 `notFound()` 返回 404
- [X] T014 [US3] 修改 `src/components/ImagesTreeTable.tsx`：将目录条目的标题从静态文本改为 `<Link href="/{lang}/console/images?parentId={id}">`，使点击目录名称触发页面级导航

**检查点**：执行 quickstart.md 场景 4、7、8 后可进入 Phase 6

---

## Phase 6：用户故事 4 — 在指定目录下上传图片（优先级：P3）

**目标**：在子级列表页上传的图片自动归属当前目录

**独立测试**：执行 quickstart.md 场景 6；上传后图片出现在子级列表，数据库 `parent_id` 正确

**依赖**：T011（page.tsx 已读取 parentId）

### US4 实现任务

- [X] T015 [P] [US4] 修改 `src/app/api/upload/route.ts`：从 `formData` 读取可选字段 `parentId`；若存在则校验该目录存在且属于当前用户（`mime_type = 'directory'`），否则返回 404；将 `parentId` 写入 `parent_id` 字段
- [X] T016 [US4] 修改 `src/app/[lang]/console/images/page.tsx`：将"上传图片"的 `<Link href>` 更新为携带当前 `parentId` 的查询参数（若存在），使上传页面能读取并回传 `parentId` 到 upload 路由

**检查点**：执行 quickstart.md 场景 5（子目录建目录）和场景 6（子目录上传图片）

---

## Phase 7：收尾与跨切面

**目标**：安全加固与边界处理

- [X] T017 [P] 修改 `src/app/api/images/[imageId]/file/route.ts`：在提供文件内容前检查 `mime_type != 'directory'`，若为目录条目则返回 404，防止目录被当作文件访问
- [X] T018 [P] 修改 `src/app/[lang]/console/images/[id]/page.tsx`（图片详情页）：若加载的条目 `mime_type = 'directory'`，调用 `notFound()` 或重定向，防止目录被当作图片详情访问

---

## 依赖关系图

```
T001 → T002 → [所有后续任务]

T002 ─┬─ T003 (并行)
      ├─ T004 (并行)
      └─ T005 (并行)

T003 + T006 + T007 → T008  [US1 检查点]

T004 + T008 → T009 → T010  [US2 检查点]

T005 + T010 → T011 → T012 → T013 → T014  [US3 检查点]

T011 → T015 → T016  [US4 检查点]

T010 → T017, T018  (可与 Phase 6 并行)
```

## 并行执行示例

**Phase 2 全并行**：T003、T004、T005 同时执行（操作不同文件）

**Phase 3 部分并行**：T006（API 路由）与 T007（对话框组件）同时执行，T008 等两者完成

**Phase 7 全并行**：T017、T018 同时执行

## 实现策略

**MVP 范围（最小可验证产品）**：仅完成 Phase 1 + Phase 2 + Phase 3（T001–T008）  
→ 用户可创建目录，目录出现在列表中；页面导航与树形展示尚未改造

**增量交付顺序**：
1. Phase 1+2+3：目录创建能力（US1 可演示）
2. Phase 4：树形展开（US2 可演示）
3. Phase 5：子级导航与面包屑（US3 可演示）
4. Phase 6：子目录上传（US4 完整闭环）
5. Phase 7：安全加固（可与 Phase 5/6 同步）
