# Tasks: 图片编辑页本地 AI 识别填表

**Input**: Design documents from `specs/011-image-ai-recognize/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**测试策略**: `browserAi` 纯函数与 `ImageAiMetaSection` 用 Vitest + Testing Library（注入假 `LanguageModel`，不碰真模型）。E2E 用 Playwright：默认 Chromium 验证禁用；`addInitScript` 注入假 API 后验证确认框、目标语言与回填。计划与 quickstart 已要求这些测试。

**格式说明**:
- `[P]`：可并行（不同文件，且不依赖未完成任务）
- `[USn]`：所属用户故事

---

## Phase 1: 基础准备（i18n）

**目的**：补齐三份 locale，后续组件只通过 `t()` / labels 读文案。

- [X] T001 在 `src/locales/en.json` 追加 key：`aiRecognize`、`aiRecognizeConfirmTitle`、`aiRecognizeConfirmBody`、`aiRecognizeConfirm`、`aiRecognizeTargetLang`、`aiRecognizeUnsupported`、`aiRecognizeRunning`、`aiRecognizeTimeout`、`aiRecognizeModelNotReady`、`aiRecognizeImageUnreadable`、`aiRecognizeEmptyTitle`、`aiRecognizeFailed`（英文；确认正文须含本机识别、将覆盖标题与描述、不会自动保存）
- [X] T002 [P] 在 `src/locales/zh.json` 追加与 T001 相同的 12 个 key（简体中文）
- [X] T003 [P] 在 `src/locales/es.json` 追加与 T001 相同的 12 个 key（西班牙语）

**检查点**：`pnpm exec tsc --noEmit` 零报错（`t()` 的 key 类型来自 `en.json`）。

---

## Phase 2: 基础先决条件（阻塞所有用户故事）

**目的**：抽出可单测的识别工具，并把编辑页标题/描述换成客户端受控字段 + 空工具栏。此后各故事只改 `browserAi.ts` / `ImageAiMetaSection.tsx`。

**⚠️ 关键**：Phase 3 起依赖本阶段完成。

- [X] T004 新建 `src/lib/browserAi.ts`：导出 `TargetLang`（`"en"|"es"|"zh"`）、`RecognizeErrorCode`、带 `code` 的错误类型；本地声明最小 `LanguageModel` 形状（`availability` / `create` / `prompt` / `destroy`），不加 `@types/dom-chromium-ai`；实现并导出 `parseRecognitionResult(raw: string)`、`truncateTitle(title: string)`（>80 字符优先在空白处截断）、`withTimeout<T>(p, ms, code)`（`AbortSignal` + `model_not_ready`/`timeout`）
- [X] T005 新建 `src/components/ImageAiMetaSection.tsx`（`"use client"`）：props `{ pageLang: LangKey, imageElementId: string, initialTitle: string, initialDescription: string, labels }`（labels 覆盖 T001 全部 key + 复用 `cancel`）；受控 `title`/`description` 渲染现有样式的 `<input name="title" required>` 与 `<textarea name="description" rows={8}>`；预览与字段之间一条工具栏，最左侧 `<button type="button">` 使用 `TbPhotoAi`（`react-icons/tb`），`aria-label={labels.aiRecognize}`；本任务不弹确认、不调用模型
- [X] T006 修改 `src/app/[lang]/console/images/[imageId]/page.tsx`：预览 `<img>` 加 `id="image-preview"`；仅在非 `new`、非目录分支用 `ImageAiMetaSection` 替换原标题/描述块，传入 `pageLang={l}`、`imageElementId="image-preview"`、`initialTitle`/`initialDescription`、`t(l, …)` labels；频道/发布/保存/取消/删除保持原样，外层仍是现有 `handleSave` 表单

**检查点**：打开已有图片编辑页，预览与标题之间有 AI 图标按钮；手动改标题后点保存仍回列表。`/console/images/new` 无此工具栏。`pnpm exec tsc --noEmit` 零报错。

---

## Phase 3: 用户故事 1 — 工具栏与带语言下拉的确认框（Priority: P1）🎯 MVP 入口

**目标**：支持环境下点击「AI 识别」弹出确认（本机识别说明 + 目标语言下拉，默认 URL `[lang]`）；取消不改表单、不保留临时语言选择。

**独立测试标准**：打开编辑页 → 点 AI 图标 → 确认出现且下拉默认等于 URL 语言 → 改下拉后取消 → 表单不变；再次打开下拉回到页面语言。

### 实现

- [X] T007 [US1] 在 `src/components/ImageAiMetaSection.tsx` 实现确认框（视觉对齐 `src/components/BatchDeleteDialog.tsx`：`fixed inset-0 z-50` 遮罩 + 白卡片）：`dialogOpen` / `draftLang`；打开时 `draftLang = pageLang`；`<select aria-label={labels.aiRecognizeTargetLang}>` 选项来自 `src/lib/language.ts` 的 `supportedLanguages`；取消关闭并丢弃 `draftLang`；执行写入 `lastConfirmedLang` 并关闭（本故事可不调用模型）；禁止 `window.confirm`
- [X] T008 [US1] 就绪态点击打开确认、进行中/禁用不打开；同一时刻只一层确认。改动文件：`src/components/ImageAiMetaSection.tsx`

**检查点**：支持环境下点按钮出确认；下拉为 English / Español / 简体中文；`/zh/...` 默认简体中文；取消后标题/描述不变。

---

## Phase 4: 用户故事 2 — 按目标语言回填且不保存（Priority: P1）

**目标**：确认执行后用本页 `#image-preview` 做本机识别，按确认框所选 `targetLang` 覆盖标题与描述；不提交、不改频道/发布、不改 URL。

