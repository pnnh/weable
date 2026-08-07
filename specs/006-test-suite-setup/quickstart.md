# Quickstart: 测试设施验证指南

**前提**: Node ≥ 20、pnpm 10.33+；仓库根目录执行；`.data/weable.db` 已存在（`pnpm db:migrate` 可初始化）。

## 1. 安装测试依赖（实现阶段一次性）

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

## 2. 单元/组件测试验证（对应 SC-001、SC-002、SC-004）

```bash
pnpm test
```

**预期结果**：

1. 退出码 0，总耗时 < 1 分钟
2. 输出中可见每个测试文件通过：`src/lib/language.test.ts`、`src/lib/i18n.test.ts`、`src/components/{SiteFooter,GameCoverPlaceholder,GameGrid,GameCard,MarkdownContent,ImagesPagination}.test.tsx`（可选另含 `LanguageSelector.test.tsx`、`ImageSearchBar.test.tsx`）
3. 无任何针对 [排除契约](./contracts/test-commands.md) 清单模块的测试文件被执行

**回归防护验证（SC-004 抽检）**：

1. 临时修改 `src/lib/i18n.ts` 的 `t()` 返回固定字符串
2. 重跑 `pnpm test`，确认 `i18n.test.ts` 失败且退出码非 0
3. 还原修改，重跑确认恢复全绿

## 3. E2E 冒烟测试验证（对应 SC-003、FR-007~FR-010）

推荐先手动启动 dev server（复用可显著缩短执行时间）：

```bash
pnpm dev          # 终端 A，等待 http://localhost:7600 就绪
pnpm test:e2e     # 终端 B
```

**预期结果**：

1. 退出码 0，总耗时 < 2 分钟
2. 报告仅含 1 个浏览器项目 `chromium`、2 个 spec：`home.spec.ts`、`console-images.spec.ts`，不出现 firefox/webkit/移动设备项目
3. `home.spec.ts`：`/en` 加载成功，头部站点名称与导航链接、页脚均可见
4. `console-images.spec.ts`：经 `/en/account/signin` 提交测试邮箱登录后跳转 `/en/console`，随后 `/en/console/images` 加载成功且列表区域关键元素可见

**异常场景验证**：在未启动 dev server 且 7600 被占用的环境执行 `pnpm test:e2e`，应在 webServer 超时后输出明确错误并以非 0 退出，而非无限挂起。

## 4. 生产构建隔离验证（对应 SC-005、FR-012）

```bash
pnpm build
```

**预期结果**：

1. 构建成功（含类型检查，e2e 与 `*.test.*` 文件不引起错误）
2. `.next` 产物页面清单与测试设施就位前一致，无测试代码进入打包结果
3. `pnpm start` 下访问 `/en/account/signin` 返回 404（既有行为不受影响，仅确认回归）

## 参考

- 命令契约与退出码语义：[contracts/test-commands.md](./contracts/test-commands.md)
- 数据影响说明：[data-model.md](./data-model.md)（本特性无数据模式变更）
- 技术决策与备选项：[research.md](./research.md)
