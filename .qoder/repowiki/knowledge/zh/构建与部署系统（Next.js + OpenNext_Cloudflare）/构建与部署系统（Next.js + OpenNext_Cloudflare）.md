---
kind: build_system
name: 构建与部署系统（Next.js + OpenNext/Cloudflare）
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - next.config.ts
    - wrangler.jsonc
    - open-next.config.ts
    - drizzle.config.ts
---

该项目采用 Next.js App Router 作为前端框架，通过 OpenNext 工具链将 Next.js 应用编译为 Cloudflare Workers 兼容的 Worker 代码，并使用 Wrangler 进行本地开发与部署。构建系统围绕 pnpm 包管理器、Next.js 内置构建流程以及 Cloudflare 生态展开。

**构建工具链**：项目使用 pnpm@10.33.0 作为包管理器，package.json 中定义了四个核心脚本：`dev` 启动 Next.js 开发服务器（端口 7600，启用 Turbo 模式），`build` 执行 Next.js 标准构建，`start` 启动生产服务器，`db:migrate` 运行数据库迁移。依赖管理通过 pnpm-lock.yaml 锁定版本。

**OpenNext 集成**：通过 `@opennextjs/cloudflare` 适配器将 Next.js 应用转换为 Cloudflare Workers 运行时。`open-next.config.ts` 使用 `defineCloudflareConfig` 定义 Cloudflare 特定配置，支持 R2 增量缓存等优化选项。构建产物输出到 `.open-next/` 目录，其中 `worker.js` 是最终部署的入口文件。

**Cloudflare 部署配置**：`wrangler.jsonc` 定义了 Cloudflare Workers 的完整部署配置，包括兼容性日期（2026-04-20）、D1 数据库绑定（weable-db）、R2 存储桶绑定（weable-images 和 NEXT_INC_CACHE_R2_BUCKET），以及静态资源目录（`.open-next/assets`）。

**数据库构建与迁移**：使用 Drizzle ORM 进行数据库操作，`drizzle.config.ts` 配置 SQLite 方言，schema 定义位于 `src/db/schema.ts`，迁移文件存放在 `migrations/` 目录。开发时使用 better-sqlite3 作为本地数据库后端，生产环境切换到 Cloudflare D1。

**构建约束与约定**：Next.js 配置启用了 React StrictMode，允许的开发源限定为 127.0.0.1，支持的页面扩展名包含 js、jsx、ts、tsx、md、mdx。项目未使用 Dockerfile 或 Makefile，完全依赖 Node.js 生态进行构建和部署。

**工作区管理**：虽然存在 `pnpm-workspace.yaml` 文件，但当前项目结构显示为单包项目，未实际使用 workspace 功能。