# 实现计划：图片目录管理与树形表格展示

**分支**：`001-image-directory-tree` | **日期**：2026-08-01 | **规格**：[spec.md](spec.md)

**输入**：功能规格来自 `specs/001-image-directory-tree/spec.md`

## 摘要

在现有图片管理控制台中，通过复用 `images` 表（`mime_type = 'directory'` 标识目录，新增 `parent_id` 自引用字段）实现目录管理能力，并将列表页改造为支持内联展开/折叠的树形表格，同时支持点击目录名称进入子级列表（URL 参数驱动）。  
技术路径：Drizzle schema 变更 + 数据库迁移 → 新增 API 路由（目录创建、列表查询、面包屑） → 前端改造（Server Component + Client Component 树形表格 + 创建目录弹框）。

## 技术上下文

**语言/版本**：TypeScript 5.x，Node.js（开发）/ Cloudflare Workers（生产）

**主要依赖**：Next.js 16.2.4 App Router、React 19、Drizzle ORM 0.45.2、Tailwind CSS v4、react-icons 5.x、@opennextjs/cloudflare 1.18.0

**存储**：SQLite / better-sqlite3（开发），Cloudflare D1（生产）；文件存储使用本地文件系统（开发）/ Cloudflare R2（生产）

**测试**：无当前测试基础设施，本期以 quickstart.md 中的手动冒烟测试场景替代

**目标平台**：Cloudflare Workers（open-next + wrangler）

**项目类型**：Web 应用（全栈，Next.js App Router）

**性能目标**：树形展开响应时间 < 1 秒（正常网络条件）

**约束**：不引入新的重量级依赖；保持与 Cloudflare Workers 运行时兼容（无 Node.js 原生模块在边缘环境中使用）；符合宪法的精准手术式修改原则

**规模/范围**：单用户操作场景，预期目录深度 ≤ 10 层，单目录条目数 ≤ 1000

## 宪法检查

*门控：Phase 0 研究前必须通过；Phase 1 设计后重新核查。*

| 宪法原则 | 检查结果 | 说明 |
|----------|----------|------|
| **I. 语言规范** | ✅ 通过 | 所有产物使用简体中文；技术标识符保留英文 |
| **II. 上下文优先** | ✅ 通过 | 已阅读 README.md、schema.ts、所有相关页面与 API 路由 |
| **III. 精准手术式修改** | ✅ 通过 | 仅修改 `images` 表（新增 1 字段）；新增独立路由；不改动无关代码 |
| **IV. 简洁优先** | ✅ 通过 | 复用现有表而非新建；面包屑用迭代查询而非 CTE；树形展开仅加载直接子层 |
| **V. 质量门控** | ✅ 通过 | 研究阶段解决了所有不确定点；quickstart.md 定义了可验证的检查点 |
| **技术规范符合性** | ✅ 通过 | Next.js App Router + Drizzle ORM + Cloudflare Workers，无新增重量级依赖 |

**门控结论**：无违规，可继续执行。复杂度追踪表不需要填写。

## 项目结构

### 文档（本功能）

```text
specs/001-image-directory-tree/
├── plan.md              # 本文件（/speckit.plan 输出）
├── research.md          # Phase 0 输出 ✅
├── data-model.md        # Phase 1 输出 ✅
├── quickstart.md        # Phase 1 输出 ✅
├── contracts/
│   ├── post-directories.md            # Phase 1 输出 ✅
│   └── get-images-and-breadcrumb.md   # Phase 1 输出 ✅
└── tasks.md             # Phase 2 输出（/speckit.tasks 命令生成，本阶段不创建）
```

### 源代码（变更范围）

```text
src/
├── db/
│   └── schema.ts                          # 新增 parent_id 字段 + 自引用关系
├── app/
│   ├── api/
│   │   ├── directories/
│   │   │   └── route.ts                   # 新增：POST /api/directories
│   │   ├── images/
│   │   │   ├── route.ts                   # 新增：GET /api/images?parentId=
│   │   │   ├── breadcrumb/
│   │   │   │   └── route.ts               # 新增：GET /api/images/breadcrumb?parentId=
│   │   │   └── [imageId]/
│   │   │       └── route.ts               # 已有，不修改
│   │   └── upload/
│   │       └── route.ts                   # 已有，扩展 parentId 字段
│   └── [lang]/
│       └── console/
│           └── images/
│               └── page.tsx               # 已有，接入 searchParams.parentId；引入 ImagesTreeTable
├── components/
│   ├── ImagesTreeTable.tsx                # 新增 Client Component：树形表格 + 展开/折叠
│   └── CreateDirectoryDialog.tsx          # 新增 Client Component：创建目录对话框
├── locales/
│   ├── zh.json                            # 新增翻译键
│   ├── en.json
│   └── [其余 6 个语言文件]
migrations/
│   └── 000X_add_parent_id_to_images.sql   # drizzle-kit 生成的迁移文件
```

**结构决策**：采用单项目结构（Option 1），Next.js 全栈模式；新增组件独立文件；API 路由按功能分目录，不混入现有路由文件。
