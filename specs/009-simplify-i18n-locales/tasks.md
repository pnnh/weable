---

description: "简化多语言支持 — 仅保留 en、es、zh，移除 fr、de-DE、pt-PT、ja、zh-TW"

---

# 任务列表：简化多语言支持

**输入**: `specs/009-simplify-i18n-locales/` 下的设计文档

**前置条件**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**测试**: 规格未明确要求 TDD，不生成专项测试任务；现有测试文件中引用已移除语言的断言需同步修复（纳入对应实现任务）。

**组织原则**: 按用户故事分阶段，每个故事可独立实现和验证。

## 格式：`[ID] [P?] [Story] 描述 + 文件路径`

- **[P]**：可并行执行（不同文件，无未完成依赖）
- **[Story]**：所属用户故事（US1、US2、US3）
- 每条任务包含精确文件路径

---

## Phase 1：准备（无）

本功能为纯减法操作，无需新建项目结构或初始化依赖。跳过 Phase 1，直接进入基础层。

---

## Phase 2：基础层（阻塞性前置任务）

**目的**：修改语言配置的单一真相来源。所有用户故事均依赖此阶段完成。

**⚠️ 关键**：US1、US2、US3 均须等待本阶段完成后方可开始。

- [x] T001 更新 `src/lib/language.ts`：移除 `langFr`、`langDe`、`langPt`、`langJa`、`langZhTW` 常量；收窄 `LangKey` 类型联合为 `"en" | "es" | "zh"`；将 `supportedLanguages` 数组缩减为 3 项（en、es、zh）
- [x] T002 更新 `src/lib/i18n.ts`：移除 `fr`、`de-DE`、`pt-PT`、`ja`、`zh-TW` 的 JSON import 语句；从 `locales` 映射对象中删除对应键

**检查点**：`pnpm tsc --noEmit` 通过，`LangKey` 仅含 3 种语言 → 用户故事实现可开始

---

## Phase 3：用户故事 1 — 访问者仅看到三种语言选项（优先级 P1）🎯 MVP

**目标**：语言切换器仅渲染 3 个选项；非法 locale 路由返回 404。

**独立测试**：打开语言切换器，确认只有 English、Español、简体中文三项；直接访问 `/ja/` 返回 404。

### Phase 3 实现

- [x] T003 [P] [US1] 删除翻译文件 `src/locales/fr.json`
- [x] T004 [P] [US1] 删除翻译文件 `src/locales/de-DE.json`
- [x] T005 [P] [US1] 删除翻译文件 `src/locales/pt-PT.json`
- [x] T006 [P] [US1] 删除翻译文件 `src/locales/ja.json`
- [x] T007 [P] [US1] 删除翻译文件 `src/locales/zh-TW.json`
- [x] T008 [US1] 修复 `src/lib/language.test.ts`：将第 27 行 `getTargetLang("de-DE", "en")` 断言替换为有效语言（如 `getTargetLang("zh", "en")`）；将第 36、40 行 fallback 参数 `"ja"` 替换为有效语言（如 `"es"`）

**检查点**：`pnpm vitest run src/lib/language.test.ts` 全绿；`LanguageSelector` 渲染的 `<option>` 数量为 3

---

## Phase 4：用户故事 2 — 保留语言翻译文案完整可用（优先级 P2）

**目标**：en、es、zh 三种语言在各页面文案正常渲染，无缺失或占位符。

**独立测试**：切换到简体中文 / Español，访问主要页面，确认所有文案正确显示。

### Phase 4 实现

- [x] T009 [US2] 修复 `src/lib/i18n.test.ts`：将第 12 行 `t("ja", "home")` 替换为有效语言（如 `t("es", "home")`），确保测试覆盖 3 种保留语言

**检查点**：`pnpm vitest run src/lib/i18n.test.ts` 全绿；`t("es", "home")` 和 `t("zh", "home")` 均返回非空字符串

---

## Phase 5：用户故事 3 — 已移除语言路由不可访问（优先级 P3）

**目标**：访问 `/ja/`、`/fr/` 等已移除 locale 路由时，`isValidLang()` 返回 `false`，触发 `notFound()`，不出现 500 错误。

