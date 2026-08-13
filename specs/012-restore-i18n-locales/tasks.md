---

description: "恢复法语、日语与繁体中文 — 复用 dc57f28 前译文，并为 009 后新功能补译"

---

# 任务列表：恢复法语、日语与繁体中文

**输入**: `specs/012-restore-i18n-locales/` 下的设计文档

**前置条件**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**测试**: 规格未要求 TDD，不单列「先写失败测试」任务。现有测试必须随语言列表与文案恢复同步更新（纳入对应实现任务）。29 个新键清单见 [research.md](./research.md) §R2。

**组织原则**: 按用户故事分阶段。文案文件与 `LangKey` / `TargetLang` 必须先就绪，否则 `tsc` 无法通过。

## 格式：`[ID] [P?] [Story] 描述 + 文件路径`

- **[P]**：可并行执行（不同文件，无未完成依赖）
- **[Story]**：所属用户故事（US1、US2、US3、US4）
- 每条任务包含精确文件路径

---

## Phase 1：准备（无）

本功能在现有仓库上恢复语言，无需新建项目结构或增加依赖。跳过 Phase 1，直接进入基础层。

---

## Phase 2：基础层（阻塞性前置任务）

**目的**：恢复三份 locale、补齐 29 个新键、扩宽 `LangKey`、注册到 `t()`，并把 `TargetLang` 对齐 `LangKey`。之后切换器、路由、`Accept-Language`、AI 下拉都只消费这一套配置。

**⚠️ 关键**：US1–US4 均须等待本阶段完成。先扩 `LangKey` 却不改 `TargetLang` 会导致 `ImageAiMetaSection.tsx` 中 `pageLang: LangKey` 无法赋给 `TargetLang`。

- [x] T001 [P] 用 `git show dc57f28^:src/locales/fr.json` 恢复 `src/locales/fr.json`，79 个历史键值原样写入，不得改写
- [x] T002 [P] 用 `git show dc57f28^:src/locales/ja.json` 恢复 `src/locales/ja.json`，79 个历史键值原样写入，不得改写
- [x] T003 [P] 用 `git show dc57f28^:src/locales/zh-TW.json` 恢复 `src/locales/zh-TW.json`，79 个历史键值原样写入，不得改写
- [x] T004 在 `src/locales/fr.json` 追加 [research.md](./research.md) §R2 的 29 个键：以 `src/locales/en.json` 为唯一源译成法语；`batchDeleteConfirmBody`、`uploadQueueSkippedDupes`、`uploadQueueStatusFailed` 必须保留 `{count}`（依赖 T001）
- [x] T005 [P] 在 `src/locales/ja.json` 追加相同 29 个键的日语译文，规则同 T004（依赖 T002）
- [x] T006 [P] 在 `src/locales/zh-TW.json` 追加相同 29 个键的繁体中文译文，规则同 T004（依赖 T003）
- [x] T007 [P] 更新 `src/lib/language.ts`：恢复 `langFr` / `langJa` / `langZhTW`；`LangKey` 扩为 `"en" | "es" | "fr" | "ja" | "zh" | "zh-TW"`；`supportedLanguages` 按序为 English、Español、Français、日本語、简体中文、繁體中文；不恢复 `de-DE` / `pt-PT`
- [x] T008 更新 `src/lib/i18n.ts`：import `src/locales/fr.json`、`ja.json`、`zh-TW.json`，并写入 `locales` 映射（依赖 T004、T005、T006、T007）
- [x] T009 更新 `src/lib/browserAi.ts`：`export type TargetLang = LangKey`（从 `@/lib/language` 引入）；`OUTPUT_LANG_NAME` 增加 `fr: "French"`、`ja: "Japanese"`、`zh-TW: "Traditional Chinese"`（依赖 T007）

**检查点**：`pnpm tsc --noEmit` 通过；`src/locales/` 仅有 `en` `es` `zh` `fr` `ja` `zh-TW` 六个 JSON，无 `de-DE.json` / `pt-PT.json`。

---

## Phase 3：用户故事 1 — 访问者可再次选择法语、日语、繁体中文（优先级 P1）🎯 MVP 入口

**目标**：语言切换器恰好 6 项；选择法 / 日 / 繁中后 URL `[lang]` 与界面同步；不含德语、葡萄牙语。

**独立测试**：打开切换器，选项为 English、Español、Français、日本語、简体中文、繁體中文；分别切到 `/fr/`、`/ja/`、`/zh-TW/` 无错误页。

### 实现

