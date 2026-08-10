# Quickstart & Validation Guide: 批量删除与上传队列

**Feature**: `010-batch-delete-upload-queue`
**Date**: 2026-08-10

## 前提条件

- 已安装 pnpm
- 开发服务器运行于 `http://localhost:7600`（`pnpm dev`）
- E2E 测试需 Playwright 浏览器已安装（`pnpm exec playwright install chromium`）

---

## 场景 1：批量删除图片

### 手动验证步骤

1. 访问 `http://localhost:7600/en/account/signin`，输入任意邮箱（如 `test@test.com`）并登录
2. 访问 `http://localhost:7600/en/console/images/new`，选择 2–3 张本地图片，点击"开始上传"完成上传
3. 访问 `http://localhost:7600/en/console/images`，确认图片出现在列表中
4. 勾选 1 张或多张图片的复选框
5. **验证**：工具栏"批量删除"按钮由禁用变为可点击
6. 点击"批量删除"
7. **验证**：出现确认弹窗，弹窗内含警告文字"此操作不可撤销"和选中数量
8. 点击"取消"
9. **验证**：弹窗关闭，图片列表和选中状态不变
10. 再次点击"批量删除" → 点击"确认删除"
11. **验证**：所选图片从列表消失，选中状态清空，无需手动刷新

### 验证服务端删除

```bash
# 使用列表 API 验证图片已从 DB 删除（需替换为实际 imageId）
curl -b "user_id=YOUR_USER_ID" http://localhost:7600/en/console/api/images/IMAGE_ID
# 期望返回 404
```

### E2E 测试运行

```bash
pnpm exec playwright test e2e/console-batch-delete.spec.ts
```

**期望结果**：所有用例通过，无超时。

---

## 场景 2：上传队列 — 文件选择与展示

### 手动验证步骤

1. 访问 `http://localhost:7600/en/console/images/new`（登录后）
2. 点击"选择图片"按钮，选择 5 张不同图片
3. **验证**：
   - 页面出现队列表格，包含 5 行
   - 每行显示：复选框（默认勾选）、文件名、文件大小（KB/MB）、修改时间、"待上传"状态
   - 表头复选框显示为全选状态
4. 再次点击"选择图片"，选择与步骤 2 中同名的 1 张图片
5. **验证**：页面顶部出现提示"已跳过 1 个队列中的同名文件"，队列仍为 5 行
6. 选择 1 张超过 5 MB 的文件
7. **验证**：该文件出现在队列，但状态显示"文件过大"，复选框禁用

---

## 场景 3：上传队列 — 分批上传与状态更新

### 手动验证步骤（需 DevTools Network 面板）

1. 准备 6 张图片（< 5 MB 各）
2. 选择全部 6 张，确认全部选中
3. 打开浏览器 DevTools → Network 面板
4. 点击"开始上传"
5. **验证（关键）**：
   - 按钮立即变为禁用/"上传中…"
   - Network 面板中前 3 个上传请求（`/console/api/upload`）同时发出
   - 前 3 个请求完成后，后 3 个请求才开始
   - 总共 6 个请求，分 2 批，批间无重叠
6. 上传完成后：
   - 所有成功行状态显示"成功"，复选框禁用
   - "开始上传"按钮恢复可用

---

## 场景 4：失败重试与上限

### 手动模拟失败（开发环境）

在 `src/app/[lang]/console/api/upload/route.ts` 临时注入错误，或通过 DevTools → Network → 阻断请求，模拟上传失败：

1. 选择 1 张图片，点击"开始上传"，使其失败
2. **验证**：状态显示"失败（1 次）"，鼠标悬停时显示错误详情
3. 重新勾选该文件，点击"开始上传"，再次失败
4. **验证**：状态显示"失败（2 次）"
5. 第 3 次失败后：
   - **验证**：状态显示"失败（3 次）"，复选框变为禁用
   - 表头全选无法再选中该行

---

## 场景 5：Session Storage 状态恢复

1. 按场景 3 完成部分上传（如 3 张成功，3 张未上传）
2. 刷新页面（F5）
3. **验证**：
   - 成功的 3 行：状态"成功"，复选框禁用
   - 未上传的 3 行：状态"需重新选择"，复选框禁用
4. 再次选择同名的 3 张文件
5. **验证**：对应行关联文件，状态恢复为"待上传"，复选框变为可选

---

## 场景 6：多语言路由

```bash
# 中文界面
open http://localhost:7600/zh/console/images
open http://localhost:7600/zh/console/images/new

# 西班牙语界面
open http://localhost:7600/es/console/images
```

**验证**：批量删除按钮、上传队列标签、状态文字均以对应语言显示。

---

## 回归测试

确保本 feature 不破坏现有功能：

```bash
# 运行全部 E2E 测试
pnpm exec playwright test

# 运行 Vitest 单元测试
pnpm test

# TypeScript 类型检查
pnpm exec tsc --noEmit
```

**关键检查点**：
- `e2e/console-images.spec.ts` 所有用例仍通过（图片列表、目录导航）
- `e2e/console-auth.spec.ts` 所有用例仍通过（未登录重定向）
- 现有批量发布状态和批量设置频道功能正常（工具栏新增按钮不影响现有按钮）

---

## 接口契约参考

- 批量删除 API：[contracts/delete-images-batch.md](./contracts/delete-images-batch.md)
- 上传队列存储协议：[contracts/upload-queue-session-storage.md](./contracts/upload-queue-session-storage.md)
- 数据模型：[data-model.md](./data-model.md)
