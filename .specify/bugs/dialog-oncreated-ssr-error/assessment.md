# Bug 评估：Server Component 向 Client Component 传递函数 prop 导致 500 错误

- **Slug**: `dialog-oncreated-ssr-error`
- **Created**: 2026-08-01
- **Source**: 粘贴文本（pnpm dev 控制台错误输出）
- **Verdict**: valid
- **Severity**: high

---

## Report（原始错误）

```
⨯ Error: Event handlers cannot be passed to Client Component props.
  <... lang="en" parentId={Null} labels=... onCreated={function onCreated}>
                                                      ^^^^^^^^^^^^^^^^^^^^
If you need interactivity, consider converting part of this to a Client Component.

GET /en/console/images 500 in 985ms
```

---

## Symptom

访问 `/en/console/images`（及任何语言的 `/[lang]/console/images`）时，Next.js 在渲染阶段抛出 500 错误，错误信息明确指向 `onCreated={function onCreated}` prop。  
预期行为：页面正常渲染图片管理界面。

---

## Reproduction

1. 启动开发服务器：`pnpm dev`
2. 浏览器访问 `http://localhost:7600/en/console/images`
3. 页面返回 500，控制台输出上述错误

---

## Suspected Code Paths

- `src/app/[lang]/console/images/page.tsx` — Server Component，在 ~L130 处向 `CreateDirectoryDialog` 传递了 `onCreated` 箭头函数 prop
- `src/components/CreateDirectoryDialog.tsx` — Client Component，声明并接受 `onCreated: () => void` prop

具体问题行（`page.tsx`）：

```tsx
<CreateDirectoryDialog
    lang={l}
    parentId={parentId ?? null}
    labels={dialogLabels}
    onCreated={() => {                          // ← 问题根源
        if (typeof window !== "undefined") window.location.reload();
    }}
/>
```

---

## Root Cause Hypothesis

**置信度：高**

Next.js App Router 的渲染模型要求：Server Component 只能向 Client Component 传递**可序列化的数据**（字符串、数字、普通对象、数组等）；**函数（包括箭头函数）不可序列化**，无法跨 Server→Client 边界传递。

`page.tsx` 是 Server Component（`async function`，直接调用 `getDb()`），`CreateDirectoryDialog` 是 Client Component（`"use client"`）。  
将 `onCreated={()=>{...}}` 从 Server Component 传到 Client Component，违反了 React Server Components 规范，Next.js 在序列化 RSC Payload 时抛出错误，导致整个路由 500。

这是本次功能实现（T008）中的一个设计错误：`onCreated` 回调应当**在 Client Component 内部实现**，而非由 Server Component 注入。

---

## Proposed Remediation

**首选方案**：从 `CreateDirectoryDialog` 的 Props 类型中删除 `onCreated`，改为在组件内部通过 `useRouter().refresh()` 刷新当前页面数据。

**变更说明**：
- `CreateDirectoryDialog` 内部 `import { useRouter } from "next/navigation"`，创建成功后调用 `router.refresh()`
- 移除 `onCreated: () => void` 字段
- `page.tsx` 中删除 `onCreated={...}` 传入

`router.refresh()` 会触发 Next.js App Router 对当前路由的服务端重新获取数据，与 `window.location.reload()` 的效果等价，但更符合框架范式（无整页刷新，保留客户端状态）。

**Files likely to change**：
- `src/components/CreateDirectoryDialog.tsx`
- `src/app/[lang]/console/images/page.tsx`

**Tests to add or update**：
- 执行 quickstart.md 场景 1：创建目录后页面自动刷新，新目录出现在列表中

---

## Risks & Considerations

- 修复影响范围极小，仅两个文件各删除/改动 1–3 行，无副作用
- `router.refresh()` 不会丢失其他客户端状态（如 `ImagesTreeTable` 的展开状态会被重置，但这是预期行为——等同于刷新）
- Server Component 和 Client Component 的边界问题在 Next.js App Router 开发中属于高频错误，宪法中的"V. 质量门控"要求在实现前应先验证此类约束

---

## Open Questions

无。根因明确，修复方案确定，可立即执行。
