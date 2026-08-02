# Bug Assessment: 树形列表缩进范围与图标尺寸不一致

- **Slug**: images-tree-indent-icon-size
- **Created**: 2026-08-02T00:00:00Z
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

用户反馈：依据 `specs/002-*` 规范，`/en/console/images` 页面展开目录时，子级内容已缩进，但看起来仅文件/目录名称发生缩进，图标未作为整体一起缩进；另外当前图标偏大，希望缩小到更接近文字大小。

原始输入（摘要）：
- 展开目录时“应连图标和文件名称一起整体缩进”。
- 图标“稍微调小一点”。

## Symptom

在目录展开后的子级行中，名称列按层级缩进，但缩略图/文件夹图标所在列未同步缩进，导致“图标+名称”不是一个整体层级块，视觉层级表达与预期不一致。与此同时，图标尺寸与当前表格文字（`text-sm`）相比偏大。

## Reproduction

1. 打开 `/en/console/images`，确保存在可展开目录。
2. 点击目录左侧三角展开子级。
3. 观察子级行：名称位置有缩进，但图标列未等比后移，图标与名称不在同一缩进块。
4. 对比图标尺寸与名称文字，图标明显更大。

## Suspected Code Paths

- `src/components/ImagesTreeTable.tsx` — 树行渲染核心逻辑。
- `src/components/ImagesTreeTable.tsx`（`TreeRow`）— 缩进只应用在标题列：`<td className="py-3 pr-4" style={{ paddingLeft: `${indent}px` }}>`。
- `src/components/ImagesTreeTable.tsx`（`TreeRow`）— 图标列固定：`<td className="py-3 pr-4 w-12">`，未参与层级缩进。
- `src/components/ImagesTreeTable.tsx`（`TreeRow`）— 图标尺寸较大：文件夹 `w-10 h-10 text-xl`，图片缩略图容器 `w-10 h-10`。

## Root Cause Hypothesis

当前实现把层级缩进仅绑定到标题单元格（名称列），而图标列独立固定宽度且无深度位移，导致子级“图标+名称”拆成两种对齐策略，出现“只文字缩进”的视觉效果。另一个问题是图标容器尺寸按 `40px` 级别设置（`w-10 h-10` + 文件夹 `text-xl`），在 `text-sm` 表格中显得偏大。该行为与规范中“树形层级整体缩进、视觉一致”的意图不一致。置信度：**high**。

## Proposed Remediation

**Preferred**: 在 `ImagesTreeTable` 中将层级缩进应用到“图标+名称”共同区域，而非仅名称列。可通过以下方式实现：
1. 将 `indent` 作用到图标列与标题列的组合容器（或在图标列增加深度相关偏移，同时保持列宽稳定），确保子级整行视觉块整体右移。
2. 保留左侧三角控件列固定占位（满足 FR-011），但把层级表达从“仅标题列”改为“图标+标题联合缩进”。
3. 下调图标尺寸（如文件夹容器与缩略图容器从 `w-10 h-10` 调整到更接近文本比例的尺寸），并同步微调 `text-xl`。

**Alternatives** (optional):
- 仅缩小图标尺寸，不调整缩进范围：可缓解“图标偏大”，但不能解决“整体缩进”缺陷。
- 仅把缩进从标题列转移到图标列：会影响文本可读性与列对齐，需配合列结构联调。

**Files likely to change**:
- `src/components/ImagesTreeTable.tsx`

**Tests to add or update**:
- 手工回归：展开 2 层以上目录，确认子级“图标+名称”共同右移，且同层级对齐稳定。
- 手工回归：对比目录与图片行图标尺寸与 `text-sm` 文字比例，确认视觉接近。
- 若后续引入 E2E：增加基于 `depth` 的行位置断言（图标列与标题列共同位移）。

## Risks & Considerations

- 调整图标列缩进时需避免破坏现有列宽稳定性，否则可能回归到横向抖动问题。
- 过度缩小图标会降低可辨识度，需要在层级清晰与可读性间平衡。
- 空目录占位行与加载失败行也应保持同一缩进规则，避免局部不一致。

## Open Questions

- [NEEDS CLARIFICATION: 图标目标视觉尺寸是否有明确基准（例如 16px / 18px / 20px）？]
- [NEEDS CLARIFICATION: “整体缩进”是否要求图标列与标题列完全同幅度位移，或允许图标略小步长位移以保持表格紧凑？]
