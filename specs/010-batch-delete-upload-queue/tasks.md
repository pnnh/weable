# Tasks: 批量删除与上传队列

**Input**: Design documents from `specs/010-batch-delete-upload-queue/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**测试策略**: 批量删除主流程使用 Playwright E2E 测试；上传队列的批次控制逻辑使用 Vitest 单元测试（纯函数，无 DOM 依赖）。

**格式说明**:
- `[P]`：可并行执行（不同文件，无依赖关系）
- `[USn]`：所属用户故事编号

---

## Phase 1: 基础准备（共享基础设施）

**目的**：新增 i18n key、验证现有工具链，为两个功能提供公共基础。无需新建项目结构，直接在现有目录中操作。

- [X] T001 在 `src/locales/en.json` 追加批量删除相关 key：`batchDelete`、`batchDeleteConfirmTitle`、`batchDeleteConfirmBody`、`batchDeleteConfirm`、`batchDeleteFailed`
- [X] T002 [P] 在 `src/locales/zh.json` 追加对应中文翻译（与 T001 相同的 5 个 key）
- [X] T003 [P] 在 `src/locales/es.json` 追加对应西班牙语翻译（与 T001 相同的 5 个 key，可使用 en 值占位后续补充）
- [X] T004 在 `src/locales/en.json` 追加上传队列相关 key：`uploadQueue`、`uploadQueueEmpty`、`uploadQueueStart`、`uploadQueueUploading`、`uploadQueueStatusPending`、`uploadQueueStatusSuccess`、`uploadQueueStatusFailed`、`uploadQueueStatusOversized`、`uploadQueueStatusNeedsFile`、`uploadQueueSkippedDupes`、`uploadQueueModified`、`uploadQueueAddFiles`
- [X] T005 [P] 在 `src/locales/zh.json` 追加对应中文翻译（与 T004 相同的 12 个 key）
- [X] T006 [P] 在 `src/locales/es.json` 追加对应西班牙语翻译（与 T004 相同的 12 个 key，可使用 en 值占位）

**检查点**：运行 `pnpm exec tsc --noEmit`，零报错后可进入 Phase 2。

---

## Phase 2: 基础先决条件（阻塞所有用户故事）

**目的**：新增批量删除 API 路由（`DELETE` 方法）。此路由是用户故事 1 的唯一服务端依赖，必须在 Phase 3 之前完成。

**⚠️ 关键**：Phase 3 依赖此阶段完成后方可开始。

- [X] T007 在 `src/app/[lang]/console/api/images/batch/route.ts` 追加 `DELETE` 处理函数：校验 `ids` 格式（非空数组、上限 500、元素匹配 `/^[a-zA-Z0-9_-]+$/`），查询并过滤当前用户名下非目录图片，逐条调用 `storage.delete(id, filename).catch(()=>undefined)`，批量执行 `db.delete(...).where(inArray+eq(userId)+ne(mimeType,'directory'))`，返回 `{ ok: true, deleted: changes }`（200）；`ids` 格式非法返回 400；`changes === 0` 仍返回 200（部分成功语义，见 contracts/delete-images-batch.md）
- [X] T008 运行 `pnpm exec tsc --noEmit` 验证 T007 无类型错误

**检查点**：`curl -X DELETE http://localhost:7600/en/console/api/images/batch -H "Content-Type: application/json" -d '{"ids":["nonexistent"]}' -b "user_id=..."` 应返回 `200 {"ok":true,"deleted":0}`。

---

## Phase 3: 用户故事 1 — 批量删除图片（Priority: P1）🎯 MVP

**目标**：在图片列表工具栏新增"批量删除"按钮，选中图片后通过确认弹窗执行删除，删除后列表即时刷新、选中状态清空。

**独立测试标准**：模拟登录 → 上传 2 张测试图片 → 选中 → 批量删除 → 验证图片消失且刷新后不再存在。

### 用户故事 1 实现

