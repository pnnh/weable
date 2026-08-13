# Implementation Plan: 图片标签与全屏预览

**Branch**: `013-image-tags-preview` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-image-tags-preview/spec.md`

## Summary

在已有图片的控制台编辑页（`/[lang]/console/images/[id]`，非 `new`、非目录）做三件事，且不改列表 / 公开页 / 频道页：

1. **标签字段**：在 Title 与 Description 之间增加非必填「标签」输入框；英文逗号分隔；保存前规范化（去空白、丢空段）后写入 `images.tags`；再次打开回显。
2. **AI 识别扩展**：沿用 011 的本机 Prompt API、确认框、超时与失败重试；`responseConstraint` 增加 `tags`（字符串数组，最多 8 项）；成功后同时覆盖标题、描述与标签，不自动保存。确认正文改为说明会覆盖这三项。目标语言仍为确认框所选（012 后的 6 种站点语言）。
3. **放大预览**：工具栏最左侧新增按钮（`react-icons/tb` 已有图标），其右侧仍为「AI 识别」。点击后用 `yet-another-react-lightbox-lite` 全屏预览当前页同源图片，支持滚轮缩放、拖动、点关闭 / 点遮罩 / Escape 退出。预览不依赖识别能力，不中断识别。

实现切口：`images` 表加 `tags` 列 + 迁移；`src/lib/imageTags.ts` 做规范化；改 `browserAi.ts` 解析与 schema；`ImageAiMetaSection` 增加标签受控字段、预览按钮与 Lightbox；编辑页 Server Action 写入 `tags`；6 份 locale 追加 / 改确认正文。不新增识别或预览 HTTP 接口。

## Technical Context

**Language/Version**: TypeScript 5.x（Next.js App Router）

**Primary Dependencies**:
- Next.js 16（App Router；编辑页仍为 Server Component + Server Action）
- React 19（`ImageAiMetaSection` 为 `"use client"`）
- `react-icons@^5.6.0`（已安装；预览图标从 `react-icons/tb` 选取，如 `TbZoomIn`）
- **新增** `yet-another-react-lightbox-lite`（约 5 kB gzip，无运行时依赖；内置滚轮 / 捏合缩放、拖动、关闭按钮、点遮罩关闭、Escape）
- 浏览器 Prompt API：全局 `LanguageModel`（与 011 相同，不改检测路径）
- Tailwind CSS；Lightbox 自带 `styles.css` 在客户端组件中 import

**Storage**: Cloudflare D1 / 本地 better-sqlite3（Drizzle）。`images.tags`：`text not null default ''`。识别结果在用户点「保存」前不写库。

**Testing**: Vitest + Testing Library（`imageTags` 规范化、`browserAi` 解析含 tags、`ImageAiMetaSection` 字段顺序 / 回填 / 预览按钮与识别互不阻塞）；Playwright E2E（标签保存回显、确认文案含标签、无 API 时预览仍可用、注入假 `LanguageModel` 后回填三项）

**Target Platform**: 桌面浏览器；识别能力仍仅 Chrome / Edge 本机模型。部署目标仍为 Cloudflare Workers（open-next）。Lightbox 与标签保存为常规客户端 + Server Action，不增加 Worker CPU。

**Project Type**: Web application（Next.js 全栈）

**Performance Goals**:
- 识别时限仍为就绪 60s + 识别 30s（合计 ≤ 90s）
- 点击「放大预览」后应在当前页立即出现全屏层（使用已加载的预览图 `src`，不再为预览另下原图）

**Constraints**:
- 图片不得用于第三方 / 自建云端识别；预览不得把原图发到第三方托管
- 不自动保存；保存仍走现有 Server Action
- AI 标签 ≤ 8；人工填写不强制 8 个上限
- 标签规范化：按英文逗号拆分、trim、丢空段；不做大小写合并或去重
- 规范化后整串超过 500 字符则截断（尽量在最后一个逗号处断开），与标题 AI 截断同类
- 目标语言 = 确认框所选（`supportedLanguages` 全部 6 项），不改站点 URL / 界面语言
- 列表 / 公开 / 频道 / 新建页 / 目录不展示、不筛选标签
- 编辑页 `PATCH /console/api/images/[id]` 本期不扩 `tags`（表单走 Server Action，不扩大切口）

**Scale/Scope**: 单页、单图；工具栏两项；一列持久化；一份轻量 Lightbox 依赖

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 检查结果 | 说明 |
|------|---------|------|
| I. 语言规范 | ✅ | 本计划及 Phase 0/1 产物均为简体中文；API / 文件名 / 库名保留英文 |
| II. 上下文优先 | ✅ | 已读根 README、宪法、013 spec、011 plan/contracts、`schema.ts`、`ImageAiMetaSection`、`browserAi.ts`、locale、上传/目录 insert |
| III. 精准手术式修改 | ✅ | 只改编辑页表单 + 工具栏 + `images.tags` + 6 份 locale + 既有识别解析；列表/公开/频道/PATCH/上传队列不动 |
| IV. 简洁优先 | ✅ | 标签存一整列文本，不建标签表；规范化抽一个纯函数；预览用现成轻量库，不自研缩放拖动 |
| V. 质量门控 | ✅ | research / data-model / contracts / quickstart 可验证；单测不依赖真模型 |

**新增依赖评估（宪法技术规范）**：项目无现成全屏缩放预览能力。自研遮罩 + 滚轮缩放 + 拖动 + Escape 成本高于接入约 5 kB、无运行时依赖、与主库同作者的 `yet-another-react-lightbox-lite`。完整版 `yet-another-react-lightbox` + Zoom 插件更重，本期单图不需要画廊 / 视频插件。评估通过。

**Post-Phase 1 Re-check**: 设计后仍只加一列、一个纯函数、一个 Lightbox 依赖；识别仍本机完成；预览只用当前页已可访问的 `img.src`。原则仍满足。

## Complexity Tracking

无宪法违规。新增依赖已在上方评估。新增文件预计：`imageTags.ts` + 单测、Drizzle 迁移、Lightbox 仅在既有客户端组件内使用；编辑页与 6 个 locale 为追加 / 改文案。

## Project Structure

### Documentation (this feature)

```text
specs/013-image-tags-preview/
├── plan.md              # 本文件
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   ├── image-tags-form.md
│   ├── image-ai-tags.md
│   └── image-preview-ui.md
└── tasks.md             # Phase 2（/speckit-tasks，本命令不生成）
```

### Source Code (repository root)

```text
src/
├── db/
│   └── schema.ts                      # 改：images.tags
migrations/
└── 0003_*.sql                         # 新增：ALTER TABLE images ADD tags
src/
├── lib/
│   ├── imageTags.ts                   # 新增：normalizeTags / tagsFromRecognition
│   ├── imageTags.test.ts
│   ├── browserAi.ts                   # 改：prompt + schema + parse 含 tags
│   └── browserAi.test.ts              # 改：tags 解析用例
├── components/
│   ├── ImageAiMetaSection.tsx         # 改：标签字段、预览按钮、Lightbox
│   └── ImageAiMetaSection.test.tsx
├── app/[lang]/console/images/[imageId]/
│   └── page.tsx                       # 改：initialTags、handleSave 写 tags、传预览 src
├── locales/
│   ├── en.json / es.json / fr.json
│   ├── ja.json / zh.json / zh-TW.json # 追加 imageTags / imagePreview*；改确认正文
e2e/
└── console-image-tags-preview.spec.ts # 新增（或扩展既有 AI E2E）
```

**Structure Decision**: 维持现有单仓 Next.js 布局。标签规范化放 `src/lib` 以便 Server Action 与 AI 解析共用；UI 仍集中在 `ImageAiMetaSection`，避免把整页改成 client。不新增 API 路由。迁移用 Drizzle Kit 生成，与 `0002_gorgeous_storm` 同类。
