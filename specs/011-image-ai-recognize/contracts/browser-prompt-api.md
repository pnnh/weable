# Contract: 浏览器 Prompt API（客户端）

**Feature**: `011-image-ai-recognize`
**Date**: 2026-08-13

## 概述

本功能**不**暴露 HTTP 识别接口。客户端经全局 `LanguageModel`（[Prompt API](https://developer.chrome.com/docs/ai/prompt-api)）完成本机识别。实现封装在 `src/lib/browserAi.ts`。

---

## 特性检测

```ts
function isLanguageModelPresent(): boolean
async function checkImageRecognitionAvailability(): Promise<"unsupported" | "supported">
```

规则：

1. `typeof LanguageModel === "undefined"` 或无 `availability` / `create` → `unsupported`。
2. 否则调用：

```ts
await LanguageModel.availability({
  expectedInputs: [{ type: "text" }, { type: "image" }],
  expectedOutputs: [{ type: "text" }],
});
```

3. 返回值 `unavailable` 或调用抛错 → `unsupported`。
4. `downloadable` | `downloading` | `available` → `supported`。
5. **禁止**用 User-Agent 判断是否支持。
6. **禁止**在 `availability()` 里传 `languages: ["zh"]`（见 research.md R7）。

---

## 识别调用

```ts
async function recognizeImage(input: {
  image: HTMLImageElement;
  targetLang: "en" | "es" | "zh"; // 确认框所选，不是页面语言
  signal?: AbortSignal;
}): Promise<{ title: string; description: string }>
```

### create（就绪时限 60s）

```ts
const session = await LanguageModel.create({
  expectedInputs: [{ type: "text" }, { type: "image" }],
  expectedOutputs: [{ type: "text" }],
  signal: readySignal, // 60s abort
});
```

必须在用户确认按钮的点击栈中启动（user activation）。超时或失败 → 抛出带码 `model_not_ready` 的错误。

### prompt（识别时限 30s）

```ts
const raw = await session.prompt(
  [
    {
      role: "user",
      content: [
        { type: "text", value: /* 见下方提示词 */ },
        { type: "image", value: input.image },
      ],
    },
  ],
  {
    signal: promptSignal, // 30s abort
    responseConstraint: {
      type: "object",
      additionalProperties: false,
      required: ["title", "description"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
    },
  },
);
```

结束后 `session.destroy()`（成功、失败、超时时都要调用）。

### 提示词约束

- 要求只根据所附图片生成标题与描述。
- 输出语言由 `input.targetLang` 决定：`en` → English；`es` → Spanish；`zh` → Simplified Chinese。不得改用页面 URL 语言。
- 标题简短（约 80 字符以内）；描述一段，写主体、场景、显著细节。
- 不要 Markdown 围栏或多余键。

### 后处理

| 条件 | 结果 |
|------|------|
| JSON 解析失败 / 缺 `title` | 抛 `failed` |
| `title.trim()` 为空 | 抛 `empty_title` |
| `description` 缺失 | 视为 `""` |
| `title` 长度 > 80 | 截断（优先空白处）后返回 |

调用方不得在抛错后写表单。

---

## 图片输入

- 来源：页面 `#image-preview`（`src` 为同源 `/{lang}/console/api/images/{id}/file`）。
- 识别前：`image.complete` 为假或需等待时调用 `image.decode()`。
- `decode()` 失败或元素缺失 → `image_unreadable`。
- 不得为识别再 `fetch` 图片，不得把图 POST 到任何自有或第三方 URL。

---

## 超时

| 阶段 | 时限 | 错误码 |
|------|------|--------|
| create / 模型下载就绪 | 60_000 ms | `model_not_ready` |
| prompt | 30_000 ms | `timeout` |

实现可用 `AbortController` + `setTimeout`；超时必须 abort，避免后台继续推理。

---

## 明确不在合同内

- 不新增 `src/app/**/api/**` 识别路由。
- 不调用 Cloudflare Workers AI / 其它云模型。
- 不使用已废弃的 `window.ai`。
- 不在 Web Worker 中调用（Prompt API 当前不可用）。