- [X] T009 [US1] 新建 `src/components/BatchDeleteDialog.tsx`：参数 `{ open, onClose, lang, ids, count, onSuccess, labels }`；渲染确认弹窗，弹窗包含标题、"此操作不可撤销，将永久删除 {count} 张图片"警告文字、"取消"和"确认删除"按钮；点击"确认删除"后调用 `DELETE /{lang}/console/api/images/batch`，传入 `{ ids }`；成功后调用 `onSuccess()`；失败显示 `labels.batchDeleteFailed`；提交中禁用两个按钮（与 `BatchPublishDialog` 相同模式）
- [X] T010 [US1] 在 `src/components/ImagesBatchToolbar.tsx` 添加批量删除状态和按钮：新增 `deleteDialogOpen` state；在工具栏批量按钮区新增"批量删除"按钮（`hasSelection` 为 false 时 disabled）；在 JSX 底部新增 `<BatchDeleteDialog>` 实例，`onSuccess` 调用现有的 `handleBatchSuccess()`；同步在 `Props.labels` 类型中追加 `batchDelete / batchDeleteConfirmTitle / batchDeleteConfirmBody / batchDeleteConfirm / batchDeleteFailed` 5 个字段
- [X] T011 [US1] 在 `src/app/[lang]/console/images/page.tsx` 的 `batchLabels` 对象中追加 T010 所需的 5 个 label 字段，调用 `t(l, ...)` 从 i18n 读取
- [X] T012 [US1] 新建 `e2e/console-batch-delete.spec.ts`：测试流程：模拟登录（`e2e-delete@weable.test`）→ 通过 upload API 上传 2 张测试图片 → 访问 `/en/console/images` → 勾选复选框 → 点击"批量删除" → 断言弹窗出现且含警告文字 → 点击"取消" → 断言弹窗关闭列表不变 → 再次点击"批量删除" → "确认删除" → 断言图片从列表消失

**检查点**：`pnpm exec playwright test e2e/console-batch-delete.spec.ts` 全部通过；`pnpm exec tsc --noEmit` 零报错。

---

## Phase 4: 用户故事 2 — 选择文件并查看上传队列（Priority: P1）

**目标**：将 `/[lang]/console/images/new` 页面改造为上传队列展示页：选择图片后展示包含复选框、文件名、大小、修改时间、状态的队列表格；支持全选/单选；刷新后从 Session Storage 恢复状态。

**独立测试标准**：进入新建页面 → 选择 3 张图片 → 验证队列表格展示正确的文件名、大小、修改时间、默认全选状态 → 刷新页面 → 验证状态从 Session Storage 恢复。

### 用户故事 2 实现

