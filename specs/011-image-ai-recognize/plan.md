# Implementation Plan: 图片编辑页本地 AI 识别填表

**Branch**: `011-image-ai-recognize` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-image-ai-recognize/spec.md`

## Summary

在已有图片的控制台编辑页（`/[lang]/console/images/[id]`，非 `new`、非目录）于预览图与表单之间增加工具栏，最左侧为「AI 识别」。点击后先弹出与现网批量操作同类的确认框，**内含目标语言下拉**（`en` / `es` / `zh`，展示名与站点语言切换器相同，默认当前 URL `[lang]`）。确认后用浏览器 Prompt API（`LanguageModel`）对本页预览图做本机多模态识别，按所选目标语言生成结构化的 `title` / `description` 并写回表单受控字段（覆盖原值，**不提交、不改其它字段、不改站点 URL/界面语言**）。进入页时做能力检测：无 API 或 `availability() === "unavailable"` 则按钮禁用并提示改用 Chrome / Edge。进行中显示加载且不可点；失败 / 超时进入失败态，悬停展示原因，点击即重试（不再确认，沿用上次确认的目标语言）。成功回到就绪后再点会重新弹出确认。就绪等待 60s、识别 30s，均可 `AbortSignal` 取消。

实现切口：新增 `src/lib/browserAi.ts`（检测 + 识别 + 解析）与客户端 `ImageAiMetaSection`（工具栏 + 确认 + 标题/描述受控字段）；编辑页仅把这两个字段换成该组件；三份 locale 追加文案。无新依赖、无新服务端接口、无表结构变更。

## Technical Context

**Language/Version**: TypeScript 5.x（Next.js App Router）

**Primary Dependencies**:
- Next.js 16（App Router；编辑页仍为 Server Component + Server Action）
- React 19（`ImageAiMetaSection` 为 `"use client"`）
- `react-icons@^5.6.0`（已安装；`TbPhotoAi` / `TbLoader2` / `TbAlertCircle`）
- 浏览器 Prompt API：全局 `LanguageModel`（Chrome 148+ / 同系 Edge；本地最小类型声明，不加 `@types/dom-chromium-ai`）
- Tailwind CSS（与现有组件同一套 class）

**Storage**: N/A（不读写 D1 / R2 / Session Storage；识别结果只活在当前表单 state）

**Testing**: Vitest + Testing Library（`browserAi` 单元 + `ImageAiMetaSection` 组件，含目标语言下拉与失败重试沿用语言）；Playwright E2E（无 API 时禁用；注入假 `LanguageModel` 后走确认、改语言回填、失败免确认重试）

**Target Platform**: 桌面 Chrome / Edge（具备本机模型与硬件要求时）；其它浏览器降级为禁用按钮。部署目标仍为 Cloudflare Workers（open-next），本功能纯客户端，不增加 Worker CPU。

**Project Type**: Web application（Next.js 全栈；本 feature 仅客户端 + 编辑页编排）

**Performance Goals**: 确认执行后至多 60s 就绪 + 30s 识别（合计 ≤ 90s）必须结束；加载中禁止并行第二次识别。

**Constraints**:
- 图片不得用于第三方 / 自建云端识别；不得新增识别 API
- 不自动保存；保存仍走现有 Server Action
- 标题约 80 字符；空标题视为整次失败
- 回填语言 = 确认框所选目标语言（`en` / `es` / `zh`），默认 URL `[lang]`；失败重试沿用上次确认语言；`availability()` 不传 `languages: ["zh"]`（见 research.md R7）
- 站点界面语言始终跟 URL `[lang]`，不随目标语言下拉变化
- 不新增 npm 依赖
- `create()` 必须发生在用户确认点击（user activation）之后

**Scale/Scope**: 单页、单图、单按钮；仅编辑页一处入口

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 检查结果 | 说明 |
|------|---------|------|
| I. 语言规范 | ✅ | 本计划及 Phase 0/1 产物均为简体中文；API / 文件名保留英文 |
| II. 上下文优先 | ✅ | 已读根 README、编辑页、locale、`react-icons` 用量、现有 Dialog 与测试；宪法所列 8 种语言与代码不一致，以 `src/lib/language.ts` 为准（仅 `en`/`es`/`zh`） |
| III. 精准手术式修改 | ✅ | 只改编辑页标题/描述区域 + 三份 locale；频道/发布/保存/删除/文件路由不动 |
| IV. 简洁优先 | ✅ | 无新依赖、无新路由、无通用 Dialog 抽象；确认框内联；`LanguageModel` 本地声明类型 |
| V. 质量门控 | ✅ | research / data-model / contracts / quickstart 可验证；单测不依赖真模型 |

**Post-Phase 1 Re-check**: 2026-08-13 澄清后（确认框目标语言下拉 + 失败重试沿用上次语言）再核：仍无表迁移、无新服务、无跨页持久化。下拉选项复用 `supportedLanguages`，不新增语言包。原则仍满足。

## Complexity Tracking

无宪法违规。新增文件预计：`browserAi.ts` + 单测、`ImageAiMetaSection.tsx` + 组件测、1 个 E2E；编辑页与 3 个 locale 为追加式修改。

## Project Structure

### Documentation (this feature)

```text
specs/011-image-ai-recognize/
├── plan.md              # 本文件
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── browser-prompt-api.md
│   └── image-ai-toolbar-ui.md
└── tasks.md             # Phase 2（/speckit-tasks，本命令不生成）
```

### Source Code (repository root)

```text
src/
├── app/[lang]/console/images/[imageId]/
│   └── page.tsx                 # 现有：预览 img 加 id；标题/描述换成 ImageAiMetaSection
├── components/
│   ├── ImageAiMetaSection.tsx   # 新增：工具栏 + 确认 + 受控标题/描述
│   └── ImageAiMetaSection.test.tsx
├── lib/
│   ├── browserAi.ts             # 新增：availability / recognize / parse / timeout
│   └── browserAi.test.ts
├── locales/
│   ├── en.json                  # 追加 AI 识别文案
│   ├── es.json
│   └── zh.json
e2e/
└── console-image-ai-recognize.spec.ts
```

**Structure Decision**: 维持现有单仓 Next.js 布局。识别逻辑放 `src/lib` 以便无 UI 单测；UI 与表单字段放一个客户端组件，避免把整页改成 client。不新增 `src/app/.../api` 路由。
