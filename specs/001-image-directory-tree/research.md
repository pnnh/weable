# 研究报告：图片目录管理与树形表格展示

**日期**：2026-08-01  
**功能**：001-image-directory-tree  

---

## 研究条目 1：Drizzle 0.45.2 SQLite 自引用外键

**决策**：使用 `references(() => images.id, { onDelete: "set null" })` 在 `images` 表中定义 `parent_id` 自引用外键，这与现有代码中 `channelId` 引用 `channels.id` 的写法完全一致，无需额外适配。

**理由**：Drizzle sqlite-core 在 0.x 系列已稳定支持自引用 FK 延迟解析（使用箭头函数 `() => images.id`），`drizzle-kit` 生成迁移时会正确处理。

**已考虑的替代方案**：  
- 新建 `directories` 表 —— 拒绝：增加 JOIN 复杂度，与需求"复用 images 表"冲突。  
- 不设 FK，纯应用层约束 —— 拒绝：失去数据完整性保护。

---

## 研究条目 2：D1 自引用 FK 实际约束行为

**决策**：在应用层做所有关键约束校验（重名检测、合法 `parentId` 存在性校验），不依赖 D1 的外键自动强制执行。

**理由**：Cloudflare D1 基于 SQLite，默认 `foreign_keys = OFF`，`@opennextjs/cloudflare` 不自动开启。在 `better-sqlite3`（开发环境）中 FK 可选开启，但两环境行为不一致。应用层校验可跨环境统一。

**已考虑的替代方案**：  
- 在迁移 SQL 中添加 `PRAGMA foreign_keys = ON` —— D1 不支持在迁移中持久化 PRAGMA，每次连接需重新设置，不可靠。

---

## 研究条目 3：树形展开/折叠与 Next.js App Router 的集成模式

**决策**：  
- `page.tsx` 保持 Server Component，负责读取 `searchParams.parentId`，查询当前层级初始数据（含面包屑祖先链），以 props 下发给 Client Component。  
- 新建 `ImagesTreeTable` Client Component（`"use client"`），持有展开状态 Map，按需调用 `GET /api/images?parentId=xxx` 懒加载子节点。  
- 展开/折叠状态仅在 React state 中，刷新后重置。

**理由**：符合 Next.js App Router 推荐的"Server Component 获取初始数据，Client Component 处理交互"模式；避免将整个页面客户端化，保留 SSR 优势。

**已考虑的替代方案**：  
- 全页面 Client Component —— 拒绝：失去 SSR，首屏数据需额外 fetch。  
- 展开时 router.push 跳转 —— 拒绝：与"内联展开"需求不符；点击目录名才跳转。

---

## 研究条目 4：SQLite NULL 唯一性与同层重名约束

**决策**：不依赖数据库唯一索引实现同级唯一名称约束，改用应用层在 INSERT 前执行 `SELECT` 计数校验：
- 根目录：`WHERE title = ? AND parent_id IS NULL AND user_id = ?`  
- 子目录：`WHERE title = ? AND parent_id = ? AND user_id = ?`

**理由**：SQLite 的唯一索引中 `NULL` 值被视为互不相等（即可以有多行 `parent_id=NULL, title='foo'`），无法用简单唯一索引覆盖根目录场景。应用层校验是跨 SQLite/D1 均可用的最简解法。

**已考虑的替代方案**：  
- 使用 `COALESCE(parent_id, '')` 创建唯一索引 —— 技术可行，但 Drizzle 表达式索引支持有限，增加迁移复杂度，且跨环境兼容性需验证，YAGNI。

---

## 研究条目 5：面包屑祖先链查询

**决策**：使用服务端迭代循环，从 `parentId` 出发逐级向上查询父节点，最多查询 20 次（防止意外环形引用导致无限循环），构建祖先路径数组。

**理由**：Drizzle 0.45.2 没有内置 CTE/递归查询的高层封装；直接写 `db.run(sql\`WITH RECURSIVE...\`)` 需要绕过类型系统，增加维护负担。实际目录深度预期不超过 5 层，迭代查询（最多 5 次 DB 调用）完全可接受。

**已考虑的替代方案**：  
- 手写递归 CTE SQL —— 拒绝：代码可维护性差，类型不安全，过度设计。  
- 存储完整路径字符串（Materialized Path）—— 拒绝：额外字段与更新逻辑增加复杂度，本期目录不支持移动，优化无意义。

---

## 研究条目 6：目录创建 API 路由放置位置

**决策**：新增 `POST /api/directories` 独立路由，而非复用 `POST /api/upload`。

**理由**：`/api/upload` 处理文件二进制流，目录创建无需文件，逻辑差异大；分开路由符合"精准手术式修改"原则，避免污染已有上传逻辑。

---

## 总结：无未解决的 NEEDS CLARIFICATION

所有研究条目均已得到明确结论，可进入 Phase 1 设计阶段。