- [x] T010 [US1] 更新 `src/lib/language.test.ts`：`isValidLang` 对 `en` `es` `fr` `ja` `zh` `zh-TW` 为 true；对 `de-DE` `pt-PT` `de` `pt` `zh-CN` `FR` `""` 为 false
- [x] T011 [US1] 核对 `src/components/LanguageSelector.tsx` 仍只遍历 `supportedLanguages`，无硬编码 3 语列表；无需改则保持原文件，有硬编码则改回动态读取

**检查点**：`pnpm test src/lib/language.test.ts src/components/LanguageSelector.test.tsx` 通过；切换器 option 数为 6。

---

## Phase 4：用户故事 2 — 历史文案原样可用，新增功能文案补齐（优先级 P1）

**目标**：法 / 日 / 繁中的 79 条历史文案与 `dc57f28^` 一致；29 条新文案存在且语义对等；键集与 `en.json` 一一对应。

**独立测试**：`t("fr"|"ja"|"zh-TW", 既有键)` 非空且等于历史值；批量删除 / 上传队列 / AI 识别相关键均有译文并含所需 `{count}`。

### 实现

- [x] T012 [US2] 更新 `src/lib/i18n.test.ts`：断言 `fr` / `ja` / `zh-TW` 的 `home` 等既有键非空；三文件键集与 `src/locales/en.json` 完全一致；与 `git show dc57f28^:src/locales/<lang>.json` 的交集 79 键值相等；`batchDeleteConfirmBody`、`uploadQueueSkippedDupes`、`uploadQueueStatusFailed` 含 `{count}`

**检查点**：`pnpm test src/lib/i18n.test.ts` 通过；`en.json` / `es.json` / `zh.json` 无改动。

---

## Phase 5：用户故事 3 — 浏览器语言与旧书签能回到恢复语言（优先级 P2）

**目标**：`Accept-Language` 为法 / 日 / 繁中时进入对应语言；`zh` 与 `zh-TW` 分立；德语 / 葡萄牙语仍回退英语；`/fr/` `/ja/` `/zh-TW/` 有效，`/de-DE/` `/pt-PT/` 仍 404。

**独立测试**：见 [contracts/locale-contract.md](./contracts/locale-contract.md) 中 `getTargetLang` 与 URL 表。

### 实现

- [x] T013 [US3] 在 `src/lib/language.test.ts` 增加 `getTargetLang` 用例：`fr-FR,fr;q=0.9` → `fr`；`ja-JP,ja;q=0.9` → `ja`；`zh-TW,zh;q=0.9` → `zh-TW`；`zh-CN,zh;q=0.9` → `zh`；`de-DE,de;q=0.9` 与 `pt-PT,pt;q=0.9` 回退 `en` / `defaultLanguage`
- [x] T014 [US3] 核对 `src/app/[lang]/layout.tsx`（`isValidLang` → `notFound()`、`generateStaticParams`）与 `src/app/page.tsx`（根路径 `getTargetLang(acceptLang, defaultLanguage)`）：确认恢复语言可进、`de-DE`/`pt-PT` 仍 404；无需改则保持原文件

**检查点**：`pnpm test src/lib/language.test.ts` 通过；`pnpm dev` 下 `/fr/` 200、`/de-DE/` 404。

---

## Phase 6：用户故事 4 — 依赖站点支持语言列表的控件同步扩大（优先级 P2）

**目标**：AI 识别确认框输出语言为 6 项；`recognizeImage` 接受 `fr` / `ja` / `zh-TW`，prompt 含 French / Japanese / Traditional Chinese。

**独立测试**：编辑页确认框下拉与切换器 6 项一致；`pageLang` 为 `ja` 时默认 日本語；选 `zh-TW` 后 prompt 含 Traditional Chinese。

### 实现

- [x] T015 [P] [US4] 更新 `src/lib/browserAi.test.ts`：除现有 `es` → Spanish 外，增加 `targetLang: "ja"`（或 `fr` / `zh-TW`）断言 `prompt` 调用文本含 `Japanese`（或 `French` / `Traditional Chinese`）
- [x] T016 [P] [US4] 更新 `src/components/ImageAiMetaSection.test.tsx`：确认框 `<select>` 有 6 个 option 且含 `fr` `ja` `zh-TW`；`renderSection("ja")` 打开后下拉默认值为 `ja`；`pageLang` 类型改为 `LangKey`（或与 `src/lib/language.ts` 对齐）

**检查点**：`pnpm test src/lib/browserAi.test.ts src/components/ImageAiMetaSection.test.tsx` 通过。

---

## Phase 7：收尾与跨切验证

**目的**：全量类型检查、测试、文案边界与 quickstart。

