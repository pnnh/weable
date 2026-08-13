# Tasks: 图片标签与全屏预览

**Input**: Design documents from `specs/013-image-tags-preview/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**测试策略**: 计划与 [quickstart.md](./quickstart.md) 已要求自动化验证。`imageTags` / `browserAi` 用 Vitest；`ImageAiMetaSection` 用 Testing Library（注入假 `LanguageModel`）；E2E 用 Playwright。规格未要求 TDD，测试与实现同阶段写入，不单列「先写失败测试」。

**格式说明**:
- `[P]`：可并行（不同文件，且不依赖未完成任务）
- `[USn]`：所属用户故事

---

## Phase 1: 基础准备（依赖 + i18n）

**目的**：装上预览库；六份 locale 补齐新 key 并改写确认正文。后续组件只通过 `t()` / labels 读文案。

- [X] T001 用 `pnpm add yet-another-react-lightbox-lite` 写入 `package.json` / `pnpm-lock.yaml`（React 19 兼容的 lite 包；不要装完整版 `yet-another-react-lightbox`）
- [X] T002 在 `src/locales/en.json` 追加 `imageTags`、`imagePreview`、`imagePreviewClose`、`imagePreviewUnavailable`；将 `aiRecognizeConfirmBody` 改为明确写出：本机识别、成功后覆盖标题/描述/标签、不会自动保存
- [X] T003 [P] 在 `src/locales/zh.json` 追加与 T002 相同的 4 个新 key，并按同样语义改写 `aiRecognizeConfirmBody`（简体中文）
- [X] T004 [P] 在 `src/locales/es.json` 追加相同 4 个 key 并改写 `aiRecognizeConfirmBody`（西班牙语）
- [X] T005 [P] 在 `src/locales/fr.json` 追加相同 4 个 key 并改写 `aiRecognizeConfirmBody`（法语）
- [X] T006 [P] 在 `src/locales/ja.json` 追加相同 4 个 key 并改写 `aiRecognizeConfirmBody`（日语）
- [X] T007 [P] 在 `src/locales/zh-TW.json` 追加相同 4 个 key 并改写 `aiRecognizeConfirmBody`（繁体中文）

**检查点**：六份 locale 键集仍与 `en.json` 一致（`pnpm test src/lib/i18n.test.ts`）。`pnpm exec tsc --noEmit` 零报错。

---

## Phase 2: 基础先决条件（阻塞所有用户故事）

**目的**：`images.tags` 列 + 共享规范化函数就绪。此后 US1 只接线表单，US2 只扩展识别解析。

**⚠️ 关键**：Phase 3 起依赖本阶段完成。

- [X] T008 在 `src/db/schema.ts` 的 `images` 表增加 `tags: text("tags").notNull().default("")`（放在 `description` 之后）
- [X] T009 在 T008 后于仓库根运行 `pnpm exec drizzle-kit generate`，确认 `migrations/` 新增一条 `ALTER TABLE images ADD tags text DEFAULT '' NOT NULL`，并更新 `migrations/meta/_journal.json`；本地执行 `pnpm db:migrate`
- [X] T010 新建 `src/lib/imageTags.ts`：导出 `TAGS_MAX_CHARS = 500`、`AI_TAGS_MAX = 8`、`normalizeTags(raw: string): string`（按 `,` 拆、trim、丢空段、用 `", "` 拼接、超 500 尽量在最后一个 `", "` 处截断）、`tagsFromRecognition(raw: unknown): string`（数组或逗号字符串 → 规范化 → 最多前 8 项；缺省 / 非法 → `""`）

**检查点**：迁移后打开已有图片编辑页不报错（列默认 `''`）。上传 / 建目录 insert 不传 `tags` 仍成功。

---

## Phase 3: 用户故事 1 — 标题与描述之间填写并保存标签 (Priority: P1) 🎯 MVP

**目标**：编辑页 Title 与 Description 之间出现非必填标签框；保存后再次打开回显；空标签可保存。

**独立测试标准**：打开 `/[lang]/console/images/[id]` → 在标题与描述之间找到标签框 → 输入 ` a, ,sunset ` 并保存 → 再进页显示 `a, sunset`；清空再保存仍成功。`/console/images/new` 无此字段。

### 实现

- [X] T011 [P] [US1] 新建 `src/lib/imageTags.test.ts`：覆盖 ` a, ,b ` → `a, b`、仅逗号 → `""`、超过 8 项人工输入不被截到 8、整串 >500 在逗号处截断、`tagsFromRecognition` 数组截前 8 / 字符串 / 缺省为 `""`
- [X] T012 [US1] 修改 `src/components/ImageAiMetaSection.tsx`：props 增加 `initialTags: string` 与 `labels.imageTags`；受控 `tags` + `<input name="tags">` 插在 title 与 description 之间，样式与 title 输入框一致，不 `required`；本任务不改 AI 回填
- [X] T013 [US1] 修改 `src/app/[lang]/console/images/[imageId]/page.tsx`：向 `ImageAiMetaSection` 传 `initialTags={existingImage.tags}` 与 `imageTags: t(l, "imageTags")`；`handleSave` 读取 `formData.get("tags")`，经 `normalizeTags` 后与 `title`/`description` 一并 `update`；不改 `PATCH` 路由、不改上传/目录 insert
- [X] T014 [US1] 修改 `src/components/ImageAiMetaSection.test.tsx`：labels 补 `imageTags`；断言 DOM 顺序为 Title → Tags → Description；初始值来自 `initialTags`

**检查点**：手动保存含空段的标签后回显已规范化。`pnpm test src/lib/imageTags.test.ts src/components/ImageAiMetaSection.test.tsx` 通过。

---

## Phase 4: 用户故事 2 — AI 识别同时回填标题、描述与标签 (Priority: P1)

**目标**：确认执行后本机识别按目标语言覆盖三项；标签 ≤ 8；空标签不算失败；空标题整次失败不部分写入；不自动保存。确认正文已在 Phase 1 改完。

**独立测试标准**：假 API 返回 `{"title":"T","description":"D","tags":["a","b"]}` → 三字段覆盖；返回无 `tags` 但标题有效 → 标签框清空且成功；返回空标题 → 三项都不改；Network 无写请求。

### 实现

- [X] T015 [US2] 修改 `src/lib/browserAi.ts`：`parseRecognitionResult` 增加 `tags`（走 `tagsFromRecognition`）；`recognizeImage` 返回值含 `tags`；`responseConstraint.properties` 增加 `tags: { type: "array", items: { type: "string" } }`（不要放进 `required`）；`buildPromptText` 追加：用目标语言给出不超过 8 个短标签，放入 `tags` 数组，不要 `#` / 编号
- [X] T016 [US2] 修改 `src/components/ImageAiMetaSection.tsx`：识别成功时同时 `setTitle` / `setDescription` / `setTags(result.tags)`；失败 / 超时不改三项；仍不得 `requestSubmit`
- [X] T017 [P] [US2] 修改 `src/lib/browserAi.test.ts`：合法 JSON 含 tags 数组；缺 tags → `""`；tags 为 `"x, y"` 字符串也可解析；超过 8 项只留前 8；空 title 仍抛 `empty_title` 且测例不依赖写入
- [X] T018 [US2] 修改 `src/components/ImageAiMetaSection.test.tsx`：假 `prompt` 返回含 tags 的 JSON 后断言三字段覆盖；假返回无 tags 则标签变 `""`；空 title 失败时 `initialTags` 保持不变