**独立测试标准**：`/zh/...` 下拉改 English 后确认 → 假 API 收到 `targetLang:"en"` → 两字段被覆盖 → Network 无写请求 → 刷新后仍是服务器旧值。

### 实现

- [X] T009 [US2] 在 `src/lib/browserAi.ts` 实现 `recognizeImage({ image, targetLang, signal })`：`LanguageModel.create`（选项与 contracts 一致，60s `withTimeout`，错误码 `model_not_ready`）→ `prompt` 带图 + `responseConstraint` `{title,description}`（30s，错误码 `timeout`）→ `parseRecognitionResult` → `finally session.destroy()`；提示词按 `targetLang` 要求 English / Spanish / Simplified Chinese；`availability`/`create` 不传 `languages:["zh"]`；图缺失或 `decode()` 失败抛 `image_unreadable`
- [X] T010 [US2] 在 `src/components/ImageAiMetaSection.tsx` 把确认「执行」接到 `recognizeImage`：取 `#image-preview`（`imageElementId`），`targetLang = draftLang`；成功则同时 `setTitle`/`setDescription`（空标题整次失败、不部分写入）；不得 `requestSubmit` / 改 URL
- [X] T011 [P] [US2] 新建 `src/lib/browserAi.test.ts`：覆盖 JSON 解析成功、缺 title、空 title、description 缺省为 `""`、标题 >80 截断、`withTimeout` 超时抛对应码
- [X] T012 [US2] 新建 `src/components/ImageAiMetaSection.test.tsx`：注入假 `LanguageModel`，确认后断言 title/description 被 mock 结果覆盖，且未触发 submit

**检查点**：`pnpm test src/lib/browserAi.test.ts src/components/ImageAiMetaSection.test.tsx` 通过。手动确认执行后字段更新、保存仍走原 Server Action。

---

## Phase 5: 用户故事 3 — 不支持时禁用（Priority: P1）

**目标**：挂载时检测能力；不支持则按钮禁用，悬停提示改用 Chrome / Edge（可附带设备需满足本机模型要求）；点击无确认、无识别。

**独立测试标准**：无 `LanguageModel` 的浏览器打开编辑页 → 按钮禁用 → 悬停见 Chrome/Edge 说明 → 点击无确认。

### 实现

- [X] T013 [US3] 在 `src/lib/browserAi.ts` 实现 `isLanguageModelPresent` 与 `checkImageRecognitionAvailability`（`availability({ expectedInputs:[{type:"text"},{type:"image"}], expectedOutputs:[{type:"text"}] })`；无对象 / 抛错 / `unavailable` → `unsupported`；`downloadable|downloading|available` → `supported`；禁止 UA 判断）
- [X] T014 [US3] 在 `src/components/ImageAiMetaSection.tsx` 挂载时检测：`unsupported` 时按钮 `disabled` 且 `title={labels.aiRecognizeUnsupported}`；点击被忽略
- [X] T015 [US3] 在 `src/lib/browserAi.test.ts` 追加可用性映射用例；在 `src/components/ImageAiMetaSection.test.tsx` 追加无 API 时禁用、悬停文案、点击不打开确认

**检查点**：Safari / 普通 Playwright Chromium 下按钮禁用。`pnpm test` 相关文件通过。

---

## Phase 6: 用户故事 4 — 加载、超时、失败与重试（Priority: P2）

