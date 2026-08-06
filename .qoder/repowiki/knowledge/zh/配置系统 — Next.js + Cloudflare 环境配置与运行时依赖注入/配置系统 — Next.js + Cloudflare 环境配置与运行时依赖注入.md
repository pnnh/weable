---
kind: configuration_system
name: 配置系统 — Next.js + Cloudflare 环境配置与运行时依赖注入
category: configuration_system
scope:
    - '**'
source_files:
    - wrangler.jsonc
    - next.config.ts
    - open-next.config.ts
    - drizzle.config.ts
    - src/db/index.ts
    - src/lib/storage.ts
    - src/lib/auth.ts
    - src/lib/i18n.ts
---

该仓库采用**多配置文件 + 环境变量 + 运行时环境检测**的组合方式管理配置，覆盖构建期、开发期和 Cloudflare 运行期三个层面。

### 1. 使用的框架与工具
- **Wrangler** (`wrangler.jsonc`)：Cloudflare Workers / Pages 的部署配置，声明 D1 数据库绑定、R2 存储桶绑定、Assets 目录等。
- **Next.js** (`next.config.ts`)：应用级构建与开发配置（页面扩展名、StrictMode、允许的开发源）。
- **OpenNext** (`open-next.config.ts`)：Next.js → Cloudflare Workers 的桥接配置，可选启用 R2 增量缓存。
- **Drizzle Kit** (`drizzle.config.ts`)：ORM 迁移与 schema 生成配置，指向 SQLite 方言。
- **pnpm** (`package.json` scripts)：通过 `dev`/`build`/`start`/`db:migrate` 脚本驱动不同阶段的配置加载。

### 2. 核心文件与位置
- `wrangler.jsonc`：Cloudflare 运行时绑定（D1 `DB`、R2 `IMAGES_BUCKET`/`NEXT_INC_CACHE_R2_BUCKET`、Assets `ASSETS`）。
- `next.config.ts`：Next.js 构建与开发期配置。
- `open-next.config.ts`：OpenNext 到 Cloudflare 的适配配置。
- `drizzle.config.ts`：Drizzle ORM 迁移输出目录与方言。
- `src/db/index.ts`：运行时选择 D1 或本地 SQLite 数据库连接。
- `src/lib/storage.ts`：运行时选择 R2 或本地文件系统存储适配器。
- `src/lib/auth.ts`：开发模式下的用户信息默认值。
- `src/lib/i18n.ts`：静态导入的多语言 JSON 资源映射。

### 3. 架构与设计决策
- **运行时环境检测**：通过 `@opennextjs/cloudflare` 的 `getCloudflareContext()` 判断是否在 Cloudflare 环境中运行，据此动态选择 D1/R2 或本地 SQLite/文件系统实现。
- **双后端抽象**：数据库层提供 `getDb()`，存储层提供 `getStorage()`/`getAvatarStorage()`，均按环境自动返回对应适配器，调用方无需感知底层差异。
- **环境变量优先级**：所有可配置项均提供 `process.env.X || default` 形式的回退，如 `DB_PATH`、`IMAGE_STORAGE_PATH`、`DEV_USER_ID` 等。
- **绑定命名约定**：Cloudflare 绑定名称在 `wrangler.jsonc` 中声明（`DB`、`IMAGES_BUCKET`、`NEXT_INC_CACHE_R2_BUCKET`、`ASSETS`），并在运行时通过 `env.BINDING_NAME` 访问，形成强约定。
- **静态资源内联**：i18n 翻译文件通过 TypeScript 直接 `import` 进代码，不依赖运行时加载，保证类型安全与 tree-shaking。

### 4. 约定与约束
- **Cloudflare 绑定必须匹配**：若检测到 Cloudflare 上下文但缺少 `DB` 或 `IMAGES_BUCKET` 绑定，会抛出明确错误提示检查 `wrangler.jsonc` 配置（见 `src/db/index.ts:55`、`src/lib/storage.ts:191`）。
- **本地开发默认路径**：未设置 `DB_PATH` 时默认使用 `./.data/weable.db`，未设置 `IMAGE_STORAGE_PATH` 时默认使用 `./.data/uploads`，目录会自动创建。
- **开发模式降级**：非生产环境下 `auth.ts` 使用 `DEV_USER_*` 环境变量或硬编码默认值，跳过真实认证流程。
- **迁移与 schema 分离**：Drizzle 的 schema 定义位于 `src/db/schema.ts`，迁移 SQL 输出至 `migrations/`，由 `drizzle.config.ts` 统一关联。
- **无集中式配置中心**：项目未使用 `.env` 文件或外部配置服务，所有配置通过 Cloudflare 绑定、`process.env` 和 TypeScript 常量组合完成。