**检查点**：`pnpm test src/lib/browserAi.test.ts src/components/ImageAiMetaSection.test.tsx` 通过。确认框正文可见「标签」。

---

## Phase 5: 用户故事 3 — 工具栏「放大预览」全屏查看当前图 (Priority: P1)

**目标**：工具栏最左侧为放大预览（`TbZoomIn`），其右为 AI 识别。点击后 `yet-another-react-lightbox-lite` 全屏展示当前同源图；滚轮缩放、拖动、关闭按钮 / 点遮罩 / Escape 退出；不改表单、不保存。

**独立测试标准**：打开编辑页 → 预览按钮在 AI 左侧 → 点击出现全屏层 → Escape 关闭后三项不变。无 `LanguageModel` 时预览仍可点。

### 实现

- [X] T019 [US3] 修改 `src/components/ImageAiMetaSection.tsx`：工具栏左侧增加 `<button type="button" aria-label={labels.imagePreview}>` + `TbZoomIn`；`previewIndex: number | undefined`；图可用（`#image-preview` 存在且 `naturalWidth > 0`）时 `setPreviewIndex(0)`，否则 `disabled` 且 `title={labels.imagePreviewUnavailable}`；引入 `Lightbox` 与 `yet-another-react-lightbox-lite/styles.css`；`slides={[{ src: 预览图.src, alt: title }]}`；`labels.Close = labels.imagePreviewClose`；`controller.closeOnBackdropClick` / `closeOnEscape` 为 true；单图、不用 `next/image`
- [X] T020 [US3] 修改 `src/components/ImageAiMetaSection.tsx` 的 labels 类型与 `src/app/[lang]/console/images/[imageId]/page.tsx`：传入 `imagePreview` / `imagePreviewClose` / `imagePreviewUnavailable`
- [X] T021 [US3] 修改 `src/components/ImageAiMetaSection.test.tsx`：labels 补预览三 key；断言「放大预览」按钮在「AI 识别」之前；有预览图时点击后文档中出现 Lightbox 门户（或 `dialog` / close 控件）；关闭后 title/tags/description 不变；无 `LanguageModel` 时预览按钮仍 enabled（图可用时）

