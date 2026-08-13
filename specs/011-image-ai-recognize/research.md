# Research: 图片编辑页本地 AI 识别填表

**Feature**: `011-image-ai-recognize`
**Date**: 2026-08-13

## R1：识别引擎——浏览器 Prompt API vs 服务端模型 vs 第三方云

**Decision**: 仅使用浏览器内置 Prompt API（全局对象 `LanguageModel`）。不新增服务端识别接口，不把图片发到第三方云。

**Rationale**:
- 规格 FR-008 明确要求本机完成、禁止云端识别。
- Chrome 文档（2026-05 更新）：Web 端 Prompt API 自 Chrome 148 起可用，支持 `image` 输入与 `text` 输出；Edge 同系实现。
- 硬件不满足或浏览器无此对象时 `availability()` 返回 `unavailable`，正好对应「禁用 + 引导换浏览器」。

**Alternatives considered**:
- 服务端调用云模型：违背「图片不离开设备用于识别」，且增加密钥与费用。
- Writer / Summarizer API：只处理文本，不能看图。
- 旧实验对象 `window.ai`：已废弃，不得使用。

---

## R2：能力检测——检测 API 能力 vs User-Agent 白名单

**Decision**: 只检测 `LanguageModel` 是否存在，并以**与正式调用相同的选项**调用 `LanguageModel.availability()`。`unavailable` 或抛错视为不支持。不根据 UA 判断 Chrome / Edge。

检测选项固定为：

```ts
{
  expectedInputs: [{ type: "text" }, { type: "image" }],
  expectedOutputs: [{ type: "text" }],
}
```

映射：

| `availability()` | 按钮 |
|------------------|------|
| 无 `LanguageModel` / 抛错 / `unavailable` | 禁用 |
| `downloadable` / `downloading` / `available` | 可点（下载发生在用户确认之后） |

禁用提示仍写「请改用 Chrome 或 Edge」，并补充「设备需满足浏览器本地模型要求」，避免用户已在 Chrome 但硬件不够时完全误导。

**Rationale**:
- Chrome 文档要求 `availability()` 与 `create()` / `prompt()` 使用相同选项，否则多模态可能误判。
- 规格假设：日后其它浏览器实现同等能力即可用，不能写死 UA。

**Alternatives considered**:
- UA 白名单：会误伤已实现 API 的其它浏览器，也会放过「名义上是 Chrome 但 API 关闭」的情况。
- 把 `languages: ["zh"]` 放进 `expectedOutputs`：官方目前只列出 `en` / `ja` / `es` / `de` / `fr`，`zh` 可能导致误报不支持（见 R7）。

---

## R3：把预览图交给模型——`HTMLImageElement` vs 再 fetch Blob

**Decision**: 预览 `<img>` 加稳定 `id`（如 `image-preview`）。识别前 `decode()`；已完成则直接把该 `HTMLImageElement` 作为 Prompt 的 `image` 值。同页、同源（`/[lang]/console/api/images/{id}/file`），不另发识别请求。

读不到或未解码成功 → 失败码 `image_unreadable`，不改表单。

**Rationale**:
- Prompt API 视觉输入明确支持 `HTMLImageElement`。
- 控制台文件路由已做登录与所有权校验；预览能显示则元素可用，无需再走一遍网络。
- 少一次 fetch，大图更不容易顶满 30 秒识别时限。

**Alternatives considered**:
- `fetch(img.src)` 转 Blob：多一次下载，大图更容易超时。
- 画到 Canvas 再取 ImageData：多余，且可能受跨源污染（本页虽同源，仍多一步）。

---

## R4：模型输出格式——JSON Schema 约束 vs 自由文本再解析

**Decision**: `prompt()` 使用 `responseConstraint`（JSON Schema），要求对象 `{ title, description }`。解析后再校验：`title` trim 后为空则整次失败，不部分写入。`title` 超过 80 个字符则按字符截断（尽量在空白处断开）。

