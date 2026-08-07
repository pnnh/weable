# Research: 项目测试体系建设

**日期**: 2026-08-07 | **输入**: [plan.md](./plan.md) Technical Context

本特性无需外部澄清项（spec 无 `[NEEDS CLARIFICATION]` 标记）。研究任务聚焦于：vitest/Playwright 在 Next.js 16 + React 19 + pnpm workspace 环境下的落地方式与风险点。

---

## R1: vitest 在 Next.js App Router 项目中的配置方式

- **Decision**: 根目录独立 `vitest.config.ts`，启用 `@vitejs/plugin-react`（JSX 转换）、`environment: "jsdom"`、`setupFiles: ["./vitest.setup.ts"]`，并通过 `resolve.alias` 复制 tsconfig 的 `@/* → ./src/*` 别名；不引入 `vitest.workspace`、不读取 `next.config.ts`。
- **Rationale**: 被测目标（`src/lib`、`src/components`）均为纯客户端代码，不涉及 Server Components 专属 API（`cookies()`、`headers()`、server action），无需 Next.js 运行时模拟。独立配置比复用 Next 构建链更简单、启动更快。JSON locale 导入（`@/locales/*.json`）由 vitest 原生支持（`resolveJsonModule` 语义）。
- **Alternatives considered**:
  - Jest + next/jest：生态成熟，但用户明确指定 vitest，且 vitest 对 TS/ESM/别名开箱即用，配置更少。
  - `next/experimental` 测试工具：面向 Server Components 渲染，本特性不需要，引入复杂度违反简洁原则。

## R2: React 19 组件测试库选型与版本约束

- **Decision**: `@testing-library/react@^16`（React 19 起为 peer 兼容线）+ `@testing-library/jest-dom`（在 `vitest.setup.ts` 中 `import "@testing-library/jest-dom/vitest"`）；交互统一使用 Testing Library 的 `fireEvent`（点击/输入足够），**不引入** `@testing-library/user-event`。
- **Rationale**: 本特性交互断言仅限"点击分页按钮触发回调"、"表单提交"级别，`fireEvent` 完全够用，少一个依赖。@testing-library/react 16.x 正式支持 React 19 的 `act` 环境。
- **Alternatives considered**:
  - user-event：更拟真，但对纯冒烟级断言属过度投入（宪法 IV 简洁优先）。
  - Enzyme：不支持 React 19，直接排除。

## R3: 组件中 Next.js 专有模块的处理策略

- **Decision**:
  - `next/link`（`GameCard`、`SiteHeader`）：**不 mock**，Testing Library 环境下可直接渲染为 `<a>`。
  - `next/navigation` 的 `useRouter`（`LanguageSelector`、`ImageSearchBar`）：在各自测试文件顶部使用 `vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }))`，通过闭包变量捕获 `push` 调用做断言。这是单文件 5 行的轻量桩。
  - `react-icons`（`SiteHeader` 若被共置用例间接涉及）：纯 SVG 组件，无需处理。
- **Rationale**: FR-005 允许在"仅需轻量路由桩"前提下覆盖这两个组件；`vi.mock` 局部桩是 Testing Library 官方文档推荐的 next/navigation 处理方式，不构成"复杂 mock"。
- **Alternatives considered**:
  - 全局 mock `next/navigation`（setup 文件统一桩）：会掩盖未来其他组件对路由的真实依赖，且扩大 mock 面，放弃。
  - 直接放弃这两个组件：可行但损失低成本收益，保留为 MAY。

## R4: Playwright 单浏览器配置与 webServer

- **Decision**: `playwright.config.ts` 配置单一 project（名称 `chromium`，`use: { ...devices["Desktop Chrome"] }` 仅取桌面视口，不配置任何移动端设备）；`testDir: "./e2e"`；`baseURL: "http://localhost:7600"`；`webServer: { command: "pnpm dev", url: "http://localhost:7600", reuseExistingServer: true, timeout: 120_000 }`；`workers: 1`、`fullyParallel: false`（用例仅 2 个，串行更稳定且便于共享登录态）。
- **Rationale**: 端口 7600 与 `package.json` 的 `dev` 脚本一致；`reuseExistingServer: true` 让开发者已开着 dev server 时直接复用，是满足 SC-003（< 2 分钟）的关键——冷启动 Turbopack dev 首请求编译较慢，但 2 个用例可接受；若超时由 Playwright 输出明确错误而非挂起（覆盖 spec Edge Case）。
- **Alternatives considered**:
  - `channel: "chrome"`（真实 Chrome 安装）：依赖本机装有 Chrome，可移植性差；Playwright 自带 Chromium 内核与桌面 Chrome 行为一致，满足"桌面 Chrome"语义。
  - webServer 跑 `next build && next start`：构建约 1 分钟，易突破 2 分钟预算，且 signin 页在 production 返回 404 会导致 console 用例无法建立会话——**此方案不可行**。

## R5: e2e 登录会话建立方式

- **Decision**: `console-images.spec.ts` 在用例内走真实 UI 流程：`page.goto("/en/account/signin")` → 填写 `#email`（固定测试邮箱，如 `e2e@weable.test`）→ 点击提交按钮 → `page.waitForURL("**/en/console")` → 再 `goto("/en/console/images")`。不手工伪造 cookie、不直连数据库。
- **Rationale**: signin 页仅开发环境可用（production `notFound()`），与 dev webServer 天然匹配；Server Action 写入的 `user_id` cookie 由 Playwright 上下文自动保留于同一 `page`；该流程同时冒烟了登录链路本身，成本仅 3 行代码。
- **Alternatives considered**:
  - `context.addCookies` 手工注入 `user_id`：需要预先知道数据库中的用户 id（或先查库），引入 DB 依赖，违反 FR-006 精神。
  - storageState 复用：仅 2 个用例，无复用收益。

## R6: 测试设施与生产构建的隔离

- **Decision**:
  - 所有新增依赖进 `devDependencies`；
  - `e2e/` 位于 `src` 之外，`tsconfig.json` 的 `include: ["**/*.ts"]` 会对其进行类型检查——`@playwright/test` 自带类型，`next build` 的类型检查阶段可正常通过；`next build` 仅以 `src/app` 路由图打包页面，`e2e/` 与 `*.test.*` 文件不会进入产物；
  - 不修改 `next.config.ts`、`open-next.config.ts`、`wrangler.jsonc`。
- **Rationale**: 满足 FR-012 且零业务源码改动（宪法 III）。
- **Alternatives considered**:
  - 将 e2e 移出 tsconfig include（新增 exclude）：需修改 tsconfig，增加改动面；且保留类型检查对 e2e 代码质量有利，放弃。

## R7: npm scripts 命名

- **Decision**: `test`（`vitest run`）、`test:watch`（`vitest`）、`test:e2e`（`playwright test`）。与现有 `dev`/`build`/`db:migrate` 风格一致。
- **Rationale**: `test` 为社区约定入口；e2e 因依赖 dev server 不并入 `test`，保持两条独立命令（FR-011）。
- **Alternatives considered**: `test:unit` + `test:e2e` 双前缀：可行，但 `test` 直连最常用路径更符合习惯，放弃双前缀。

## 结论

全部研究项已收敛，无遗留未知项。Phase 0 完成，可进入 Phase 1 设计。