**检查点**：手动点预览可缩放/拖动/三种关闭方式。`pnpm test src/components/ImageAiMetaSection.test.tsx` 通过。

---

## Phase 6: 用户故事 4 — 既有识别状态机与权限边界保持不变 (Priority: P2)

**目标**：011 的检测、确认、加载、超时、失败免确认重试、成功后再确认全部仍成立；预览与识别互不阻塞；登录/所有权/手动保存不变。

**独立测试标准**：无模型时 AI 禁用、预览可用；取消确认三项不变；失败再点无确认且沿用上次语言；识别 `running` 时开预览不 abort。

### 实现

- [X] T022 [US4] 核对并 vis `src/components/ImageAiMetaSection.tsx`：开/关预览不得改 `status`、不得 `abortRef.current.abort()`、不得重置三项；`running` / `failed` / `unsupported` 时预览仍可开关（图可用时）。若已满足则保持代码，仅补注释禁止在预览处理里 abort
- [X] T023 [US4] 修改 `src/components/ImageAiMetaSection.test.tsx`：失败重试仍不弹确认且 `targetLang` 为上次值；成功后再点再出确认；`running` 期间点预览后 `LanguageModel` 的 `prompt` 仍会 resolve 并回填（或至少 `destroy` 不被预览触发）；取消确认不改 tags
- [X] T024 [US4] 新建 `e2e/console-image-tags-preview.spec.ts`：登录后打开已有图；（1）标签框在 Title 与 Description 之间，填写并保存后再进页回显规范化结果；（2）确认正文含标签；（3）默认无 `LanguageModel` 时 AI 禁用、放大预览可打开且 Escape 关闭；（4）`addInitScript` 假 API 返回含 tags 的 JSON → 三项回填且识别期间无写请求；（5）`/console/images/new` 无标签框、无预览按钮

**检查点**：`pnpm test src/components/ImageAiMetaSection.test.tsx` 与 `pnpm exec playwright test e2e/console-image-tags-preview.spec.ts e2e/console-image-ai-recognize.spec.ts` 通过。

---

## Phase 7: 收尾与横切

