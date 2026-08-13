# Quickstart & Validation Guide: 图片编辑页本地 AI 识别填表

**Feature**: `011-image-ai-recognize`
**Date**: 2026-08-13

## 前提条件

- 已安装 pnpm；开发服务器：`pnpm dev` → `http://localhost:7600`
- 至少一张已上传的本人图片（编辑 URL：`/{lang}/console/images/{imageId}`）
- 单元 / 组件测试：`pnpm test`
- E2E：`pnpm exec playwright install chromium`（如未装过）

真机本机识别另需：桌面 Chrome 148+ 或同系 Edge，且设备满足 [Prompt API 硬件要求](https://developer.chrome.com/docs/ai/prompt-api)（本机模型可能需首次下载）。CI **不**依赖真模型。

契约见 [contracts/browser-prompt-api.md](./contracts/browser-prompt-api.md) 与 [contracts/image-ai-toolbar-ui.md](./contracts/image-ai-toolbar-ui.md)；状态机见 [data-model.md](./data-model.md)。

---

## 场景 1：工具栏位置与不支持降级（默认可测）

### 手动

1. 用 Safari / Firefox，或未开启内置 AI 的 Chromium，登录后打开一张图的编辑页。
2. **验证**：预览图下方、标题输入上方有工具栏；最左侧为 AI 图标按钮且禁用。
3. 鼠标悬停：**验证** 提示含 Chrome 或 Edge。
4. 点击禁用按钮：**验证** 无确认框，标题/描述不变。
5. 打开 `/en/console/images/new`：**验证** 无此工具栏。

### 自动

```bash
pnpm exec playwright test e2e/console-image-ai-recognize.spec.ts
pnpm test src/lib/browserAi.test.ts src/components/ImageAiMetaSection.test.tsx
```

**期望**：默认 Playwright Chromium（无 `LanguageModel`）用例看到禁用按钮；单测覆盖 `unsupported` 映射。

---

## 场景 2：确认取消不改表单

1. 在「支持」环境（真 Chrome 或 E2E 注入假 API）打开编辑页。
2. 记下当前标题、描述。
3. 点击「AI 识别」→ **验证** 确认文案含：本机识别、将覆盖标题与描述、不会自动保存；含语言下拉，默认等于当前 URL `[lang]`（如 `/zh/...` 则默认简体中文）。
4. 将下拉改为另一语言后点「取消」。
5. **验证**：框关闭；标题/描述未变；无保存请求；仍停在编辑页。再次打开确认，下拉回到 URL `[lang]`，不保留刚才的临时选择。

---

## 场景 3：成功只回填、不保存

1. 确认执行。
2. **验证**：按钮立即变为加载中且不可点。
3. 成功后：**验证** 标题、描述被新值覆盖；频道与发布状态不变；URL 仍是编辑页。
4. DevTools Network：**验证** 识别期间无对图片资源的写请求。
5. 刷新页面：**验证** 标题/描述回到服务器旧值（未保存）。
6. 再识别一次并手动点「保存」：**验证** 与现网一致，回列表后新文案已持久化。

E2E 用 `addInitScript` 提供假 `LanguageModel.availability/create/prompt`，`prompt` 返回 `{"title":"Mock title","description":"Mock desc"}`。

---

## 场景 4：超时 / 失败 / 重试

### 组件或单测（推荐）

- 假 `prompt` 永不 resolve → 约 30s（测试里注入更短时限或 fake timer）后进入失败，`title` 为超时文案；表单未改。
- 假 `create` 超时 → `model_not_ready`。
- `prompt` 返回 `{"title":"","description":"x"}` → `empty_title`，描述也不写。
- 失败后再点按钮 → **不再**出现确认，直接进入加载；假 `prompt` 收到的 `targetLang` 与失败前确认所选一致。
- 成功回到就绪后再点 → **再次**出现确认，下拉默认页面语言。

### 真机可选

大图或模型未下载完时，确认后应在 90s 内结束转圈，失败可悬停见原因。

---

## 场景 5：目标语言与页面语言可不同

1. 打开 `/zh/console/images/{id}`（支持环境）。
2. 点击「AI 识别」→ **验证** 下拉默认「简体中文」。
3. 改为 English 后确认执行。
4. **验证**：标题与描述为英语（或假 API 收到 `targetLang: "en"`）；地址栏仍是 `/zh/...`；页面其它文案仍为中文。
5. 若识别失败：再点按钮不弹框；假 API 再次收到 `targetLang: "en"`。

假 API 的 E2E 应断言 prompt / 调用参数使用确认框所选语言，而不是 URL `[lang]`。

---

## 回归（现有编辑流）

1. 不点 AI，只改标题后保存 → 仍成功回列表。
2. 删除区块、取消回列表 → 与现网一致。
3. 未登录访问编辑页 → 仍走原登录门禁。

```bash
pnpm exec playwright test e2e/console-images.spec.ts
```
