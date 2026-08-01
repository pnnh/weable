# Bug Fix: toLocaleDateString() 无 locale 参数导致 SSR 水合不匹配

- **Slug**: `date-locale-hydration`
- **Fixed**: 2026-08-01
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

向 `toLocaleDateString()` 传入 `lang` 参数，确保服务端（SSR）与客户端（hydration）使用相同的 locale 格式化日期，消除水合不匹配。

## Changes

| File | Change | Notes |
|------|--------|-------|
| `src/components/ImagesTreeTable.tsx` | modified | `toLocaleDateString()` → `toLocaleDateString(lang)` |

## Diff Highlights

```diff
- {new Date(item.updatedAt).toLocaleDateString()}
+ {new Date(item.updatedAt).toLocaleDateString(lang)}
```

## Tests Added or Updated

无（项目无自动化测试）。手动验收：在浏览器系统 locale 为中文时访问 `/en/console/images`，日期列应稳定显示为 `en` locale 格式，无 hydration 错误。

## Local Verification

- 命令：`pnpm build` → ✓ Compiled successfully（无错误无警告）

## Deviations from Assessment

无。

## Follow-ups

项目中其他 Client Component 内若存在无参数的 `toLocaleDateString()` 调用，建议统一排查并补充 locale 参数，避免同类水合问题。
