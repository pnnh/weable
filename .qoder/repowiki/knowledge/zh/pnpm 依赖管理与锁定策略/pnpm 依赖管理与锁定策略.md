---
kind: dependency_management
name: pnpm 依赖管理与锁定策略
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - pnpm-lock.yaml
    - pnpm-workspace.yaml
---

本项目采用 pnpm 作为包管理器，通过单一根级 package.json 集中声明所有依赖，配合 pnpm-lock.yaml 锁定精确版本，确保构建可重现。

**系统/工具**
- 包管理器：pnpm（packageManager 字段指定 pnpm@10.33.0）
- 锁定文件：pnpm-lock.yaml（lockfileVersion 9.0），记录每个依赖的精确版本与 integrity hash
- 工作区配置：pnpm-workspace.yaml 仅配置 onlyBuiltDependencies，未启用多包 workspace
- 构建工具链：Next.js + OpenNext（@opennextjs/cloudflare）+ Wrangler，面向 Cloudflare Workers 部署

**关键文件**
- `package.json`：唯一依赖声明入口，区分 dependencies 与 devDependencies
- `pnpm-lock.yaml`：完整依赖树锁定，包含 packages 段中每个包的 resolution 与 engines 约束
- `pnpm-workspace.yaml`：仅声明 better-sqlite3、esbuild、workerd 为允许本地编译的原生依赖

**架构与约定**
- 单包结构：项目未使用 pnpm workspace，所有依赖集中在根 package.json，无子包或 monorepo 拆分
- 版本策略：核心运行时依赖（next、react、react-dom）使用固定版本号（16.2.4、19.2.4），第三方库普遍使用 ^ 语义化版本前缀，允许小版本升级
- 原生依赖白名单：better-sqlite3、esbuild、workerd 被显式列入 onlyBuiltDependencies，其他含 native 代码的包不会被自动编译，避免不必要的构建开销
- 类型声明分离：@types/* 包统一放在 devDependencies 中，运行时不引入类型定义
- 开发脚本：scripts 仅提供 dev/build/start/db:migrate，无依赖更新或审计脚本

**约束与规则**
- 禁止随意添加原生依赖：只有 pnpm-workspace.yaml 中列出的包允许触发本地编译，新增含 native 模块的依赖需先添加到 onlyBuiltDependencies
- 锁定文件必须提交：pnpm-lock.yaml 纳入版本控制，保证团队与 CI 环境依赖一致性
- 包管理器锁定：packageManager 字段强制团队成员使用指定版本的 pnpm，避免解析差异
- 无私有仓库配置：未发现 .npmrc、.pnpmrc 或 registry 配置，依赖全部来自公共 npm registry