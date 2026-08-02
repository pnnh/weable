# Bug Fix: 树形列表整体缩进与图标尺寸修复

- **Slug**: images-tree-indent-icon-size
- **Fixed**: 2026-08-02T00:00:00Z
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

已将目录展开后的层级缩进从“仅名称列”调整为“三角箭头+图标+名称联合区域”缩进，并下调目录/图片图标尺寸，使视觉层级表达与字体比例更一致，同时保持表格列宽稳定。

## Changes

- `src/components/ImagesTreeTable.tsx`: modified
  合并“图标+标题”渲染区域并应用层级缩进；下调图标尺寸；追加“箭头与内容同幅度缩进”补丁；同步空目录/错误行缩进与列结构。

## Diff Highlights (optional)

```tsx
const TOGGLE_SLOT_SIZE_CLASS = "w-5 h-5";
const ITEM_ICON_SIZE_CLASS = "w-8 h-8";
const shiftStyle = indent > 0 ? { transform: `translateX(${indent}px)` } : undefined;

<td className={`py-3 pr-2 ${TOGGLE_CELL_WIDTH_CLASS}`}>
  <div style={shiftStyle}>{/* expand arrow */}</div>
</td>

<td className="py-3 pr-4">
  <div className="flex items-center gap-3 min-w-0" style={shiftStyle}>
    {/* icon */}
    {/* title link */}
  </div>
</td>
```

```tsx
<thead>
  <tr>
    <th className="py-3" />
    <th className="py-3 pr-4">Title</th>
    <th className="py-3 pr-4">Status</th>
    <th className="py-3">{labels.updated}</th>
  </tr>
</thead>
```

## Tests Added or Updated

- 无自动化测试文件新增（项目当前未配置该页面的自动化测试框架）。
- 已按评估建议执行构建级回归验证，手工页面验证留在后续 `/speckit.bug.test` 阶段完成。

## Local Verification

- Commands run: `pnpm build` → pass（Next.js 编译、TypeScript 检查、页面生成均成功）
- Manual checks: 未在本阶段执行登录态页面手工点击验证（将在后续 bug test 阶段执行）

## Deviations from Assessment

无。

## Follow-ups

- 在 `/en/console/images` 进行手工回归：展开 2 层以上目录，确认“图标+名称”整体缩进与图标尺寸观感。
- 后续可补充 E2E：基于 `depth` 校验图标与标题区域共同位移。
