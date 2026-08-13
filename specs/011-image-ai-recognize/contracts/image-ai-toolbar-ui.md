# Contract: 图片编辑页 AI 工具栏与表单

**Feature**: `011-image-ai-recognize`
**Date**: 2026-08-13

## 入口与位置

仅当 `imageId !== "new"` 且记录 `mimeType !== "directory"` 时渲染。

顺序（自上而下）：

1. 预览 `<img id="image-preview">`（现有样式：`max-w-full max-h-64`）
2. 工具栏（新）：最左侧「AI 识别」
3. 标题、描述（移入 `ImageAiMetaSection`，仍在同一 `<form action={handleSave}>` 内）
4. 频道、发布、保存/取消、删除（原样）

`/console/images/new` 与目录 404 路径不得出现工具栏。

---

## 工具栏按钮

| 属性 | 约定 |
|------|------|
| 元素 | `<button type="button">`（禁止 `submit`） |
| 就绪图标 | `TbPhotoAi` |
| 进行中 | `TbLoader2` + 旋转；`disabled` |
| 失败 | `TbAlertCircle` |
| 不支持 | `TbPhotoAi` + `disabled` |
| 无障碍 | `aria-label` = i18n `aiRecognize`；进行中 `aria-busy="true"` |
| 失败悬停 | 原生 `title` = 最近一次错误文案 |
| 不支持悬停 | `title` = i18n `aiRecognizeUnsupported` |

点击行为：

| 当前状态 | 点击 |
|----------|------|
| `unsupported` / `running` | 无操作 |
| `ready` | 打开确认（下拉重置为 URL `[lang]`），不开始识别 |
| `failed` | 立即 `running`，用 `lastConfirmedLang` 识别，不再弹确认 |

规格 FR-014：跳过确认仅适用于失败后的重试。成功回到 `ready` 后再点，应再次确认（覆盖已填内容）。

---

## 确认框

与 `BatchDeleteDialog` 同级视觉：`fixed inset-0 z-50` 遮罩 + 白底卡片。

必须包含：

- 标题：`aiRecognizeConfirmTitle`
- 正文：本机识别、将覆盖标题与描述、不会自动保存
- 目标语言 `<select>`：选项与 `supportedLanguages` 一致（English / Español / 简体中文，值 `en` / `es` / `zh`）；打开时默认 URL `[lang]`；`aria-label` = `aiRecognizeTargetLang`
- 取消：关闭，表单不变，丢弃本次 `draftLang`
- 执行：关闭；把 `draftLang` 写入 `lastConfirmedLang`；按该语言开始识别

进行中不得再打开第二层确认。`window.confirm` / `alert` 禁止。下拉变更不得改站点 URL 或界面语言。

---

## 表单字段

```html
<input name="title" required value="{state.title}" />
<textarea name="description" rows="8" value="{state.description}" />
```

- 初始值 = 服务端 `existingImage.title` / `description`。
- 识别成功：两个字段同时替换为结果（描述可为 `""`）。
- 识别失败：两个字段保持识别前的 state。
- 不得改 `channelId`、`isPublished`。
- 不得调用 `form.requestSubmit()` 或导航离开。

---

## i18n keys（追加到 en / es / zh）

| key | 用途 |
|-----|------|
| `aiRecognize` | 按钮 aria-label / 就绪 title |
| `aiRecognizeConfirmTitle` | 确认标题 |
| `aiRecognizeConfirmBody` | 确认正文 |
| `aiRecognizeConfirm` | 执行按钮 |
| `aiRecognizeTargetLang` | 目标语言下拉的 label / aria-label |
| `aiRecognizeUnsupported` | 禁用悬停 |
| `aiRecognizeRunning` | 进行中悬停（可选但建议） |
| `aiRecognizeTimeout` | 错误：超时 |
| `aiRecognizeModelNotReady` | 错误：模型未就绪 |
| `aiRecognizeImageUnreadable` | 错误：读不到图 |
| `aiRecognizeEmptyTitle` | 错误：空标题 |
| `aiRecognizeFailed` | 错误：其它 |

`cancel` 复用已有 key。

宪法列出的其它语言代码本期不新增文件（以 `src/lib/language.ts` 为准）。

---

## 网络约定（E2E 可测）

从点击「AI 识别」到识别结束：

- **允许**：已有预览图的 GET（页面加载阶段已发生）。
- **禁止**：任何以识别为目的的 `POST`/`PATCH`/`PUT`；禁止对 `/console/api/images/{id}` 在识别过程中发出写请求。
- 用户之后点击「保存」：行为与现网完全一致（Server Action + redirect 回列表）。