- [X] T013 [US2] 新建 `src/components/UploadQueue.tsx`（`"use client"`）：定义 `QueueEntry` 类型（含 `name / size / lastModified / status / failCount / lastError / selected / parentId / file: File|null`）；实现 Session Storage 读写工具函数（key：`weable_upload_queue_{parentId ?? 'root'}`）；组件 props：`{ lang, parentId: string|null, labels }`；内部 state：`entries: QueueEntry[]`、`uploading: boolean`、`skipCount: number`（跳过文件提示）
- [X] T014 [US2] 在 `UploadQueue` 中实现组件挂载时 Session Storage 恢复逻辑：读取对应 key → 解析 JSON → 将 `status=pending/failed(failCount<3)` 的条目改为 `needs_file`（file 置 null）→ 更新 entries state
- [X] T015 [US2] 在 `UploadQueue` 中实现文件选择器：`<input type="file" accept="image/*" multiple>`（隐藏，通过按钮触发）；`onChange` 处理：过滤与现有 `entries` 同名的文件（计入 skipCount 给出提示）、超过 5 MB 的文件初始 status 为 `oversized`（复选框禁用）、其余初始 status 为 `pending`（复选框选中）；若同名文件 `needs_file` 状态则关联 File 对象并恢复为 `pending/failed`；追加到 entries 后写入 Session Storage
- [X] T016 [US2] 在 `UploadQueue` 中实现队列表格渲染：表头含全选复选框（`allSelected / someSelected / indeterminate` 逻辑）+ 文件名/大小/修改时间/状态列头；每行含复选框（`status=success/oversized` 或 `failCount>=3` 或 `status=needs_file` 时禁用）+ 文件名 + 格式化大小（KB/MB）+ 修改时间（`toLocaleDateString`）+ 状态标签（`needs_file` 行额外显示橙色提示文字）
- [X] T017 [US2] 在 `UploadQueue` 中实现状态标签与 tooltip：`success` → 绿色"成功"；`failed` → 红色"失败（N 次）"，`title` 属性（HTML native tooltip）展示 `lastError`；`oversized` → 灰色"文件过大"；`needs_file` → 橙色"需重新选择"；`pending` → 灰色"待上传"
- [X] T018 [US2] 在 `src/app/[lang]/console/images/[imageId]/page.tsx` 的 `isNew` 分支中，将 `<ImageUploadForm>` 替换为 `<UploadQueue>`，传入 `lang`、`parentId`（`parentId ?? null`）和从 `t(l, ...)` 读取的 labels；同步在 `src/app/[lang]/console/images/page.tsx` 的 i18n 传参中追加上传队列所需 labels（若 new 页面 labels 由 `[imageId]/page.tsx` 直接管理则在该文件处理）

**检查点**：访问 `/en/console/images/new` → 选择多张图片 → 队列表格正确展示 → 刷新 → 状态恢复（`needs_file`）。`pnpm exec tsc --noEmit` 零报错。

---

## Phase 5: 用户故事 3 — 执行上传并处理限速（Priority: P1）

**目标**：在 `UploadQueue` 工具栏新增"开始上传"按钮；点击后按每批最多 3 张串行批次并发上传；每张完成后即时更新状态；全部完成后按钮恢复。

**独立测试标准**：选中 6 张文件 → 点击"开始上传" → Network 面板验证分 2 批（每批 3 个并发）→ 成功后状态更新为"成功"、复选框禁用 → 按钮恢复可用。

### 用户故事 3 实现

- [X] T019 [US3] 在 `UploadQueue` 中实现 `uploadOne(entry: QueueEntry): Promise<void>` 内部函数：将 entry status 置为 `uploading` → 构造 `FormData`（1 个 `file` 字段 + 可选 `parentId`）→ `fetch POST /{lang}/console/api/upload` → 成功（2xx）：`status='success', selected=false` → 失败：`failCount++, lastError=errorText, status='failed'`（`failCount>=3` 则复选框禁用）→ 无论结果均写入 Session Storage
- [X] T020 [US3] 在 `UploadQueue` 中实现 `startUpload()` 函数：过滤可上传 entries（`selected=true, status!='success', status!='oversized', !(status=='failed'&&failCount>=3), file!=null`）→ `for` 循环每批 3 个 `await Promise.allSettled(batch.map(uploadOne))` → 全部完成后 `setUploading(false)`
- [X] T021 [US3] 在 `UploadQueue` 工具栏渲染区域添加"开始上传"按钮：`uploading=true` 或无可选文件时禁用；点击调用 `startUpload()`；按钮文字：上传中显示 `labels.uploadQueueUploading`，否则显示 `labels.uploadQueueStart`
- [X] T022 [US3] 新建 `src/components/UploadQueue.test.ts`（Vitest）：测试 `buildBatches(entries)` 纯函数（将 selected 可上传 entries 切分为每批 ≤3 的二维数组），覆盖：0 个、1 个、3 个、4 个（→ [3,1]）、6 个（→ [3,3]）选中文件的情况

**检查点**：`pnpm test src/components/UploadQueue.test.ts` 全部通过；手动测试上传 4 张图片，Network 面板验证第 1 批（3 个请求）完成后才发出第 2 批（1 个请求）。

---

## Phase 6: 用户故事 4 — 失败重试与上限控制（Priority: P2）

