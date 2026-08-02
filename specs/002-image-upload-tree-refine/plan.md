# 实现计划：控制台图片批量上传与树形列表优化

**分支**：`002-image-upload-tree-refine` | **日期**：2026-08-02 | **规格**：[spec.md](./spec.md)

**输入**：`/specs/002-image-upload-tree-refine/spec.md`

## 概要

本需求聚焦两个目标：

1. 将控制台图片上传从单文件改为批量上传（最多 50 张、单张 5 MB），上传成功后返回当前目录列表并保留 `parentId` 上下文。
2. 优化目录树表格展开交互，保证左侧三角控件占位固定、子级以树形缩进展示且展开前后不发生横向抖动。

技术策略：复用现有 `POST /api/upload` 和 `GET /api/images?parentId=...` 接口，在最小改动范围内扩展请求契约与前端渲染规则。

## 技术上下文

**语言/版本**：TypeScript 5 + React 19 + Next.js 16（App Router）

**主要依赖**：`next`、`react`、`drizzle-orm`、`better-sqlite3`、`tailwindcss`

**存储**：SQLite（通过 Drizzle ORM），文件存储由 `src/lib/storage.ts` 抽象承载

**测试**：当前仓库未配置独立自动化测试框架；本期采用手工验证 + `pnpm build` 类型与构建回归检查

**目标平台**：Linux 开发环境 + Cloudflare Workers 部署目标

**项目类型**：全栈 Web 应用（Next.js 单仓）

**性能目标**：

- 批量上传校验在提交前即时反馈（数量/大小）
- 树节点展开后子列表可感知地快速呈现（正常网络下接近即时，避免明显卡顿）

**约束**：

- 单批次最多 50 张
- 单文件最大 5 MB
- 上传成功后必须回到当前目录列表，且 `parentId` 不丢失
- 树表格控件列占位固定，展开前后同列对齐稳定

**规模/范围**：

- 主要改动集中在 4 个区域：上传表单、上传 API、图片列表页导航上下文、树表格组件
- 不引入新数据库表，不改变目录/图片核心数据结构

## 宪法检查

*门禁：Phase 0 前必须通过，Phase 1 后复核。*

### Phase 0 前检查

- 语言规范：通过。所有产物使用简体中文。
- 上下文优先：通过。已读取根 README、相关代码与宪法；代码与规格无冲突。
- 精准手术式修改：通过。计划仅覆盖上传与列表相关最小范围文件。
- 简洁优先：通过。复用现有路由与数据结构，不新增不必要抽象。
- 质量门控：通过。已定义可验证场景与后续验证步骤。

结论：**PASS**，允许进入 Phase 0 研究。

### Phase 1 后复核

- 研究与设计产物已生成：`research.md`、`data-model.md`、`contracts/post-upload.md`、`quickstart.md`。
- 无 NEEDS CLARIFICATION 残留。
- 未发现需宪法豁免的复杂度升级项。

结论：**PASS**，可进入 `/speckit.tasks`。

## 项目结构

### 文档（本功能）

```text
specs/002-image-upload-tree-refine/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── post-upload.md
└── tasks.md                 # 由 /speckit.tasks 生成
```

### 源码（仓库根目录）

```text
src/
├── app/
│   ├── [lang]/console/images/
│   │   ├── page.tsx
│   │   └── [imageId]/page.tsx
│   └── api/
│       ├── upload/route.ts
│       └── images/route.ts
├── components/
│   ├── ImageUploadForm.tsx
│   └── ImagesTreeTable.tsx
├── db/
│   └── schema.ts
└── locales/
    ├── en.json
    ├── zh.json
    └── ...
```

**结构决策**：采用现有 Next.js 单项目结构，在 `src/app` 与 `src/components` 内做增量修改；不拆分前后端目录，不新增独立服务。

## 复杂度追踪

当前无宪法违规项，无需复杂度豁免记录。
