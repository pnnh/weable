# 数据模型：图片目录管理与树形表格展示

**日期**：2026-08-01  
**功能**：001-image-directory-tree  

---

## 变更范围

本功能仅修改现有 `images` 表，新增一个可空的自引用字段 `parent_id`。不新增表，不修改其他表。

---

## 实体：images（变更后）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | `text` | PK | Base58 编码的 UUIDv7，由 `createId()` 生成 |
| `user_id` | `text` | NOT NULL, FK → users.id CASCADE DELETE | 所属用户 |
| `channel_id` | `text` | 可空, FK → channels.id SET NULL | 关联频道（目录条目此字段为 NULL） |
| `parent_id` | `text` | **新增**，可空, FK → images.id SET NULL | 父目录 ID；NULL 表示根目录 |
| `title` | `text` | NOT NULL | 图片标题 / 目录名称；同级唯一（应用层约束） |
| `description` | `text` | NOT NULL DEFAULT '' | 描述信息 |
| `filename` | `text` | NOT NULL | 文件名；目录条目设为与 title 相同的值 |
| `mime_type` | `text` | NOT NULL | 图片为标准 MIME（如 `image/jpeg`）；目录固定为 `directory` |
| `width` | `integer` | 可空 | 图片宽度；目录条目为 NULL |
| `height` | `integer` | 可空 | 图片高度；目录条目为 NULL |
| `size` | `integer` | NOT NULL | 文件大小（字节）；目录条目固定为 `0` |
| `is_published` | `integer(boolean)` | NOT NULL DEFAULT false | 发布状态；目录条目无意义，保持 false |
| `created_at` | `integer` | NOT NULL | Unix 毫秒时间戳 |
| `updated_at` | `integer` | NOT NULL | Unix 毫秒时间戳 |

### 目录条目的固定值规则

| 字段 | 值 |
|------|----|
| `mime_type` | `'directory'` |
| `filename` | 与 `title` 相同 |
| `size` | `0` |
| `width` | `NULL` |
| `height` | `NULL` |
| `channel_id` | `NULL` |
| `is_published` | `false` |

---

## 实体关系

```
images (self-referencing)
  id ←─── parent_id (可空，同表自引用)
```

- 一个目录条目可以有 0 到多个子条目（子目录或图片）
- 子条目的 `parent_id` 指向父目录的 `id`
- `parent_id = NULL` 代表根目录层级
- 删除父目录时，子条目的 `parent_id` 设为 NULL（SET NULL），本期不实现目录删除，该行为作为约束提前定义

---

## 唯一性约束规则（应用层）

**规则**：在同一 `(user_id, parent_id)` 组合下，`title` 必须唯一。  
**适用范围**：目录和图片均计入，跨类型也不允许重名。  
**实现方式**：INSERT 前执行计数查询：

```sql
-- 根目录
SELECT COUNT(*) FROM images
WHERE user_id = :userId AND title = :title AND parent_id IS NULL

-- 子目录
SELECT COUNT(*) FROM images  
WHERE user_id = :userId AND title = :title AND parent_id = :parentId
```

若结果 > 0，返回错误，拒绝写入。

---

## 状态转换（目录生命周期）

```
[不存在] ──创建目录──→ [活跃] ──（本期不实现）──→ [已删除]
```

目录创建后无状态变更，本期仅支持创建，不支持重命名、移动、删除。

---

## Drizzle Schema 变更摘要（实现参考）

在 `src/db/schema.ts` 的 `images` 表定义中新增：

```typescript
parentId: text("parent_id").references((): AnySQLiteColumn => images.id, {
  onDelete: "set null",
}),
```

并在 `imagesRelations` 中新增自引用关系（供 Drizzle relational query 使用）：

```typescript
parent: one(images, {
  fields: [images.parentId],
  references: [images.id],
  relationName: "children",
}),
children: many(images, { relationName: "children" }),
```

> 注：`AnySQLiteColumn` 导入自 `drizzle-orm/sqlite-core`，用于解决自引用的循环类型引用问题。
