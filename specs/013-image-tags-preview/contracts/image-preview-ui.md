# Contract: 放大预览工具栏与 Lightbox

**Feature**: `013-image-tags-preview`
**Date**: 2026-08-13

## 工具栏顺序

图片预览与表单之间，从左到右：

1. **放大预览**（本功能新增，最左侧）
2. **AI 识别**（011，规则不变）

```html
<div class="toolbar">
  <button type="button" aria-label="{imagePreview}">…TbZoomIn…</button>
  <button type="button" aria-label="{aiRecognize}">…</button>
</div>
```

`/console/images/new` 与目录路径不得出现该工具栏。

## 放大预览按钮

| 属性 | 约定 |
|------|------|
| 元素 | `<button type="button">`（禁止 submit） |
| 图标 | `TbZoomIn`（`react-icons/tb`） |
| 无障碍 | `aria-label` = i18n `imagePreview` |
| 就绪悬停 | `title` = `imagePreview` |
| 图不可用 | `disabled`；`title` = `imagePreviewUnavailable` |
| 与识别关系 | 识别为 unsupported / running / failed 时仍可点（图可用时） |

点击：若 `#image-preview` 为已解码图片（`naturalWidth > 0`），将 Lightbox `index` 设为 `0`。不得开始识别、不得改表单、不得保存。

## Lightbox

库：`yet-another-react-lightbox-lite`。

| 项 | 约定 |
|----|------|
| slides | 单元素 `[{ src: previewImg.src, alt: 当前标题 }]` |
| 打开 | `index === 0` |
| 关闭 | `index === undefined`（关闭按钮、点遮罩、Escape） |
| `labels.Close` | i18n `imagePreviewClose` |
| 缩放 | 使用库默认（滚轮 / 捏合 / 键盘）；放大后可拖动 |
| 图源 | 仅当前页同源 `/{lang}/console/api/images/{id}/file`，禁止外链托管 |
| 画廊 | 不启用无限循环；单图可不渲染有意义的 Previous / Next（库默认单图下一项无效即可） |

关闭后：表单三项与识别状态必须与打开前一致。

## 与识别并存

- 打开预览不得 `abort` 识别。
- 关闭预览不得把 `running` / `failed` 打回 `ready`。
- 确认框 `z-50`；Lightbox 门户 z-index 须高于页面内容（用库默认即可）。两者无需同时可操作。

## i18n keys（追加到 6 份 locale）

| key | 用途 |
|-----|------|
| `imagePreview` | 按钮名 |
| `imagePreviewClose` | Lightbox 关闭 |
| `imagePreviewUnavailable` | 图未就绪 |

## 明确不在合同内

- 点击页面上方缩略图打开预览。
- 上一张 / 下一张相册。
- 为预览另开文件下载或 `next/image` 优化管线。
