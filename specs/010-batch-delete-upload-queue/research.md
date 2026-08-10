# Research: 批量删除与上传队列

**Feature**: `010-batch-delete-upload-queue`
**Date**: 2026-08-10

## R1：批量删除 API 设计——新增 DELETE 方法 vs 新建独立路由

**Decision**: 在现有 `src/app/[lang]/console/api/images/batch/route.ts` 中新增 `DELETE` 处理函数，不新建路由文件。

**Rationale**:
- `/images/batch` 是批量图片操作的语义聚合点，`PATCH` 已在此处，`DELETE` 同属批量操作，路径一致性好。
- 减少新增文件数，符合宪法"简洁优先"原则。
- Next.js App Router 同一路由文件可导出多个 HTTP 方法，天然支持。

**Alternatives considered**:
- 独立路由 `/images/batch/delete`：RESTful 上冗余，且 DELETE 语义本身已表达操作，不需要路径再强调。

---

## R2：批量删除的存储层处理策略

**Decision**: 逐条调用 `storage.delete(id, filename)`（与现有单图删除行为一致，失败 `catch(() => undefined)` 静默忽略），最后批量执行 `db.delete(...).where(inArray(...))`。

**Rationale**:
- R2 删除是幂等操作，失败不影响 DB 一致性（文件"孤儿"比"幽灵记录"危害更小）。
- 与现有 `[imageId]/route.ts` 的 `DELETE` 逻辑保持一致，降低维护认知负担。
- Cloudflare D1 单次事务内支持删除多条记录，`inArray` 单次 SQL 即可，不需要逐条删除。

**Alternatives considered**:
- 先删 DB 再删存储：DB 删除后若存储失败则产生孤儿文件，与现有逻辑一致，可接受。
- 事务回滚：D1 SQLite 支持事务，但因 R2 不可回滚，混合事务无实际意义。

---

## R3：上传队列批次策略——批次内并发 vs 全串行

**Decision**: 批次内最多 3 个并发（`Promise.allSettled` 处理 3 个 `fetch`），批次间串行（`for` 循环 `await`）。

**Rationale**:
- `Promise.allSettled` 保证批次内任一失败不影响其他条目的状态更新。
- 批次间串行确保每轮最多 3 个 D1 写入 + 3 个 R2 put，严格控制 Cloudflare Free 配额消耗。
- 用户可感知进度（每批完成后状态即时更新）。

**Alternatives considered**:
- 全串行（逐张）：更保守但用户等待时间更长，且 Free 配额并不是"每秒"限制，批内并发 3 个完全可接受。
- 全并发：不可控，违背限速设计目标。

---

## R4：Session Storage 键设计

**Decision**: 键格式为 `weable_upload_queue_{parentId}`，`parentId` 为 `null` 时替换为字符串 `"root"`。即：
- 根目录：`weable_upload_queue_root`
- 子目录：`weable_upload_queue_{directoryId}`

存储值为 `QueueEntry[]` 的 JSON 序列化（不含 `File` 对象，仅存元数据和状态）。

**Rationale**:
- 前缀 `weable_` 避免与其他 Session Storage key 冲突。
- `parentId=null` → `"root"` 字符串，规避 JSON.stringify 对 null 键的处理歧义。
- 按 `parentId` 隔离，不同目录的上传队列完全独立。

**Alternatives considered**:
- 单一 key 存所有队列（Map by parentId）：读写颗粒度粗，清理单目录队列需要整体替换。
- 使用 `IndexedDB`：持久化过强（跨会话），Session Storage 的会话级清除恰好满足需求。

---

## R5：File 对象不可序列化的处理

**Decision**: `QueueEntry` 的 `file` 字段（`File | null`）仅保存在内存 React state 中，不写入 Session Storage。Session Storage 只存 `name / size / lastModified / status / failCount / lastError / selected / parentId` 等可序列化字段。

页面刷新后：
- `status = 'success'` 或 `failCount >= 3` 的条目：从 Session Storage 恢复，显示最终状态，复选框禁用，无需 `File` 对象。
- `status = 'pending' / 'failed'`（failCount < 3）的条目：从 Session Storage 恢复元数据，但 `file = null`，UI 展示"需重新选择文件"提示（橙色 badge），复选框禁用直到用户重新选择同名文件关联。

**Rationale**:
- 满足需求中"Session Storage 持久化"的目标。
- 避免复杂的 `FileSystemFileHandle` 权限申请（`showOpenFilePicker` 需用户手势，且持久化权限跨 session 不可靠）。
- 复杂度最低，用户体验明确（提示重新选择文件）。

**Alternatives considered**:
- 不持久化，完全内存：刷新即丢失所有状态，不满足 FR-U012。
- 使用 `File System Access API showOpenFilePicker` + `FileSystemFileHandle`：handle 的持久化权限需再次用户确认，复杂且兼容性有限。

---

