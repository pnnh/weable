# 快速验证指南：移除小游戏导航与隐私政策页面

**功能**: 008-remove-apps-privacy
**日期**: 2026-08-08

---

## 前置条件

- Node.js 环境已就绪，依赖已安装（`npm install`）
- 在仓库根目录 `/home/larry/projects/weable` 下操作
- 参考 [data-model.md](./data-model.md) 了解被删除的数据结构
- 参考 [research.md](./research.md) 了解精确的修改范围

---

## 执行步骤（按顺序）

### 步骤 1：删除游戏功能路由目录

```bash
rm -rf src/app/\[lang\]/apps
rm -rf src/app/\[lang\]/games
```

验证：两个目录已不存在。

### 步骤 2：删除隐私功能路由目录

```bash
rm -rf src/app/\[lang\]/privacy
```

验证：目录已不存在。

### 步骤 3：删除游戏组件及测试文件

```bash
rm src/components/GameGrid.tsx src/components/GameGrid.test.tsx
rm src/components/GameCard.tsx src/components/GameCard.test.tsx
rm src/components/GameCoverPlaceholder.tsx src/components/GameCoverPlaceholder.test.tsx
```

验证：`src/components/` 下无任何以 `Game` 开头的文件。

### 步骤 4：删除数据文件

```bash
rm src/data/games.ts
rm src/data/privacy.ts
```

验证：`src/data/` 下无 `games.ts` 和 `privacy.ts`。

### 步骤 5：手术式修改 SiteHeader.tsx

从 `src/components/SiteHeader.tsx` 中移除：
- 第 5 行：`import { IoAppsSharp } from "react-icons/io5";`
- 第 34-40 行：`/apps` 的 `<Link>` 块（含 `IoAppsSharp` 图标）

参考 [research.md §五](./research.md) 获取精确的代码片段。

### 步骤 6：手术式修改 8 个 locale 文件

从 `src/locales/` 下的全部 8 个 JSON 文件中删除以下键：

```
siteTagline, siteDescription, playGame, learnMore, backToHome,
allGames, features, about, engine, controls, gameDetailTitle, apps
```

参考 [data-model.md §i18n 键变更](./data-model.md) 获取完整键列表。

---

## 验证检查点

### 检查点 A：无残留引用

```bash
# 确认无游戏相关 import
grep -r "from.*games" src/ --include="*.ts" --include="*.tsx"
grep -r "from.*privacy" src/ --include="*.ts" --include="*.tsx"
grep -r "GameGrid\|GameCard\|GameCoverPlaceholder" src/ --include="*.ts" --include="*.tsx"
```

**预期结果**：无任何输出（零匹配）。

### 检查点 B：SiteHeader 无 Apps 引用

```bash
grep -n "IoAppsSharp\|/apps" src/components/SiteHeader.tsx
```

**预期结果**：无任何输出。

### 检查点 C：locale 文件无专属键

```bash
grep -r '"apps"\|"siteTagline"\|"playGame"\|"gameDetailTitle"' src/locales/
```

**预期结果**：无任何输出。

### 检查点 D：TypeScript 类型检查

```bash
npx tsc --noEmit
```

**预期结果**：退出码 0，无错误输出。

### 检查点 E：项目构建

```bash
npm run build
```

**预期结果**：构建成功完成，无错误，无与已删除文件相关的警告。

---

## 功能验证（手动）

启动开发服务器：

```bash
npm run dev
```

| 验证项 | 操作 | 预期结果 |
|---|---|---|
| Apps 图标已移除 | 访问任意页面（如 `/zh/`） | 顶部导航条右侧无 Apps 格子图标 |
| /apps 路由已删除 | 访问 `/zh/apps` | 返回 404 页面 |
| /games 路由已删除 | 访问 `/zh/games/atetris` | 返回 404 页面 |
| /privacy 路由已删除 | 访问 `/zh/privacy` | 返回 404 页面 |
| 其它功能正常 | 访问 `/zh/`、`/zh/channels`、`/zh/console` | 页面正常加载，无错误 |
| 导航布局完整 | 检查所有页面标题栏 | 导航条布局无错位，语言选择器和控制台图标正常显示 |
