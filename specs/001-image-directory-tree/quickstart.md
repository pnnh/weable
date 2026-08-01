# 快速验证指南：图片目录管理与树形表格展示

**日期**：2026-08-01  
**功能**：001-image-directory-tree  

---

## 前置条件

- 本地开发环境已启动：`pnpm dev`（默认端口 7600）
- 已登录控制台（`http://localhost:7600/zh/console/images`）
- 数据库已运行最新迁移：`pnpm db:migrate`

---

## 场景 1：创建根目录

**目的**：验证 `POST /api/directories` 接口与弹框 UI 正常工作。

1. 访问 `http://localhost:7600/zh/console/images`
2. 点击"新建目录"按钮（位于"上传图片"按钮左侧）
3. 对话框出现，输入名称 `"设计稿"`，描述留空
4. 点击确认

**预期结果**：
- 对话框关闭
- 列表中出现新条目"设计稿"，带文件夹图标
- 数据库验证：`SELECT mime_type, title, parent_id, size FROM images WHERE title='设计稿'` → `mime_type='directory', parent_id=NULL, size=0`

---

## 场景 2：同级重名校验

**目的**：验证应用层唯一性约束。

1. 再次点击"新建目录"，输入名称 `"设计稿"` 并点击确认

**预期结果**：
- 对话框保持打开
- 显示错误提示"该层级已存在同名条目"

---

## 场景 3：树形展开——内联展示子条目

**目的**：验证 `ImagesTreeTable` 客户端组件展开交互。

1. 点击"设计稿"目录条目最左侧的 ▶ 三角图标

**预期结果**：
- 三角图标变为 ▼
- 若目录为空：子条目区域显示空提示（或静默展开）
- 请求 `GET /api/images?parentId={设计稿的ID}` 被触发（可从 Network 面板确认）

---

## 场景 4：点击目录名称进入子级列表

**目的**：验证 URL 参数驱动的页面导航与面包屑。

1. 点击"设计稿"目录的名称文字（非三角图标）

**预期结果**：
- URL 变为 `http://localhost:7600/zh/console/images?parentId={id}`
- 页面顶部显示面包屑：`根目录 > 设计稿`
- 列表仅显示"设计稿"目录下的直接子条目

---

## 场景 5：在子目录下创建嵌套目录

**目的**：验证 `parentId` 自动继承。

1. 在子级列表页（URL 含 `parentId`）点击"新建目录"
2. 输入名称 `"2026年Q1"` 并确认

**预期结果**：
- 新目录出现在子级列表中
- 数据库验证：新记录的 `parent_id` = URL 中的 `parentId` 值

---

## 场景 6：在子目录下上传图片

**目的**：验证 `POST /api/upload` 的 `parentId` 扩展。

1. 在子级列表页点击"上传图片"，选择一个图片文件并上传

**预期结果**：
- 图片出现在当前子级列表中
- 数据库验证：上传记录的 `parent_id` = URL 中的 `parentId` 值

---

## 场景 7：面包屑多级导航

**目的**：验证 `GET /api/images/breadcrumb` 正确返回祖先链。

1. 在"设计稿 > 2026年Q1"子级列表页查看面包屑

**预期结果**：
- 面包屑显示：`根目录 > 设计稿 > 2026年Q1`
- 点击"设计稿"：跳转到 `?parentId={设计稿ID}`，面包屑变为 `根目录 > 设计稿`
- 点击"根目录"：跳转到无 `parentId` 的根列表

---

## 场景 8：无效 parentId 处理

**目的**：验证错误边界。

1. 手动访问 `http://localhost:7600/zh/console/images?parentId=nonexistent123`

**预期结果**：
- 页面显示 404 错误或重定向至根目录列表
- `GET /api/images?parentId=nonexistent123` 返回 `404`

---

## 快速 API 冒烟测试（curl）

```bash
# 假设已获取有效会话 Cookie，BASE=http://localhost:7600

# 1. 创建根目录
curl -X POST $BASE/api/directories \
  -H "Content-Type: application/json" \
  -b "session=..." \
  -d '{"title":"设计稿"}' 
# 期望: 201 {"id":"..."}

# 2. 重名校验
curl -X POST $BASE/api/directories \
  -H "Content-Type: application/json" \
  -b "session=..." \
  -d '{"title":"设计稿"}'
# 期望: 409 {"error":"an entry with this name already exists in the same directory"}

# 3. 获取根目录列表
curl $BASE/api/images -b "session=..."
# 期望: 200 {"items":[{"mimeType":"directory","title":"设计稿",...},...]}

# 4. 面包屑（用上一步返回的 id）
curl "$BASE/api/images/breadcrumb?parentId=<ID>" -b "session=..."
# 期望: 200 {"breadcrumb":[{"id":"<ID>","title":"设计稿"}]}
```

---

## 迁移验证

```bash
# 生成迁移文件（确认包含 parent_id 字段）
pnpm drizzle-kit generate

# 应用迁移
pnpm db:migrate

# 验证字段存在
sqlite3 .data/weable.db ".schema images" | grep parent_id
# 期望输出包含: parent_id TEXT REFERENCES images(id) ON DELETE SET NULL
```