**目的**：类型、回归、quickstart、知识图。

- [X] T025 运行 `pnpm exec tsc --noEmit` 与 `pnpm test src/lib/imageTags.test.ts src/lib/browserAi.test.ts src/components/ImageAiMetaSection.test.tsx src/lib/i18n.test.ts`，修复本功能引入的失败
- [X] T026 [P] 运行 `pnpm exec playwright test e2e/console-images.spec.ts e2e/console-image-ai-recognize.spec.ts e2e/console-image-tags-preview.spec.ts`，确认列表/编辑/011 识别未回退
- [X] T027 按 `specs/013-image-tags-preview/quickstart.md` 过场景 1–4；缺口补回对应测试或实现
- [X] T028 在仓库根目录运行 `graphify update .`，同步 `graphify-out/`

---

## 依赖与执行顺序

### 阶段依赖

- **Phase 1**：无依赖，可立刻开始（T002 先于 T003–T007）
- **Phase 2**：依赖 Phase 1 仅在类型上不阻塞；建议 T001 完成后即可做 T008–T010。US1 需要 T010
- **Phase 3（US1）**：依赖 Phase 2（列 + `normalizeTags` + `imageTags` 文案）
- **Phase 4（US2）**：依赖 US1（受控 `tags` 已在表单里）
- **Phase 5（US3）**：逻辑上只依赖 Phase 1 的预览文案 + T001；与 US1 同改 `ImageAiMetaSection.tsx`，建议接在 US1 之后、可与 US2 顺序串行
- **Phase 6（US4）**：依赖 US2 + US3（要同时有回填与预览）
- **Phase 7**：依赖已实现的故事

### 用户故事依赖

| 故事 | 依赖 | 说明 |
|------|------|------|
| US1 | Phase 2 | 标签字段 + 保存，可无 AI / 无预览 |
| US2 | US1 | 回填写入同一受控 `tags` |
| US3 | Phase 1 + 建议 US1 之后 | 预览不依赖 tags 列，但同文件勿并行 |
| US4 | US2 + US3 | 回归状态机与互不阻塞 |

### 可并行

- T003–T007（不同 locale，T002 完成后）
- T001 可与 T002–T007 并行
- T011 可在 T010 完成后与 T012 并行（不同文件）
- T017 可在 T015 完成后与 T016 并行
- T026 可与 T027 并行（T025 之后）

同一故事内对 `ImageAiMetaSection.tsx` 的任务不要并行。不要并行改 `page.tsx` 的 T013 与 T020。

---

## 并行示例

```bash
# Phase 1（T002 完成后）
# 并行：T003 zh.json / T004 es.json / T005 fr.json / T006 ja.json / T007 zh-TW.json
# 同时：T001 pnpm add

# US1（T010 完成后）
# Task: src/lib/imageTags.test.ts（T011）
# Task: ImageAiMetaSection 标签字段（T012）

# US2（T015 完成后）
# Task: browserAi.test.ts（T017）
# Task: 回填接线（T016）
```

---

## 实施策略

### MVP（可演示存标签）

1. Phase 1 + Phase 2 + Phase 3（US1）
2. 停下来验证：字段位置、规范化保存、空标签、new 页无字段

### 可交付的 P1

3. Phase 4（US2）AI 回填标签
4. Phase 5（US3）放大预览
5. 再验证 quickstart 场景 1–3

### 增量

6. Phase 6（US4）011 回归 + E2E
7. Phase 7 收尾

---

## 备注

- 新增依赖仅 `yet-another-react-lightbox-lite`；图标用已有 `react-icons/tb` 的 `TbZoomIn`。
- 标签存 `images.tags` 文本列，不建标签表；不改 PATCH / 列表 / 公开页。
- AI 最多 8 个标签；人工不截 8；空标签覆盖为空不算失败；空标题整次失败。
- 预览只用 `#image-preview` 同源 `src`，不把图送到第三方。
- 每完成一个检查点再进入下一阶段。
