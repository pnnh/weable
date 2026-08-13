# Data Model: 图片标签与全屏预览

**Feature**: `013-image-tags-preview`
**Date**: 2026-08-13

## 持久化

### images 表（变更）

| 字段 | 类型 | 本功能关系 |
|------|------|------------|
| `title` | `text` not null | 识别成功后只改表单；保存走现有 Server Action |
| `description` | `text` not null default `''` | 同上 |
| **`tags`** | **`text` not null default `''`（新增）** | 规范化后的逗号分隔字符串；空 = 无标签 |
| `channelId` / `isPublished` | — | 只读，识别与预览不得改 |

迁移：`ALTER TABLE images ADD tags text DEFAULT '' NOT NULL;`  
历史行与未传该列的 insert（上传、建目录）均为 `''`。

**校验（保存时，服务端再跑一遍 `normalizeTags`）**：

| 规则 | 行为 |
|------|------|
| 非必填 | 空串允许保存 |
| 拆分 | 仅英文逗号 |
| 空白 / 空段 | trim 后丢弃 |
| 整串 > 500 字符 | 截断（见 research R2） |
| 人工个数 | 不限 8 |
| AI 回填 | 最多 8 项后再拼接 |

不建索引。本期无按标签查询。

---

## 客户端实体

### ImageAiMetaState（扩展 011）

```ts
type ImageAiMetaState = {
  status: RecognizeStatus; // 仍为 unsupported | ready | running | failed
  lastError: string | null;
  lastConfirmedLang: TargetLang | null;
  dialogOpen: boolean;
  draftLang: TargetLang;
  title: string;
  description: string;
  tags: string;            // 新增：受控，初始 = existingImage.tags
  previewIndex: number | undefined; // 新增：undefined = 预览关闭；0 = 打开当前图
};
```

`RecognizeStatus` 状态机与 011 完全相同。`previewIndex` 独立：任意识别状态下都可开 / 关预览；开关预览不得改 `status` / 三项文案 / abort 识别。

### RecognitionResult（扩展 011）

```ts
type RecognitionResult = {
  title: string;       // trim 后非空；≤ 80 字符（原规则）
  description: string; // 允许 ''
  tags: string;        // 规范化后的逗号串；允许 ''；AI 最多 8 项
};
```

**校验**：

1. JSON 必须含可用 `title`（规则同 011）。空标题 → 整次失败，**三项都不写**。
2. `description` 缺省 → `''`。
3. `tags` 缺省 / 非法 → `''`；数组或逗号字符串均可；规范化后截到 8 项。
4. 标题有效且 tags 为空 → 成功，标签框覆盖为 `''`。

### 全屏预览会话

瞬时。不写 Session Storage。卸载或刷新即关。

```ts
type PreviewSession = {
  index: 0 | undefined;
  slideSrc: string; // #image-preview.src，同源文件路由
};
```

---

## 与表单的关系

```
Server page
  img#image-preview
  form[action=handleSave]
    ImageAiMetaSection
      toolbar: [放大预览] [AI 识别] + dialog + Lightbox
      input[name=title]
      input[name=tags]          ← 新增，位于 title 与 description 之间
      textarea[name=description]
    select[name=channelId]
    checkbox[name=isPublished]
    submit / cancel
```

识别成功 = 只改 `title` / `description` / `tags` state。  
用户点「保存」才 `POST` Server Action（含规范化后的 `tags`）。
