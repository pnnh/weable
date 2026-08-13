# Contract: AI 识别回填标签（011 扩展）

**Feature**: `013-image-tags-preview`
**Date**: 2026-08-13

本文件只写相对 [011 browser-prompt-api](../../011-image-ai-recognize/contracts/browser-prompt-api.md) 与 [011 toolbar UI](../../011-image-ai-recognize/contracts/image-ai-toolbar-ui.md) 的增量。能力检测、超时、失败重试、目标语言下拉、不把图片送云端等规则全部继承。

## recognizeImage 返回值

```ts
async function recognizeImage(input: {
  image: HTMLImageElement;
  targetLang: TargetLang; // 已是 LangKey（012）
  signal?: AbortSignal;
}): Promise<{ title: string; description: string; tags: string }>
```

`TargetLang` 以代码 `src/lib/language.ts` 为准（6 种），不以 011 合同里过时的三语列表为准。

## responseConstraint

```ts
{
  type: "object",
  additionalProperties: false,
  required: ["title", "description"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
}
```

`tags` 非 required。

## 提示词增量

在 011 提示词上追加一句：用目标语言给出不超过 8 个短标签，放在 `tags` 数组；不要 #、不要编号。标题 / 描述原约束不变。

## 解析

| 条件 | 结果 |
|------|------|
| 缺 `title` 或非法 JSON | 抛 `failed`，不写三项 |
| `title.trim()` 为空 | 抛 `empty_title`，不写三项 |
| `tags` 缺失 / 类型不对 | `tags = ""` |
| `tags` 为字符串 | 按逗号规范化 |
| `tags` 为数组 | 每项 String + 规范化，最多 8 个 |
| 超过 8 个 | 按顺序截取前 8 |

## 确认框正文

i18n `aiRecognizeConfirmBody` **必须**同时提到：将覆盖标题、描述与标签；不会自动保存。其它确认行为（下拉、取消、失败免确认重试）不变。

## 表单回填

识别成功：

```ts
setTitle(result.title);
setDescription(result.description);
setTags(result.tags);
```

失败 / 超时：三项保持识别前 state。  
禁止 `requestSubmit`、禁止改 `channelId` / `isPublished`。

## 网络

与 011 相同：识别期间禁止对图片资源的写请求。保存仍只发生在用户点「保存」之后。
