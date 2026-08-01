# Bug 评估：toLocaleDateString() 无 locale 参数导致 SSR 水合不匹配

- **Slug**: `date-locale-hydration`
- **Created**: 2026-08-01
- **Source**: 粘贴文本（浏览器控制台 Hydration 错误）
- **Verdict**: valid
- **Severity**: high

---

## Report（原始错误）

```
Uncaught Error: Hydration failed because the server rendered text didn't match the client.

<td className="py-3 text-gray-500 text-sm">
+  2026/8/1      ← 客户端（浏览器 zh 环境）
-  8/1/2026      ← 服务端（Node.js en-US 环境）
```

React 检测到 SSR 输出与客户端 hydration 结果不一致，抛出水合错误。

---

## Symptom

访问 `/en/console/images`（含至少一条图片或目录条目的状态下）时，页面在客户端 hydration 阶段崩溃，控制台抛出水合不匹配错误。日期列渲染为两个不同格式：服务端输出 `8/1/2026`，客户端输出 `2026/8/1`。  
预期行为：服务端与客户端渲染相同的日期字符串，hydration 无误。

---

## Reproduction

1. 确保数据库中存在至少一条 `images` 记录
2. `pnpm dev` 启动开发服务器
3. 访问 `http://localhost:7600/en/console/images`
4. 浏览器使用非英语（如中文 `zh`）系统 locale
5. 控制台出现 Hydration mismatch，报告日期格式不一致

---

## Suspected Code Paths

- `src/components/ImagesTreeTable.tsx:145` — 问题根源：`new Date(item.updatedAt).toLocaleDateString()` 无 locale 参数

```tsx
<td className="py-3 text-gray-500 text-sm">
    {new Date(item.updatedAt).toLocaleDateString()}   // ← 无 locale
</td>
```

---

## Root Cause Hypothesis

**置信度：高**

`toLocaleDateString()` 在不传 locale 参数时，会使用**当前运行环境的系统 locale**：

- **服务端（Node.js / Cloudflare Worker）**：使用服务器操作系统的 locale（通常为 `en-US`），输出 `8/1/2026`
- **客户端（浏览器）**：使用用户浏览器设置的 locale（如 `zh`），输出 `2026/8/1`

`ImagesTreeTable` 是 Client Component（`"use client"`），但 Next.js 在 SSR 阶段也会在服务端执行它以生成初始 HTML。当两端的系统 locale 不一致时，产生不同的日期字符串，触发 React 水合错误。

根本问题：**未将 locale 锁定为确定值**，导致服务端与客户端产生不同输出。注意：组件已接收 `lang` prop（如 `"en"`），但未传给 `toLocaleDateString()`。

---

## Proposed Remediation

**首选方案**：将 `lang` prop 传给 `toLocaleDateString(lang)` 以锁定 locale，确保服务端与客户端使用相同的 locale 进行格式化。

```diff
- {new Date(item.updatedAt).toLocaleDateString()}
+ {new Date(item.updatedAt).toLocaleDateString(lang)}
```

`lang` 已作为 prop 贯穿 `ImagesTreeTable` 和 `TreeRow` 组件，无需额外传参，改动量最小。

**Alternatives**：
- 使用 `toISOString().slice(0, 10)` 输出固定格式 `YYYY-MM-DD`——完全绕过 locale，但日期显示风格统一（不随语言变化）。若产品需求是本地化日期显示，不适合。
- 使用 `suppressHydrationWarning` 属性——仅隐藏警告，不解决根本问题，不推荐。

**Files likely to change**：
- `src/components/ImagesTreeTable.tsx`

**Tests to add or update**：
- 确认在 `lang="zh"` 与 `lang="en"` 下日期列渲染相同（服务端/客户端一致）

---

## Risks & Considerations

- 改动极小（1 行），无副作用风险
- `lang` prop 已在 `TreeRow` 中可用，无需新增 prop 传递
- Cloudflare Worker 环境与用户浏览器的 locale 可能仍不同，传入显式 `lang` 参数是在 Next.js App Router 中处理此类问题的标准做法

---

## Open Questions

无。根因确定，修复方案明确，可立即执行。