**目标**：执行后加载中不可点；成功回就绪；失败/超时失败态可悬停见原因；失败点击立即重试且不弹确认，沿用 `lastConfirmedLang`；成功后再点重新弹出确认（下拉默认 `pageLang`）。

**独立测试标准**：假 `prompt` 超时 → 失败态 + 超时文案 + 表单未改 → 再点无确认且再次传入同一 `targetLang`；成功后再点出现确认。

### 实现

- [X] T016 [US4] 在 `src/components/ImageAiMetaSection.tsx` 补齐状态机：`running` 用 `TbLoader2` 旋转 + `disabled` + `aria-busy`；`failed` 用 `TbAlertCircle` + `title=lastError`；错误码映射 `labels.aiRecognizeTimeout` 等；卸载/`abort` 取消进行中的 `recognizeImage`；`failed` 点击跳过确认、用 `lastConfirmedLang`；回到 `ready` 后再点走 T007 确认路径
- [X] T017 [US4] 在 `src/components/ImageAiMetaSection.test.tsx` 追加：加载中忽略点击、超时/空标题失败不写表单、失败重试不打开确认且 `targetLang` 为上次确认值、成功后再点打开确认且下拉为 `pageLang`
- [X] T018 [US4] 新建 `e2e/console-image-ai-recognize.spec.ts`：登录后打开已有图编辑页；（1）默认无 API → 按钮禁用；（2）`addInitScript` 假 `LanguageModel` → 确认下拉默认 URL 语言、改 `en` 后回填、失败重试不弹框；（3）`/console/images/new` 无工具栏。识别期间不得对图片资源发写请求

**检查点**：`pnpm test src/components/ImageAiMetaSection.test.tsx` 与 `pnpm exec playwright test e2e/console-image-ai-recognize.spec.ts` 通过。

---

## Phase 7: 收尾与横切

**目的**：类型、回归、验证指南。

- [X] T019 运行 `pnpm exec tsc --noEmit` 与 `pnpm test src/lib/browserAi.test.ts src/components/ImageAiMetaSection.test.tsx`，修复本功能引入的类型/测试失败
- [X] T020 [P] 运行 `pnpm exec playwright test e2e/console-images.spec.ts e2e/console-image-ai-recognize.spec.ts`，确认编辑/列表既有流未回退
- [X] T021 按 `specs/011-image-ai-recognize/quickstart.md` 过一遍场景 1–5（含目标语言 ≠ 页面语言）；缺口补回对应测试或实现

---

## 依赖与执行顺序

### 阶段依赖

- **Phase 1**：无依赖，可立刻开始
- **Phase 2**：依赖 Phase 1（labels key 齐了才能安全 `t()`）
- **Phase 3–6**：依赖 Phase 2；故事建议按 P1→P2 顺序做（同一文件 `ImageAiMetaSection.tsx`，并行易冲突）
- **Phase 7**：依赖已实现的故事

### 用户故事依赖

| 故事 | 依赖 | 说明 |
|------|------|------|
| US1 | Phase 2 | 工具栏 + 确认框，可不调用模型 |
| US2 | US1 | 执行后真正识别并回填 |
| US3 | Phase 2 | 可与 US1 之后、US2 并行于逻辑上，但同改 `ImageAiMetaSection.tsx`，建议接在 US1 后 |
| US4 | US2 | 加载/失败/重试建立在识别调用之上 |

### 可并行

- T002 / T003（不同 locale 文件）
- T011 可在 T009 完成后与 T010/T012 并行
- T020 可与 T021 并行（T019 之后）

同一故事内 `ImageAiMetaSection.tsx` 的任务不要并行。

---

## 并行示例

```bash
# Phase 1
# T001 先写 en.json 定 key，然后：
# 并行 T002 zh.json 与 T003 es.json

# US2 测试（T009 完成后）
# Task: browserAi.test.ts（T011）
# Task: ImageAiMetaSection 回填接线（T010）
```

---

## 实施策略

### MVP（可演示入口）

1. Phase 1 + Phase 2 + Phase 3（US1）
2. 停下来验证：工具栏、确认、语言下拉、取消

### 可交付的 P1

3. Phase 4（US2）回填
4. Phase 5（US3）不支持禁用
5. 再验证 quickstart 场景 1–3、5

### 增量

6. Phase 6（US4）超时/失败/重试
7. Phase 7 收尾

---

## 备注

- 不新增 npm 依赖、不新增识别 API、不改 `images` 表。
- 下拉选项必须复用 `supportedLanguages`，不要手写三套语言名。
- 失败重试不弹框、沿用 `lastConfirmedLang`；成功后再点必须重新确认。
- 每完成一个检查点再进入下一阶段。
