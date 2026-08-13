# Data Model: 图片编辑页本地 AI 识别填表

**Feature**: `011-image-ai-recognize`
**Date**: 2026-08-13

## 现有数据库实体（无变更）

本 feature 不新增表、不改 `images` 列。识别结果在用户点「保存」之前**不写库**。

### images 表（本功能只经现有保存路径间接写入）

| 字段 | 类型 | 本功能关系 |
|------|------|------------|
| `title` | `text` not null | 识别成功后仅更新表单控件；保存时仍走现有 Server Action |
| `description` | `text` not null default `''` | 同上 |
| `channelId` / `isPublished` | — | 只读，识别不得改 |

---

## 客户端实体

### RecognizeStatus

按钮对外四种状态（规格关键实体）。

```ts
type RecognizeStatus = "unsupported" | "ready" | "running" | "failed";
```

| 状态 | 可点击 | 图标 | 悬停 |
|------|--------|------|------|
| `unsupported` | 否 | `TbPhotoAi`（禁用样式） | 换 Chrome / Edge |
| `ready` | 是 → 先弹确认 | `TbPhotoAi` | 操作名 |
| `running` | 否 | `TbLoader2` | 进行中 |
| `failed` | 是 → 直接重试 | `TbAlertCircle` | `lastError` 文案 |

```
页面加载
  ├─ 无能力 ──────────────► unsupported（终态，除非刷新后能力变化）
  └─ 有能力 ──────────────► ready
                               ├─ 取消确认 ──► ready
                               └─ 确认/重试 ─► running
                                                ├─ 成功 ─► ready（表单已覆盖）
                                                └─ 失败/超时 ─► failed
                                                                  └─ 点击 ─► running
```

不再使用单独的 `confirmedOnce` 布尔值。是否免确认只看当前是否为 `failed`；目标语言看 `lastConfirmedLang`（见下）。刷新或换图重置。不写入 Session Storage / localStorage。

### RecognizeErrorCode

| 码 | 触发 | 用户可见含义（走 i18n） |
|----|------|------------------------|
| `unsupported` | 检测失败（仅初始禁用，一般不进 failed） | 换 Chrome / Edge |
| `image_unreadable` | 预览图不存在或 `decode()` 失败 | 无法读取当前图片 |
| `model_not_ready` | `create()` 超过 60s 或就绪失败 | 本地能力未就绪 |
| `timeout` | `prompt()` 超过 30s | 识别超时 |
| `empty_title` | 解析后标题为空 | 未得到可用标题 |
| `failed` | 其它异常（含模型抛错、JSON 非法） | 识别失败 |

`lastError` 存**已翻译短句**（或先存码再在渲染时 `t()`）。组件测断言码或文案均可，实现选一种并保持一致。

### TargetLang

```ts
type TargetLang = "en" | "es" | "zh";
```

| 字段 | 规则 |
|------|------|
| 确认框草稿 `draftLang` | 打开确认时 = `pageLang`（URL `[lang]`）；取消则丢弃 |
| `lastConfirmedLang` | 点执行时 = 当时的 `draftLang`；仅 `failed` 重试读取 |
| 选项展示 | 与 `supportedLanguages` 相同：English / Español / 简体中文 |

识别结果的语言 = 本次实际传入 `recognizeImage` 的 `targetLang`（确认执行用 `draftLang`，失败重试用 `lastConfirmedLang`）。

### RecognitionResult

```ts
type RecognitionResult = {
  title: string;       // trim 后非空；展示前可截到 ≤ 80 字符
  description: string; // 允许 ''
};
```

**校验**:

1. 模型输出必须能解析为含 `title` 的对象。
2. `title.trim() === ''` → 整次失败，描述也不写。
3. `description` 缺省当 `''`。
4. `title` 长度 > 80：按字符截断；若截断点前有空白，优先在最后一个空白处断开并 trim。

### ImageAiMetaSection 内存状态

```ts
type ImageAiMetaState = {
  status: RecognizeStatus;
  lastError: string | null;
  lastConfirmedLang: TargetLang | null; // 点执行后写入；失败重试用；刷新丢弃
  dialogOpen: boolean;
  draftLang: TargetLang; // 仅确认打开时有意义，打开时重置为 pageLang
  title: string;         // 受控，初始 = 服务端 existingImage.title
  description: string;   // 受控，初始 = existingImage.description
};
```

不持久化。卸载即丢弃（含进行中的 abort）。站点 UI 文案用 props `pageLang`，与 `draftLang` / `lastConfirmedLang` 分离。

### Prompt 会话（瞬时）

```ts
type PromptSession = {
  // LanguageModel.create() 返回值，仅 running 期间持有
  destroy(): void;
};
```

一次识别一个会话；结束必须 `destroy()`。无跨识别缓存。

---

## 与表单的关系

```
Server page
  img#image-preview
  form[action=handleSave]
    ImageAiMetaSection
      toolbar + dialog
      input[name=title]        ← 受控 title
      textarea[name=description]
    select[name=channelId]     ← 不动
    checkbox[name=isPublished] ← 不动
    submit / cancel
```

识别成功 = 只改 `title` / `description` state。用户点现有「保存」才 `POST` Server Action。