**目标**：上传失败后 `failCount` 递增；达到 3 次后复选框永久禁用、状态显示"失败（3 次）"；刷新后从 Session Storage 恢复禁用状态。

**独立测试标准**：DevTools 阻断请求模拟失败 → 对同一文件触发 3 次失败 → 复选框变禁用 → 刷新 → 禁用状态恢复。

### 用户故事 4 实现

（此用户故事的逻辑已在 T019 的 `uploadOne` 函数中实现，包含 `failCount` 递增和禁用判断。本阶段补充 Session Storage 恢复的边界校验和 Vitest 覆盖。）

- [X] T023 [US4] 在 `src/components/UploadQueue.test.ts` 中追加单元测试：验证 `failCount >= 3` 时 `isDisabled(entry)` 返回 true；验证 Session Storage 恢复时 `failCount=3/status=failed` 的条目复选框禁用（不改为 `needs_file`）；验证 `failCount=2` 的条目恢复为 `needs_file`
- [X] T024 [US4] 在 `UploadQueue` 组件中确认 `isDisabled` 辅助函数（纯函数）正确导出，供测试引用：`entry.status === 'success' || entry.status === 'oversized' || (entry.status === 'failed' && entry.failCount >= 3) || entry.status === 'needs_file'`

**检查点**：`pnpm test` 全部通过。

---

## Phase 7: 用户故事 5 — 同名文件去重保护（Priority: P2）

**目标**：同一 `parentId` 下同名文件客户端拦截不重复入队，并给出提示；服务端上传同名文件时返回冲突错误并正确展示。

**独立测试标准**：队列中已有 `photo.jpg` → 再次选择同名文件 → 验证队列行数不增加且出现跳过提示。

### 用户故事 5 实现

（客户端去重逻辑已在 T015 中实现。本阶段补充提示展示和 Vitest 覆盖。）

- [X] T025 [US5] 在 `UploadQueue` 组件顶部区域实现 `skipCount` 提示条：`skipCount > 0` 时显示橙色 banner（`labels.uploadQueueSkippedDupes.replace('{count}', String(skipCount))`），3 秒后自动清零（`setTimeout`）；banner 位于文件选择按钮和队列表格之间
- [X] T026 [US5] 在 `src/components/UploadQueue.test.ts` 中追加单元测试：验证 `deduplicateFiles(newFiles, existingEntries)` 纯函数：完全新文件全部入队；同名文件全部过滤；混合场景仅新文件入队并返回正确 skipCount

**检查点**：`pnpm test` 全部通过；手动验证：队列中有 `a.jpg`，再选 `a.jpg` 和 `b.jpg`，队列增加 1 行（`b.jpg`），显示"已跳过 1 个队列中的同名文件"。

---

## Phase 8: 收尾与跨切面关注点

**目的**：回归测试、TypeScript 类型检查、i18n 完整性确认、Edge Case 覆盖。

- [X] T027 [P] 运行 `pnpm exec tsc --noEmit` 确认全项目零类型错误
- [X] T028 [P] 运行 `pnpm test` 确认所有 Vitest 单元测试通过（含新增的 `UploadQueue.test.ts`）
- [ ] T029 运行 `pnpm exec playwright test` 确认全部 E2E 用例通过（含 `console-batch-delete.spec.ts`、`console-images.spec.ts`、`console-auth.spec.ts`）
- [X] T030 [P] 验证 `src/locales/en.json` / `zh.json` / `es.json` 三个文件中新增 key 数量一致（各 17 个），且 `t(l, key)` 调用不会在 TypeScript 层报错（若 `t` 函数有 key 类型约束则更新类型定义）
- [X] T031 [P] 在 `src/app/[lang]/console/images/[imageId]/page.tsx` 中确认 `isNew` 分支的认证保护与列表页一致（已有 `getCurrentUser()` 守卫，无需修改，仅验证未登录访问 `/new` 仍重定向到 signin）
- [ ] T032 按 `quickstart.md` 的场景 1–6 手动执行验证，确认所有检查点通过