- [x] T017 按 `specs/012-restore-i18n-locales/quickstart.md` 步骤 1 运行 `pnpm tsc --noEmit`，确认无类型错误
- [x] T018 按 `specs/012-restore-i18n-locales/quickstart.md` 步骤 2 运行 `pnpm test`，确认全部测试通过
- [x] T019 确认不存在 `src/locales/de-DE.json`、`src/locales/pt-PT.json`；`src/locales/en.json`、`es.json`、`zh.json` 相对实现前无改动
- [x] T020 [P] 按 `specs/012-restore-i18n-locales/quickstart.md` 步骤 4 做运行时冒烟：切换器 6 项、`/fr/` `/ja/` `/zh-TW/` 可开、`/de-DE/` 404、AI 下拉 6 项
- [x] T021 在仓库根目录运行 `graphify update .`，按 `graphify-out/` 同步知识图

---

## 依赖关系与执行顺序

### 阶段依赖

- **Phase 2（基础层）**：无前置 → **阻塞 US1–US4**
  - T001 / T002 / T003 可并行
  - T004 依赖 T001；T005 依赖 T002；T006 依赖 T003；三者可并行
  - T007 可与 T004–T006 并行
  - T008 依赖 T004–T007
  - T009 依赖 T007（建议在 T008 同时或之后）
- **Phase 3（US1）**：依赖 Phase 2
- **Phase 4（US2）**：依赖 Phase 2；可与 US1 并行
- **Phase 5（US3）**：依赖 Phase 2；T013 与 T010 改同一文件 `src/lib/language.test.ts`，须串行（先 T010 再 T013，或合并一次提交）
- **Phase 6（US4）**：依赖 Phase 2（尤其 T009）；T015 与 T016 可并行
- **Phase 7**：依赖计划交付的用户故事完成

### 用户故事依赖

- **US1（P1）**：Phase 2 完成后开始；不依赖其他故事
- **US2（P1）**：Phase 2 完成后开始；文案本体已在 T001–T006 落地，本阶段用测试锁住 FR-004/005/006
- **US3（P2）**：Phase 2 完成后开始；与 US1 共享 `language.test.ts`，注意避免并行改同一文件
- **US4（P2）**：Phase 2 完成后开始；产品代码已在 T009 落地，本阶段补齐 AI 侧测试

### 并行机会

- T001、T002、T003
- T004、T005、T006、T007（各改不同文件）
- T011 可与 T010 并行（不同文件）
- T012 可与 US1 并行
- T014 可与 T013 并行（不同文件）
- T015、T016
- T020 可与 T019 并行

---

## 并行执行示例：Phase 2

```bash
# 同时恢复三份历史文案：
Task: "恢复 src/locales/fr.json"
Task: "恢复 src/locales/ja.json"
Task: "恢复 src/locales/zh-TW.json"

# 历史文件就位后同时补译 + 改 language.ts：
Task: "补译 src/locales/fr.json 的 29 键"
Task: "补译 src/locales/ja.json 的 29 键"
Task: "补译 src/locales/zh-TW.json 的 29 键"
Task: "更新 src/lib/language.ts"
```

## 并行执行示例：User Story 4

```bash
Task: "更新 src/lib/browserAi.test.ts 的恢复语言 prompt 断言"
Task: "更新 src/components/ImageAiMetaSection.test.tsx 的 6 选项与默认语言"
```

---

## 实现策略

### MVP 优先（US1 + 基础层）

1. 完成 Phase 2（T001–T009）
2. 完成 Phase 3（T010–T011）
3. **停止并验证**：切换器 6 项，`/fr/` `/ja/` `/zh-TW/` 可打开
4. 再做 US2 文案锁测，然后 US3 / US4

可演示的最小完整增量是 **Phase 2 + US1 + US2**（能切换且文案完整）。仅 US1 时页面已有译文（因 T004–T006 在基础层），但尚未用测试锁住历史一致性。

### 增量交付

1. Phase 2 → 类型与文案就绪，切换器已是 6 项
2. US1 → 语言列表测试锁住，可 demo 切换
3. US2 → 历史 / 新键一致性锁住
4. US3 → 浏览器语言与旧书签路径锁住
5. US4 → AI 输出语言与站点列表一致
6. Phase 7 → 全量验证，可合并

---

## 备注

- [P] 任务 = 不同文件且无未完成依赖
- [Story] 与 spec.md 用户故事对应
- 不要恢复 `src/locales/de-DE.json` / `pt-PT.json`
- 不要改 `src/locales/en.json` / `es.json` / `zh.json`
- `LanguageSelector.tsx` 与 `src/app/[lang]/` 路由结构原则上不改
- 不修订 `.specify/memory/constitution.md`（仍列出 8 语，已知偏差）
- T013 与 T010 同文件，禁止两人同时改
