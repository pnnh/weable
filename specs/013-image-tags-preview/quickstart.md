# Quickstart & Validation Guide: 图片标签与全屏预览

**Feature**: `013-image-tags-preview`
**Date**: 2026-08-13

## 前提条件

- 已安装 pnpm；开发服务器：`pnpm dev` → `http://localhost:7600`
- 已跑迁移：`pnpm db:migrate`（本地 SQLite 出现 `images.tags`）
- 至少一张已上传的本人图片
- 单元 / 组件：`pnpm test`
- E2E：`pnpm exec playwright install chromium`（如未装过）

真机 AI 识别另需桌面 Chrome 148+ / 同系 Edge（与 011 相同）。CI **不**依赖真模型。

契约：[image-tags-form.md](./contracts/image-tags-form.md)、[image-ai-tags.md](./contracts/image-ai-tags.md)、[image-preview-ui.md](./contracts/image-preview-ui.md)。数据规则见 [data-model.md](./data-model.md)。

---

## 场景 1：标签字段保存与回显

### 手动

1. 登录后打开 `/zh/console/images/{id}`。
2. **验证**：标题与描述之间有「标签」框，非必填。
3. 输入 ` a, ,sunset, 旅行 `，填好标题后保存。
4. 再次进入同一编辑页。
5. **验证**：标签为 `a, sunset, 旅行`（无空段、无首尾空格）；标题 / 频道未意外改变。
6. 清空标签再保存，再进页：**验证** 标签为空且保存成功。

### 自动

```bash
pnpm test src/lib/imageTags.test.ts
pnpm exec playwright test e2e/console-image-tags-preview.spec.ts
```

---

## 场景 2：AI 回填标题、描述与标签

1. 支持环境（真 Chrome 或 E2E 注入假 `LanguageModel`）打开编辑页。
2. 先手填标签 `old`。
3. 点「AI 识别」→ **验证** 确认正文含：将覆盖标题、描述与标签；不会自动保存。
4. 确认执行。
5. **验证**：三项被新值覆盖；标签以逗号分隔且不超过 8 个；频道 / 发布不变；无自动保存。
6. 刷新：**验证** 仍为保存前的服务器值（含旧标签）。
7. 假 API 返回无 `tags` 但标题有效：**验证** 标签框被清空，不失败。
8. 假 API 返回空标题：**验证** 三项都不改。

```bash
pnpm test src/lib/browserAi.test.ts src/components/ImageAiMetaSection.test.tsx
```

假 `prompt` 示例：`{"title":"Mock title","description":"Mock desc","tags":["sky","ocean"]}`。

---

## 场景 3：放大预览

1. 打开编辑页（任意浏览器，含无 `LanguageModel` 的 Playwright Chromium）。
2. **验证**：工具栏最左侧为放大预览，其右为 AI 识别。无模型时 AI 禁用，预览仍可点。
3. 点击放大预览 → **验证** 全屏遮罩 + 当前图；表单被挡住。
4. 滚轮缩放、拖动（大图或放大后）。
5. 分别用关闭按钮、点遮罩、Escape 关掉。
6. **验证**：回到编辑页，标题 / 描述 / 标签未变，未保存。
7. 识别加载中再开预览（支持环境）：识别不中断；关掉预览后识别状态仍在。

---

## 场景 4：011 回归

1. 无模型：AI 禁用，悬停含 Chrome / Edge；点击无确认。
2. 有模型：取消确认不改三项。
3. 失败后再点：不弹确认，沿用上次语言。
4. 成功后再点：再弹确认。
5. 不点 AI、只改标题保存；删除 / 取消；未登录门禁 —— 与现网一致。

```bash
pnpm exec playwright test e2e/console-image-ai-recognize.spec.ts e2e/console-images.spec.ts
```

---

## 实现后命令清单

```bash
pnpm db:migrate
pnpm test
pnpm exec playwright test e2e/console-image-tags-preview.spec.ts e2e/console-image-ai-recognize.spec.ts
```