**独立测试**：`pnpm dev` 后访问 `http://localhost:7600/ja/`，确认返回 404，无白屏。

### Phase 5 实现

> 本用户故事无需额外代码修改。`isValidLang()` 已在 T001 收窄，路由层（`src/app/[lang]/`）调用 `notFound()` 的逻辑不变。本阶段仅做验证确认。

- [x] T010 [US3] 验证 `src/app/[lang]/page.tsx` 和 `src/app/[lang]/layout.tsx` 中调用 `isValidLang()` 的逻辑：确认已移除 locale 会触发 `notFound()`，无需修改代码；若发现遗漏的 hardcode 语言列表，补充修正

**检查点**：`pnpm build` 成功；访问 `/ja/`、`/fr/` 返回 404，不出现 500

---

## Phase 6：收尾与验证

**目的**：全量构建验证 + 运行时冒烟测试

- [x] T011 运行 `pnpm tsc --noEmit` 确认无 TypeScript 类型错误
- [x] T012 运行 `pnpm vitest run` 确认全部测试通过
- [x] T013 运行 `pnpm build` 确认构建产物不包含已移除语言的翻译文件
- [ ] T014 [P] 按 `specs/009-simplify-i18n-locales/quickstart.md` 步骤 4 执行运行时冒烟验证：语言切换器仅 3 项、已移除路由返回 404、保留语言文案正常渲染

---

## 依赖关系与执行顺序

### 阶段依赖

- **Phase 2（基础层）**：无前置依赖，立即开始 → **阻塞 Phase 3/4/5**
- **Phase 3（US1）**：依赖 Phase 2 完成 → T003-T007 可并行，T008 依赖 T001
- **Phase 4（US2）**：依赖 Phase 2 完成 → 可与 Phase 3 并行
- **Phase 5（US3）**：依赖 Phase 2 完成 → 可与 Phase 3/4 并行；实际无代码修改
- **Phase 6（收尾）**：依赖 Phase 3/4/5 全部完成

### 用户故事依赖

- **US1（P1）**：Phase 2 完成后开始，无跨故事依赖
- **US2（P2）**：Phase 2 完成后开始，无跨故事依赖
- **US3（P3）**：Phase 2 完成后开始，无代码修改，仅验证

### 任务内并行机会

- T003、T004、T005、T006、T007（5 个 JSON 文件删除）可完全并行
- T008（language.test.ts）可与 T003-T007 并行执行
- T009（i18n.test.ts）可与 T003-T008 并行执行

---

## 并行执行示例：Phase 3（US1）

```bash
# 5 个 JSON 文件删除可同时执行：
Task: "删除 src/locales/fr.json"
Task: "删除 src/locales/de-DE.json"
Task: "删除 src/locales/pt-PT.json"
Task: "删除 src/locales/ja.json"
Task: "删除 src/locales/zh-TW.json"

# 同时修复测试：
Task: "修复 src/lib/language.test.ts 中的已移除语言引用"
```

---

## 实现策略

### MVP 优先（仅用户故事 1）

1. 完成 Phase 2：修改 `language.ts` 和 `i18n.ts`（T001、T002）
2. 完成 Phase 3：删除 5 个 JSON 文件 + 修复 language 测试（T003-T008）
3. **停止并验证**：`pnpm vitest run`、语言切换器仅显示 3 项
4. 如通过，继续 Phase 4/5/6

### 增量交付

1. Phase 2 完成 → 类型系统已收窄，构建仍失败（缺少 JSON import 删除）
2. Phase 2 + Phase 3 完成 → 构建通过，语言切换器正确，可 demo
3. Phase 4 完成 → 翻译测试全绿
4. Phase 6 完成 → 全量验证，可合并

---

## 备注

- [P] 任务 = 操作不同文件，无未完成依赖，可并行
- [Story] 标签与 spec.md 用户故事对应，确保可追溯
- T001 是关键路径起点，优先执行
- `LanguageSelector.tsx` 和 `LanguageSelector.test.tsx` 无需修改（已通过动态读取自适应）
- 完成后建议更新 `.specify/memory/constitution.md` §技术规范 中的语言列表（独立任务，非本功能范围）
