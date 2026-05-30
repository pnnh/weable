# Weable 改进计划

> 目标：以 huable 项目为参照，将 weable 从纯静态游戏列表门户升级为具备完整 CRUD 功能的**图片管理与发布平台**。
>
> 核心数据结构：**图片（Image）** — 支持上传、管理、Markdown 描述、发布至频道。
>
> 保留现有功能：游戏列表页 (`/[lang]/games/`) 及详情页 (`/[lang]/games/[game]/`) 保持不变。

---

## 阶段 1：基础设施搭建

### 1.1 添加依赖
- [ ] 添加 `drizzle-orm`、`better-sqlite3`（及 `@types/better-sqlite3`）
- [ ] 添加 `drizzle-kit`、`tsx`（dev）
- [ ] 添加 `bs58`、`uuidv7`（用于 ID 生成）
- [ ] 添加 `marked`、`sanitize-html`（及 `@types/sanitize-html`）用于 Markdown 渲染
- [ ] 添加 `react-icons`

### 1.2 数据库 Schema（`src/db/schema.ts`）
- [ ] 创建 `users` 表：`id`(text PK), `name`, `email`(unique), `nickname`, `bio`, `created_at`
- [ ] 创建 `channels` 表：`id`(text PK), `user_id`(FK→users), `name`, `description`, `is_public`, `created_at`
- [ ] 创建 `images` 表：`id`(text PK), `user_id`(FK→users), `channel_id`(FK→channels, nullable), `title`, `description`(Markdown), `filename`, `mime_type`, `width`(int, nullable), `height`(int, nullable), `size`(int), `is_published`, `created_at`, `updated_at`
- [ ] 定义 Drizzle relations
- [ ] 导出 `createId()` 工具函数（UUIDv7 → Base58）

> 与 huable 不同：huable 核心是 `notes`+`note_attachments`；weable 核心是 `images`（图片本身即内容，附带可选的 Markdown 描述）。

### 1.3 数据库连接（`src/db/index.ts`）
- [ ] 实现 `getDb()`：开发环境使用 better-sqlite3 (`.data/weable.db`)，生产环境使用 D1

### 1.4 数据库迁移
- [ ] 创建 `migrations/0000_initial.sql`（users, channels, images）
- [ ] 创建 `migrations/0001_user_profile.sql`（添加 nickname, bio 字段）
- [ ] 创建 `src/db/migrate.ts` 脚本
- [ ] 在 `package.json` 添加 `"db:migrate": "tsx src/db/migrate.ts"` script

### 1.5 Drizzle 配置（`drizzle.config.ts`）
- [ ] 创建 drizzle.config.ts（schema 路径、migrations 输出目录、dialect: sqlite）

### 1.6 Wrangler 配置更新（`wrangler.jsonc`）
- [ ] 添加 D1 数据库绑定（`binding: "DB"`, `database_name: "weable-db"`）
- [ ] 添加 R2 存储桶绑定（`binding: "IMAGES_BUCKET"`, `bucket_name: "weable-images"`）

### 1.7 环境变量
- [ ] 创建 `.env.local.example`：`DB_PATH`, `IMAGE_STORAGE_PATH`, `DEV_USER_ID`, `DEV_USER_NAME`

---

## 阶段 2：认证与存储

### 2.1 认证模块（`src/lib/auth.ts`）
- [ ] 实现 `getCurrentUser()`：开发环境读取 cookie `user_id`，回退到 DEV_USER 环境变量
- [ ] 自动确保 user 行存在于数据库

### 2.2 文件存储模块（`src/lib/storage.ts`）
- [ ] 定义 `StorageAdapter` 接口（`save`, `read`, `delete`）
- [ ] 实现 `LocalStorageAdapter`（开发环境，基于本地文件系统）
- [ ] 实现 `R2StorageAdapter`（生产环境）
- [ ] 导出 `getStorage()` 工厂函数
- [ ] 路径安全校验（防止路径遍历）

---

## 阶段 3：API 路由

### 3.1 图片上传（`src/app/api/upload/route.ts`）
- [ ] POST：接收图片文件，校验 MIME 类型（仅图片），存储到 storage，写入 `images` 表
- [ ] 返回新图片 ID

### 3.2 图片服务（`src/app/api/images/[imageId]/file/route.ts`）
- [ ] GET：从 storage 读取图片文件，返回正确的 Content-Type

### 3.3 图片 CRUD（`src/app/api/images/[imageId]/route.ts`）
- [ ] PATCH：更新 title/description/channelId/isPublished
- [ ] DELETE：删除图片记录和存储文件

### 3.4 频道 CRUD（`src/app/api/channels/[channelId]/route.ts`）
- [ ] DELETE：删除频道（需检查无已发布图片关联）

### 3.5 频道头像（`src/app/api/channel/avatar/[channelId]/route.ts`）
- [ ] GET：提供频道头像图片
- [ ] POST：上传频道头像

### 3.6 用户头像（`src/app/api/user/avatar/route.ts` + `[userId]/route.ts`）
- [ ] POST：上传用户头像
- [ ] GET：提供用户头像

### 3.7 用户资料（`src/app/api/user/profile/route.ts`）
- [ ] PATCH：更新 nickname / bio

---

## 阶段 4：Console（管理后台）页面

### 4.1 Console 入口
- [ ] `src/app/console/page.tsx`：无语言前缀的 `/console` 重定向
- [ ] `src/app/[lang]/console/page.tsx`：仪表盘（显示频道数、图片数、快速链接）