**Rationale**:
- Chrome 已支持 Prompt API 的 structured output，比正则抠文本稳。
- 标题必填是现网表单约束，空标题不能提交。

**Alternatives considered**:
- 纯自然语言再手写解析：模型偶尔加前后缀，失败率高。
- 两次 prompt（先标题后描述）：多一轮推理，更容易超时。

---

## R5：表单回填——受控客户端字段 vs 改 DOM

**Decision**: 从编辑页抽出标题、描述和工具栏到新的客户端组件 `ImageAiMetaSection`。标题 / 描述用 React state 受控，`name` 仍为 `title` / `description`，外层继续是现有 Server Action 表单。识别成功只 `setState`，不 `requestSubmit`。

**Rationale**:
- 现页是 Server Component + `defaultValue`，客户端无法在不抽组件的情况下可靠覆盖并保持 React 一致。
- 抽这两个字段是最小切口：频道、发布、保存、删除不动。
- 受控字段方便单测断言覆盖值。

**Alternatives considered**:
- 整表改成客户端：改动面超过需求。
- `input.value = ...` 改非受控 DOM：提交能带上值，但测试与后续编辑更脆。

---

## R6：图标——已安装的 `react-icons`

**Decision**: 不新增依赖。工具栏三个状态图标都从 `react-icons/tb`（Tabler）选取：

| 状态 | 图标 | 含义 |
|------|------|------|
| 就绪 / 不支持 | `TbPhotoAi` | 图片 + AI |
| 进行中 | `TbLoader2`（加旋转 class） | 加载 |
| 失败 | `TbAlertCircle` | 可重试的错误 |

`aria-label` / `title` 走 i18n，不把含义只放在图标上。

**Rationale**:
- `package.json` 已有 `react-icons@^5.6.0`；现网仅 `SiteHeader` 用了 `react-icons/bi`。
- `TbPhotoAi` 比通用星星更贴近「识别图片」。

**Alternatives considered**:
- `MdOutlineAutoAwesome` / `HiSparkles`：更像「魔法」，语义偏泛。
- 新图标包：违反「不新增依赖」。

---

## R7：回填语言 vs Prompt API 官方语言列表

**Decision**: `create()` / `availability()` **不**把目标语言写进 `expectedOutputs.languages`（避免选 `zh` 被判不支持）。`recognizeImage` 接收 `targetLang`（确认框所选，非页面语言）。提示词按 `targetLang` 要求输出：`en` → English，`es` → Español，`zh` → 简体中文。

**Rationale**:
- 澄清后 FR-010：回填语言是确认框目标语言，可与 URL `[lang]` 不同。
- 项目实际语言只有 `en` / `es` / `zh`（见 R11）。官方 `expectedOutputs` 语言列表含 `en`/`es` 但不含 `zh`。
- 能力检测与选了哪种回填语言无关，避免中文目标语言导致按钮被误禁用。

**Alternatives considered**:
- 始终按页面语言输出：已被澄清否决。
- `availability({ expectedOutputs: { languages: [targetLang] } })`：选中文时可能误报不支持。

---

## R8：超时与中止

**Decision**: 两段独立超时，均可 `AbortSignal`：

| 阶段 | 时限 | 失败码 |
|------|------|--------|
| `LanguageModel.create()`（含首次下载 / 就绪） | 60s | `model_not_ready` |
| `session.prompt()` | 30s | `timeout` |

用户确认点击算用户激活，满足 `create()` 对 user activation 的要求。超时或离开页面时 `abort()`，并在 `finally` 里 `session.destroy()`。

**Rationale**:
- 与规格 FR-012 / SC-004（合计 ≤ 90s）一致。
- Prompt API 的 `create` / `prompt` 都接受 `signal`。

**Alternatives considered**:
- 单段 90s：分不清「模型没下来」和「推理太慢」，失败提示发虚。
- 无 abort：超时后模型仍在跑，浪费本机资源。

