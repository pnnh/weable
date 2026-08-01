# Bug Fix: Server Component 向 Client Component 传递函数 prop 导致 500 错误

- **Slug**: `dialog-oncreated-ssr-error`
- **Fixed**: 2026-08-01
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

从 `CreateDirectoryDialog` 的 Props 类型中删除不可序列化的 `onCreated` 函数 prop，改为在组件内部通过 `useRouter().refresh()` 刷新页面数据。同步删除 `page.tsx` 中对该 prop 的传入。

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/components/CreateDirectoryDialog.tsx` | modified | 删除 `onCreated` prop 声明和调用；新增 `useRouter` import；用 `router.refresh()` 替换 `onCreated()` |
| `src/app/[lang]/console/images/page.tsx` | modified | 删除 `onCreated={() => {...}}` prop 传入 |

## Diff Highlights

```diff
// CreateDirectoryDialog.tsx
+ import { useRouter } from "next/navigation";

  type Props = {
      // ...labels...
-     onCreated: () => void;
  };

- export default function CreateDirectoryDialog({ parentId, labels, onCreated }: Props) {
+ export default function CreateDirectoryDialog({ parentId, labels }: Props) {
+     const router = useRouter();
      // ...
-     onCreated();
+     router.refresh();
```

```diff
// page.tsx
  <CreateDirectoryDialog
      lang={l}
      parentId={parentId ?? null}
      labels={dialogLabels}
-     onCreated={() => {
-         if (typeof window !== "undefined") window.location.reload();
-     }}
  />
```

## Tests Added or Updated

无新增自动化测试（项目无测试基础设施）。手动验收参考 quickstart.md 场景 1：创建目录后列表自动刷新，新目录出现。

## Local Verification

- 命令：`pnpm build` → ✓ Compiled successfully（无错误无警告）
- 手动检查：`onCreated` 在两个文件中均已消除

## Deviations from Assessment

无。实际修复与评估中的首选方案完全一致。

## Follow-ups

- 在未来实现 Client Component 时，注意 Server→Client 的 prop 边界约束，函数/回调不可跨边界传递；刷新逻辑应内置于 Client Component。
