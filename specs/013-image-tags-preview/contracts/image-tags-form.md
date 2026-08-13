# Contract: 图片编辑表单标签字段

**Feature**: `013-image-tags-preview`
**Date**: 2026-08-13

## 入口

仅当 `imageId !== "new"` 且记录 `mimeType !== "directory"` 时渲染。字段顺序：

1. 标题 `input[name=title]`（必填，不变）
2. **标签** `input[name=tags]`（非必填，新增）
3. 描述 `textarea[name=description]`（不变）

## 字段

```html
<input name="tags" type="text" value="{state.tags}" />
```

- 初始值 = 服务端 `existingImage.tags`（无列值 / 历史空 → `""`）。
- label = i18n `imageTags`。
- 不 `required`。空值可保存。

## 规范化

服务端保存与 AI 回填均调用 `normalizeTags`（见 [data-model.md](../data-model.md)）：

- 按 `,` 拆分 → trim → 丢空段 → 用 `", "` 拼接。
- 整串 > 500 字符则截断。
- 客户端在 AI 写入时也走同一函数，避免框里出现 ` a,,b `。

用户手改后点保存：以提交值为准再规范化一次（防只改客户端、跳过服务端）。

## 保存（Server Action）

现有 `handleSave` 增补：

```ts
const tags = normalizeTags((formData.get("tags") as string | null) ?? "");
await db.update(images).set({ title, description, tags, channelId, isPublished, updatedAt: now })
```

- 标题仍必填；标签为空不得阻止保存。
- 成功仍 `redirect` 回列表（与现网一致）。
- **本期不**把 `tags` 加进 `PATCH /console/api/images/[imageId]`。

## 明确不在合同内

- 列表 / 公开详情 / 频道页展示或筛选标签。
- 标签自动补全、词库、点击缩略图编辑标签。
- 上传队列或新建目录写入标签。