## R6：同名文件客户端去重实现

**Decision**: 在将新选文件追加到队列前，按 `file.name` 与队列现有条目的 `name` 做集合比对（`Set<string>`），重复项跳过，并在页面顶部展示临时 toast/banner："X 个文件已在队列中，已跳过"（3 秒后自动消失）。

**Rationale**:
- 队列去重 key 为 `name`（文件名），与服务端 `filename` 字段一一对应。
- Set 查找 O(1)，性能无问题。
- 临时提示足够，不需要持久化的 error 状态。

**Alternatives considered**:
- 仅靠服务端 409 拦截：用户体验差，浪费请求配额。
- 使用文件内容 hash 去重：计算成本高，且需求明确按文件名去重。

---

## R7：上传单个文件的请求格式

**Decision**: 复用现有 `POST /[lang]/console/api/upload` 接口，每次请求携带 1 个 `file` 字段（`FormData`）+ 可选 `parentId`。每批 3 张则并发发出 3 个独立请求（非一次 formData 多个 file）。

**Rationale**:
- 现有 API 已支持单次多文件，但为了上传队列的逐条状态追踪，每请求 1 文件更简洁。
- 不修改 upload API，完全复用。
- 响应体 `{ ids: string[] }` 含 1 个 id，直接标记该条目为 `success`。

**Alternatives considered**:
- 一次请求发送整批 3 个文件：无法逐条更新状态（整批失败只能全部标记为失败）。

---

## R8：i18n 新增 key 清单

需新增以下 i18n key（`en.json` + `zh.json` + 其他语言文件同步）：

| Key | 用途 | en 默认值 | zh 默认值 |
|-----|------|----------|----------|
| `batchDelete` | 工具栏批量删除按钮文字 | "Delete" | "批量删除" |
| `batchDeleteConfirmTitle` | 确认弹窗标题 | "Delete Images" | "删除图片" |
| `batchDeleteConfirmBody` | 确认弹窗警告正文 | "This action cannot be undone. {count} image(s) will be permanently deleted." | "此操作不可撤销，将永久删除 {count} 张图片。" |
| `batchDeleteConfirm` | 确认按钮 | "Delete" | "确认删除" |
| `batchDeleteFailed` | 删除失败提示 | "Delete failed. Please try again." | "删除失败，请重试。" |
| `uploadQueue` | 上传队列页面标题/标签 | "Upload Queue" | "上传队列" |
| `uploadQueueEmpty` | 队列为空提示 | "No files selected. Choose images to upload." | "未选择文件，请选择要上传的图片。" |
| `uploadQueueStart` | 开始上传按钮 | "Start Upload" | "开始上传" |
| `uploadQueueUploading` | 上传中按钮状态 | "Uploading…" | "上传中…" |
| `uploadQueueStatusPending` | 队列条目待上传状态 | "Pending" | "待上传" |
| `uploadQueueStatusSuccess` | 队列条目成功状态 | "Done" | "成功" |
| `uploadQueueStatusFailed` | 队列条目失败状态（N 次） | "Failed ({count}×)" | "失败（{count} 次）" |
| `uploadQueueStatusOversized` | 队列条目超大状态 | "Too large" | "文件过大" |
| `uploadQueueStatusNeedsFile` | 刷新后需重新关联文件 | "Re-select file" | "需重新选择" |
| `uploadQueueSkippedDupes` | 跳过重复文件提示 | "{count} file(s) already in queue, skipped." | "已跳过 {count} 个队列中的同名文件。" |
| `uploadQueueModified` | 修改时间列标题 | "Modified" | "修改时间" |
| `uploadQueueAddFiles` | 选择/添加文件按钮 | "Choose Images" | "选择图片" |

注：`{count}` 为运行时替换占位符，实现时采用简单字符串替换（`label.replace('{count}', String(n))`），无需引入 i18n 插值库。

**注意**：项目支持 `en / es / zh / zh-TW / ja / de-DE / fr / pt-PT` 8 种语言（来自宪法），但当前 `locales/` 目录实际只有 `en.json` 和 `zh.json`（经代码验证，`src/lib/language.ts` 只导出 `en / es / zh` 三种，且 `en.json / zh.json` 与 `es.json` 均需更新）。

---

## R9：E2E 测试范围

**Decision**: 新增 `e2e/console-batch-delete.spec.ts`，覆盖批量删除主流程（登录 → 上传测试图片 → 选中 → 删除 → 验证消失）。上传队列逻辑涉及文件系统 API，E2E 覆盖选择文件后队列展示和状态更新；复杂批次控制通过 Vitest 单元测试覆盖（UploadQueue 的 `uploadBatches` 纯函数）。

**Rationale**:
- Playwright 对 `input[type=file]` 的 `setInputFiles` 已支持，可模拟文件选择。
- 批次控制是纯客户端逻辑，单元测试比 E2E 更高效且稳定。