---

## 依赖关系与执行顺序

### 阶段依赖

- **Phase 1（基础准备）**：无依赖，可立即开始
- **Phase 2（基础先决条件）**：依赖 Phase 1 完成（需要 i18n key 编译通过）；**阻塞 Phase 3**
- **Phase 3（US1 批量删除）**：依赖 Phase 2 完成
- **Phase 4（US2 上传队列展示）**：依赖 Phase 1 完成（i18n key）；**不依赖 Phase 2/3**（可与 Phase 3 并行）
- **Phase 5（US3 上传执行）**：依赖 Phase 4 完成
- **Phase 6（US4 重试控制）**：依赖 Phase 5 完成（`uploadOne` 函数已实现）
- **Phase 7（US5 去重保护）**：依赖 Phase 4 完成（T015 的去重逻辑基础）
- **Phase 8（收尾）**：依赖所有功能阶段完成

### 用户故事依赖

- **US1（批量删除）**：仅依赖 Phase 1+2，独立完整
- **US2（队列展示）**：依赖 Phase 1，独立完整
- **US3（上传执行）**：依赖 US2
- **US4（重试控制）**：依赖 US3（T019 中已内嵌，T023/T024 为补充测试）
- **US5（去重保护）**：依赖 US2（T015 中已内嵌，T025/T026 为补充测试）

### 任务内依赖

- T009 → T010（`BatchDeleteDialog` 必须先存在才能在 Toolbar 中引用）
- T010 → T011（Toolbar 的 labels 类型扩展后，page.tsx 才能补充传参）
- T013 → T014 → T015 → T016 → T017（`UploadQueue` 组件逐步构建）
- T019 → T020 → T021（上传函数 → 批次控制 → 按钮渲染）

---

## 并行执行示例

### Phase 1 并行机会

```
同时执行：
- T001 en.json 追加批量删除 key
- T002 zh.json 追加批量删除 key（并行，不同文件）
- T003 es.json 追加批量删除 key（并行，不同文件）
```

### Phase 1+4 并行机会（Phase 1 完成后）

```
流线 A（批量删除）: Phase 2 → Phase 3
流线 B（上传队列）: Phase 4 → Phase 5 → Phase 6 → Phase 7
两条流线可同时推进，互不阻塞
```

### Phase 3 内部并行

```
T009 BatchDeleteDialog.tsx（新文件，无依赖）
T012 console-batch-delete.spec.ts（新文件，无依赖，可先写测试框架）
↓ 完成后
T010 ImagesBatchToolbar.tsx（依赖 T009）
↓
T011 images/page.tsx（依赖 T010）
```

---

## 实现策略

### MVP 优先（仅用户故事 1）

1. 完成 Phase 1（i18n 批量删除 key）
2. 完成 Phase 2（`DELETE` API 路由）
3. 完成 Phase 3（`BatchDeleteDialog` + 工具栏按钮 + E2E 测试）
4. **暂停验证**：运行 E2E 测试，确认批量删除端到端可用
5. 如需立即上线可在此交付

### 增量交付

1. Phase 1+2+3 → 批量删除完整上线
2. Phase 4 → 上传队列展示可用（用户可选文件查看队列，但暂不能上传）
3. Phase 5 → 上传执行功能上线（核心限速控制）
4. Phase 6+7 → 重试控制 + 去重保护完整上线
5. Phase 8 → 回归确认，全部功能联测

---

## 备注

- `[P]` 任务可分配给不同开发者同时推进
- 每个 Phase 结束时运行 `pnpm exec tsc --noEmit` 作为快速回归检查
- `UploadQueue` 组件较复杂，建议 T013–T017 按顺序逐步提交，每步可独立 review
- `BatchDeleteDialog` 参照现有 `BatchPublishDialog`（`src/components/BatchPublishDialog.tsx`）风格编写，保持 UI 一致性
- 本 feature 不新增任何 npm 依赖