---

## R9：会话生命周期

**Decision**: 每次识别 `create` → 一次 `prompt` → `destroy`。不缓存 session，不 `clone`。

**Rationale**:
- 每张图一次、无多轮对话。
- 规格要求离开页面不在后台改库；销毁会话可停掉进行中的推理。

**Alternatives considered**:
- 页面级单例 session：跨图串上下文，还要处理销毁时机，过度设计。

---

## R10：测试策略

**Decision**:
- 单元：`src/lib/browserAi.ts`（可用性映射、JSON 解析、空标题、截断、超时包装）。用注入的 `LanguageModel` 假对象，不碰真模型。
- 组件：`ImageAiMetaSection`（禁用、确认取消、下拉默认 URL `[lang]`、改语言后回填、失败 tooltip、失败重试不弹框且沿用上次语言、成功后再点再确认）。
- E2E：编辑页出现工具栏；默认 Playwright Chromium 无 `LanguageModel` 时应禁用；`addInitScript` 注入假 API 后走确认 → 回填，且 Network 无保存请求。

**Rationale**:
- CI 不能依赖本机 Gemini Nano 与 22GB 磁盘。
- 与现有 Vitest + Testing Library + Playwright 一致。

**Alternatives considered**:
- 只做 E2E 真模型：不稳定、多数 runner 不支持。
- 引入 `@types/dom-chromium-ai`：仅为类型加依赖，本地最小类型声明即可。

---

## R11：i18n 文件范围（文档与代码不一致）

**Decision**: 只改现有 `src/locales/en.json`、`es.json`、`zh.json`。

**Rationale**:
- 宪法技术规范仍列出 `zh-TW` / `ja` / `de-DE` / `fr` / `pt-PT`，但 `src/lib/language.ts` 与 `src/lib/i18n.ts` 只有 `en` / `es` / `zh`。源代码为准，本期不补语言包。

**Alternatives considered**:
- 按宪法补全 8 种语言：超出本功能范围。

---

## R12：确认框——复用现有 Dialog 组件 vs 内联

**Decision**: 确认 UI 内联在 `ImageAiMetaSection`，标记与 `BatchDeleteDialog` 相同（遮罩 + 白卡片 + 取消/执行）。不抽通用 Dialog，也不用 `window.confirm`。

**Rationale**:
- 现有 Dialog 都绑了各自的 fetch，抽公共层不是本需求。
- 内联一份确认即可满足国际化与样式一致。

**Alternatives considered**:
- 新 `ConfirmDialog` 通用组件：抽象无第二调用方，YAGNI。
- `window.confirm`：无法 i18n 样式，规格已排除。

---

## R13：目标语言下拉与失败重试

**Decision**:
- 确认框内 `<select>`，选项来自 `supportedLanguages`（English / Español / 简体中文，值 `en` / `es` / `zh`）。
- 每次打开确认：下拉重置为当前 URL `[lang]`（由编辑页传入的 `pageLang`），不恢复框内未确认的改动。
- 点「执行」后把所选值写入内存 `lastConfirmedLang`，交给 `recognizeImage({ targetLang })`。
- 失败重试：不打开确认，直接用 `lastConfirmedLang`。
- 成功回到 `ready`：丢弃「免确认」路径，再点重新打开确认（默认再次为 URL `[lang]`）。`lastConfirmedLang` 可清或留着但不得用于跳过确认。
- 不写入 Session Storage / localStorage。刷新、换图、卸载即丢。
- 站点 UI 文案仍用 `pageLang`；下拉只影响模型输出语言。

**Rationale**:
- 对齐澄清 Session 2026-08-13 两条结论。
- 选项与 `src/lib/language.ts` 同源，避免手写三套不一致的名称。

**Alternatives considered**:
- 失败重试再弹确认：用户已否决（选项 A）。
- 记住上次下拉值到 Session Storage：规格要求刷新后丢弃。