### 4.2 频道管理
- [ ] `src/app/[lang]/console/channels/page.tsx`：频道列表页（表格 + 新建按钮）
- [ ] `src/app/[lang]/console/channels/[channelId]/page.tsx`：频道编辑页（名称、描述、公开/私有、头像上传、删除操作）

### 4.3 图片管理
- [ ] `src/app/[lang]/console/images/page.tsx`：图片列表页（缩略图表格 + 上传按钮）
- [ ] `src/app/[lang]/console/images/[imageId]/page.tsx`：图片编辑页（标题、Markdown 描述、选择频道、发布/草稿状态）
- [ ] `src/app/[lang]/console/images/upload/page.tsx`：图片上传页（支持多图批量上传）

### 4.4 用户资料
- [ ] `src/app/[lang]/console/profile/page.tsx`：编辑昵称、简介、头像

---

## 阶段 5：公共浏览页面

### 5.1 首页改造（`src/app/[lang]/page.tsx`）
- [ ] 保留现有游戏列表作为页面的一个区块
- [ ] 新增"最新公开图片"区块（分页 + 搜索），展示已发布到公开频道的图片

### 5.2 公共频道列表（`src/app/[lang]/channels/page.tsx`）
- [ ] 展示所有公开频道（分页 + 搜索）
- [ ] 每个频道显示头像、名称、描述、图片数量

### 5.3 频道详情（`src/app/[lang]/channels/[id]/page.tsx`）
- [ ] 展示频道信息 + 该频道下所有已发布图片（图片网格 + 分页）

### 5.4 图片详情（`src/app/[lang]/images/[id]/page.tsx`）
- [ ] 展示图片大图 + 标题 + Markdown 描述 + 所属频道链接 + 发布时间

---

## 阶段 6：组件

### 6.1 新组件
- [ ] `ChannelAvatar.tsx`：频道头像（含首字母回退）
- [ ] `ChannelAvatarUpload.tsx`：频道头像上传小部件
- [ ] `ChannelSearch.tsx`：搜索输入组件（更新 URL ?q= 参数）
- [ ] `ChannelDeleteSection.tsx`：频道删除确认区域
- [ ] `ImageDeleteSection.tsx`：图片删除确认区域
- [ ] `ImageCard.tsx`：图片卡片（缩略图 + 标题）
- [ ] `ImageGrid.tsx`：图片网格布局
- [ ] `MarkdownContent.tsx`：Markdown 渲染组件
- [ ] `UserProfileClient.tsx`：用户资料编辑表单（客户端组件）
- [ ] `RemoveFromChannelButton.tsx`：从频道移除图片按钮
- [ ] `CookieBanner.tsx`：更新 domain 为 `.weable.xyz`

### 6.2 保留组件
- [ ] `GameCard.tsx`、`GameGrid.tsx`、`GameCoverPlaceholder.tsx`：保持不变
- [ ] `SiteHeader.tsx`：添加"Console"导航入口
- [ ] `SiteFooter.tsx`、`LanguageSelector.tsx`：保持不变

---

## 阶段 7：国际化

### 7.1 更新 locale 文件
- [ ] 为所有 8 种语言添加新的翻译 key：
  - console, welcomeUser, channels, images, manageChannels, manageImages
  - newChannel, editChannel, channelName, channelDescription, channelVisibility, channelPublic, channelPrivate, makeChannelPublic
  - noChannelsYet, deleteChannel, deleteChannelConfirm, deleteChannelHasImages
  - newImage, editImage, imageTitle, imageDescription, imageChannel, imageStatus, imagePublished, imageDraft
  - noImagesYet, deleteImage, deleteImageConfirm, noChannel, removeFromChannel
  - avatar, uploadAvatar, avatarHint
  - nickname, username, bio, profileTitle, saveProfile, profileSaved
  - noteTitle → imageTitle 等对应替换
  - search, noResults, page, of
  - save, cancel, updated, created

---

## 阶段 8：隐私政策与 Cookie

### 8.1 隐私政策
- [ ] 添加 `src/data/privacy.ts`（8 种语言）
- [ ] 添加 `src/app/[lang]/privacy/page.tsx`

### 8.2 Cookie Banner
- [ ] 确保 CookieBanner 组件已存在并在 layout 中引用

---

## 阶段 9：部署配置

### 9.1 README 更新
- [ ] 重写 README.md，描述完整功能、数据库 schema、开发步骤、部署步骤

### 9.2 Cloudflare 资源创建文档
- [ ] 记录 D1 数据库创建命令
- [ ] 记录 R2 存储桶创建命令
- [ ] 记录 migration 应用命令

---

## 依赖关系

```
阶段 1（基础设施）
  └── 阶段 2（认证 & 存储）
        └── 阶段 3（API 路由）
              └── 阶段 4（Console 页面）
              └── 阶段 5（公共页面）
        └── 阶段 6（组件）—— 被阶段 4、5 引用
阶段 7（国际化）—— 可与阶段 4-6 并行，但需在 UI 完成前就绪
阶段 8（隐私 & Cookie）—— 独立，可随时执行
阶段 9（部署配置）—— 最后执行
```

---

## 注意事项

1. **核心差异**：huable 的核心是"笔记"（纯文本/Markdown），附件作为辅助；weable 的核心是"图片"（文件即内容），Markdown 描述作为辅助。
2. **存储策略**：图片文件存储在 R2（生产）/ 本地文件系统（开发），数据库只存元数据。
3. **游戏列表**：现有的 `/[lang]/games/` 功能完全保留，不受影响。
4. **URL 结构**：公共图片页面使用 `/[lang]/images/[id]`，频道使用 `/[lang]/channels/[id]`。
5. **Console 路径**：管理后台统一在 `/[lang]/console/` 下，与 huable 保持一致。
