# Contract: 测试命令接口

**面向**: 开发者本地工作流（及未来 CI）。本特性对外暴露的"接口"是 `package.json` 中的测试命令集合，契约定义其输入前提、行为与退出码。

## 命令清单

| 命令 | 执行内容 | 前置条件 | 副作用 |
|------|----------|----------|--------|
| `pnpm test` | `vitest run`（单次运行全部单元/组件用例） | 依赖已安装 | 无（只读源码） |
| `pnpm test:watch` | `vitest`（watch 模式） | 依赖已安装 | 无 |
| `pnpm test:e2e` | `playwright test`（2 个页面冒烟用例） | 依赖已安装；`.data/weable.db` 可用；7600 端口空闲或 dev server 已运行 | 若无运行中的 dev server，由 webServer 拉起 `pnpm dev`；通过 UI 登录会在 `users` 表创建测试邮箱用户行（幂等） |

## 行为契约

### `pnpm test`

- **通过**: 退出码 0；输出包含每个测试文件的通过摘要；覆盖范围 = `src/lib/*.test.ts` + `src/components/*.test.tsx`（当前共 8~10 个文件）。
- **失败**: 退出码非 0；失败用例输出断言差异与文件位置。
- **耗时**: 全量 < 1 分钟（SC-001）。
- **保证**: 不启动网络服务、不触碰数据库与文件系统数据目录。

### `pnpm test:e2e`

- **通过**: 退出码 0；报告仅包含 1 个浏览器项目（chromium，桌面视口）、2 个 spec 文件。
- **失败**:
  - dev server 无法在 120 秒内就绪 → 输出超时错误后以非 0 退出，不挂起；
  - 页面加载或关键元素断言失败 → 非 0 退出并附截图/trace 路径（Playwright 默认产物）。
- **耗时**: 全量 < 2 分钟（SC-003，dev server 已运行时显著更短）。
- **保证**: 不执行数据删除/修改类操作（登录建用户行除外，幂等）；不进行跨页面多步业务流程（FR-010）。

## 用例覆盖契约（与 spec FR-003/FR-004/FR-008/FR-009 对应）

| 测试文件 | 最小断言内容 |
|----------|--------------|
| `src/lib/language.test.ts` | `isValidLang` 合法/非法判定；`getTargetLang` 精确匹配、前缀匹配、无法识别时回退 |
| `src/lib/i18n.test.ts` | `t()` 命中目标语言；缺失 key 回退英文；英文也缺失时回退 key 本身 |
| `SiteFooter.test.tsx` | 渲染站点名称与年份 |
| `GameCoverPlaceholder.test.tsx` | 背景色、引擎标签、aria-label 渲染 |
| `GameGrid.test.tsx` | 按 games 数组数量渲染卡片 |
| `GameCard.test.tsx` | 名称/描述/标签（≤3）渲染、详情链接 href、外链按钮 |
| `MarkdownContent.test.tsx` | markdown 渲染为 HTML；`<script>` 注入被净化 |
| `ImagesPagination.test.tsx` | `total ≤ pageSize` 不渲染；页码窗口与省略号；上/下一页禁用态；点击回调参数；越界 page 收敛 |
| `LanguageSelector.test.tsx`（可选） | 选项列表渲染；切换触发 `router.push` 目标 URL |
| `ImageSearchBar.test.tsx`（可选） | 提交触发 `router.push`，空输入与带关键词两种 URL |
| `e2e/home.spec.ts` | `/en` 加载成功；头部站点名/导航链接、页脚可见 |
| `e2e/console-images.spec.ts` | 模拟登录后 `/en/console/images` 加载成功；列表区域关键元素可见 |

## 排除契约（FR-006）

以下模块**不得**出现测试文件：`src/lib/auth.ts`、`src/lib/storage.ts`、`CreateDirectoryDialog`、`BatchPublishDialog`、`BatchChannelDialog`、`ImageUploadForm`、`ChannelAvatarUpload`、`ImageDeleteSection`、`ChannelDeleteSection`、`ImagesTreeTable`、`ImagesBatchToolbar`、`UserProfileClient`、`ChannelSearch`、`ChannelAvatar`。
