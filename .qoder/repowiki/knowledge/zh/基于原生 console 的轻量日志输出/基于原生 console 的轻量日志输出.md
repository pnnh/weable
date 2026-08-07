---
kind: logging_system
name: 基于原生 console 的轻量日志输出
category: logging_system
scope:
    - '**'
source_files:
    - src/db/migrate.ts
    - src/app/[lang]/page.tsx
---

该仓库未引入任何第三方日志框架（如 pino、winston、bunyan 等），也未在 src/ 下建立统一的 logger 模块或 log 目录。项目中的日志输出完全依赖 Node.js / Cloudflare Workers 环境内置的 `console` API，属于最轻量的“无配置”日志方式。

已观察到的使用位置与模式：
- 迁移脚本 `src/db/migrate.ts` 中通过 `console.log("✅ Migrations applied successfully.")` 输出迁移完成信息，仅用于本地开发/构建时的提示。
- 页面组件 `src/app/[lang]/page.tsx` 的 catch 块中使用 `console.error("[HomePage] DB count query failed", { message, cause, stack })` 记录数据库查询失败的错误上下文，包含结构化字段（message、cause、stack）。

约束与约定：
- 没有统一的日志级别管理（info/warn/error/debug 等），调用方直接选择 `console.log`、`console.error` 等具体方法。
- 没有集中式日志收集、格式化或输出目标（stdout/stderr/file）的配置；日志由运行环境（Next.js dev server、Wrangler/Cloudflare Workers）默认处理。
- 错误日志采用对象字面量附加上下文（如 `{ message, cause, stack }`），但并未形成跨模块一致的字段规范。

由于缺乏专用日志库与统一抽象，当前日志系统不具备可插拔性、结构化采集与远程聚合能力，仅适合小型项目在本地调试与基础错误追踪场景。