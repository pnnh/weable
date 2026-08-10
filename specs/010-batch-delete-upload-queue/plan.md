# Implementation Plan: 批量删除与上传队列

**Branch**: `010-batch-delete-upload-queue` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-batch-delete-upload-queue/spec.md`

## Summary

为图片管理控制台新增两项功能：
1. **批量删除**：在 `ImagesBatchToolbar` 中增加"批量删除"按钮，复用现有选中状态，新增确认弹窗组件（`BatchDeleteDialog`）和批量删除 API 路由（`DELETE /[lang]/console/api/images/batch`）。
2. **上传队列**：将 `/[lang]/console/images/new` 页面的 `ImageUploadForm` 替换为新的 `UploadQueue` 客户端组件，实现文件选择 → 队列展示 → 分批上传（每批 ≤3 张，批间串行）→ 失败重试（上限 3 次）→ Session Storage 状态持久化（按 `parentId` 隔离）的完整流程。

## Technical Context

**Language/Version**: TypeScript 5.x（Next.js App Router）

**Primary Dependencies**:
- Next.js 15（App Router, `use client` / Server Components）
- Drizzle ORM + SQLite（D1 on Cloudflare, local for dev）
- Tailwind CSS（无外部 UI 组件库，与现有组件风格一致）
- Playwright（E2E 测试，已配置）

**Storage**: D1（SQLite，Drizzle ORM） + R2（文件存储，`StorageAdapter` 抽象层）

**Testing**: Playwright E2E（已有 `e2e/` 目录），Vitest 单元测试（已有 `vitest.config.ts`）

**Target Platform**: Cloudflare Workers（open-next）+ 本地开发（Node.js）

**Project Type**: Web application（Next.js App Router，全栈）

**Performance Goals**: 上传批次限速为每批 ≤3 个并发请求，以规避 Cloudflare Free 套餐的 D1/R2 请求频次限制

**Constraints**:
- 单张图片最大 5 MB（现有约束，不变）
- 每次批量操作 ids 上限 500（与现有批量操作一致）
- 批量删除须原子化：R2 文件删除失败不阻断 DB 删除（与现有单图删除逻辑一致，`catch(() => undefined)`）
- Session Storage 仅存序列化数据（不含 `File` 对象）

**Scale/Scope**: 单用户图片管理，无高并发要求

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 检查结果 | 说明 |
|------|---------|------|
| I. 语言规范 | ✅ | 所有文档使用中文，技术标识符保留英文 |
| II. 上下文优先 | ✅ | 已阅读 README（根目录）及相关源码 |
| III. 精准手术式修改 | ✅ | 新增组件/路由，不修改现有逻辑，仅在 `ImagesBatchToolbar` 和 `images/page.tsx` 的 labels 传参处追加字段 |
| IV. 简洁优先 | ✅ | 无新外部依赖，`BatchDeleteDialog` 复用现有弹窗结构，`UploadQueue` 仅需一个新客户端组件替换 `ImageUploadForm` |
| V. 质量门控 | ✅ | 计划含可验证检查点，Phase 1 后包含 contracts 和 quickstart 验证指南 |

**Post-Phase 1 Re-check**: 设计完成后所有原则仍满足，无复杂度违规。

## Complexity Tracking

无宪法违规。新增 API 路由 1 条（`DELETE /[lang]/console/api/images/batch`），新增客户端组件 2 个（`BatchDeleteDialog`、`UploadQueue`），新增 i18n key 若干——均属必要最小范围。

## Project Structure

### Documentation (this feature)

```text
specs/010-batch-delete-upload-queue/
├── plan.md              # 本文件
├── research.md          # Phase 0 研究输出
├── data-model.md        # Phase 1 数据模型
├── quickstart.md        # Phase 1 验证指南
├── contracts/           # Phase 1 接口契约
│   ├── delete-images-batch.md
│   └── upload-queue-session-storage.md
└── tasks.md             # Phase 2 输出（/speckit-tasks 命令生成）
```

### Source Code (repository root)

```text
src/
├── app/[lang]/console/
│   ├── api/images/batch/
│   │   └── route.ts              # 现有文件：新增 DELETE 方法（批量删除）
│   ├── images/
│   │   └── page.tsx              # 现有文件：labels 追加批量删除相关 key
│   └── images/[imageId]/
│       └── page.tsx              # 现有文件：isNew 分支换用 UploadQueue 组件
├── components/
│   ├── BatchDeleteDialog.tsx      # 新增：批量删除确认弹窗
│   ├── UploadQueue.tsx            # 新增：上传队列客户端组件（替换 ImageUploadForm）
│   └── ImagesBatchToolbar.tsx    # 现有文件：追加 batchDelete 按钮和 Dialog
├── locales/
│   ├── en.json                   # 现有文件：追加批量删除和上传队列相关 key
│   └── zh.json                   # 现有文件：追加批量删除和上传队列相关 key
e2e/
└── console-batch-delete.spec.ts  # 新增：批量删除 E2E 测试
```
