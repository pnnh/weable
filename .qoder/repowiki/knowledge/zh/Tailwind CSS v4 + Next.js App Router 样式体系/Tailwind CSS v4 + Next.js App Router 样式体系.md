---
kind: frontend_style
name: Tailwind CSS v4 + Next.js App Router 样式体系
category: frontend_style
scope:
    - '**'
source_files:
    - src/app/globals.css
    - postcss.config.mjs
    - package.json
    - next.config.ts
---

本项目采用 Tailwind CSS v4（通过 `@tailwindcss/postcss`）作为唯一的前端样式方案，配合 Next.js App Router 的 `globals.css` 进行全局主题与字体配置。样式系统核心特征如下：

**样式框架与工具链**
- 使用 Tailwind CSS v4 的 `@import "tailwindcss"` 语法替代传统 `tailwind.config.js` 配置文件，所有样式扩展直接在 CSS 中通过 `@theme inline` 声明。
- PostCSS 仅配置 `@tailwindcss/postcss` 插件，无其他预处理步骤，保持极简构建链。
- Next.js 16.2.4 原生支持 Tailwind v4，无需额外 webpack/PostCSS 配置。

**设计令牌与主题**
- 在 `src/app/globals.css` 中通过 CSS 自定义属性定义基础色板：`--background`、`--foreground` 以及字体变量 `--font-sans`、`--font-mono`。
- 使用 `prefers-color-scheme: dark` 媒体查询实现自动暗色模式切换，背景色从 `#ffffff` 切换至 `#0a0a0a`。
- 字体优先使用 Geist Sans/Mono（Next.js 默认），fallback 为 Arial/Helvetica/sans-serif。

**组件样式约定**
- 所有页面与组件直接使用 Tailwind 原子类（如 `flex`、`grid`、`text-gray-900`、`rounded-lg`、`hover:shadow-md`），未引入第三方 UI 组件库。
- 响应式采用 Tailwind 内置断点（`sm:`、`md:`、`lg:`），布局以 flexbox 和 grid 为主。
- 颜色统一使用 Tailwind 语义化命名（`gray-500`、`gray-900` 等），未自定义扩展色板。

**约束与规范**
- 无独立 CSS/SCSS 文件，所有样式通过 Tailwind 原子类内联于 JSX。
- 无 SCSS/Less 预处理器，无 CSS Modules，无 styled-components 等 CSS-in-JS 方案。
- 无 `tailwind.config.js` 或 `tailwind.config.ts`，主题扩展全部集中在 `globals.css` 的 `@theme inline` 块中。
- 图标使用 `react-icons` 库，与 Tailwind 原子类组合使用。