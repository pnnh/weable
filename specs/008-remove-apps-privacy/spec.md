# 功能规格说明：移除小游戏导航与隐私政策页面

**功能分支**: `008-remove-apps-privacy`

**创建时间**: 2026-08-08

**状态**: Draft

**输入**: 移除 `/apps` 小游戏导航页及其关联代码、移除 `/privacy` 隐私政策页及其关联代码；保留被其它功能共用的文件。

---

## 用户场景与测试 *(必填)*

### 用户场景 1 — 移除小游戏导航入口（优先级：P1）

访客访问网站首页时，顶部导航条右侧**不再出现**小游戏应用图标（`IoAppsSharp`）。点击任意页面的标题栏，均无法看到通往 `/apps` 路由的链接。

**优先级原因**：这是对终端用户可见的 UI 变更，直接影响导航体验，须最优先完成。

**独立测试方式**：访问任意语言主页（如 `/zh/`），检查顶部导航条中不存在 Apps 图标链接；直接访问 `/{lang}/apps` 返回 404。

**验收场景**：

1. **Given** 用户打开网站首页，**When** 查看顶部导航，**Then** 不存在任何指向 `/apps` 的图标或链接。
2. **Given** 用户在浏览器地址栏输入 `/{lang}/apps`，**When** 导航，**Then** 返回 404 页面。

---

### 用户场景 2 — 移除游戏相关页面与数据（优先级：P1）

所有游戏组件（`GameGrid`、`GameCard`、`GameCoverPlaceholder`）、游戏数据文件（`data/games.ts`）及游戏详情路由（`/games/[game]`）已从代码库中删除。其它页面功能正常，不受影响。

**优先级原因**：删除孤立的游戏相关代码可减少代码库体积，避免维护负担。

**独立测试方式**：构建产物成功；搜索代码库中 `games`、`GameGrid`、`GameCard` 等标识符不再出现在非删除文件中。

**验收场景**：

1. **Given** 代码库移除游戏相关文件，**When** 执行构建，**Then** 构建成功无错误。
2. **Given** 移除完成，**When** 访问 `/{lang}/games/{game-slug}`，**Then** 返回 404。

---

### 用户场景 3 — 移除隐私政策页面与数据（优先级：P2）

`/privacy` 路由页面及其专属数据文件（`data/privacy.ts`）已删除。访问 `/{lang}/privacy` 返回 404。站点其它页面不受影响。

**优先级原因**：隐私功能为不完整实现，移除后对用户无感知影响（无导航入口）。

**独立测试方式**：访问 `/{lang}/privacy` 返回 404；构建无错误。

**验收场景**：

1. **Given** 移除 privacy 页面后，**When** 访问 `/{lang}/privacy`，**Then** 返回 404。
2. **Given** 其他页面保持不变，**When** 正常使用网站，**Then** 无任何功能降级。

---

### 边界情况

- i18n locale 文件中与 apps/games 功能专属的翻译键（`"apps"`、`"playGame"`、`"learnMore"`、`"allGames"` 等）是否有其他页面引用？若有引用，保留；否则删除。
- `SiteHeader` 中删除 Apps 图标后，样式布局是否异常？需验证导航条视觉完整性。
- `SiteTagline` 等 i18n 键若被其他页面引用则保留，仅在确认无其他引用时才删除。

---

## 需求 *(必填)*

### 功能需求

- **FR-001**：系统必须删除 `src/app/[lang]/apps/page.tsx` 路由页面文件。
- **FR-002**：系统必须删除 `src/app/[lang]/games/[game]/page.tsx` 路由页面文件。
- **FR-003**：系统必须删除 `src/data/games.ts` 游戏数据文件。
- **FR-004**：系统必须删除 `src/components/GameGrid.tsx`、`GameCard.tsx`、`GameCoverPlaceholder.tsx` 及其对应测试文件。
- **FR-005**：系统必须从 `SiteHeader.tsx` 中移除 `IoAppsSharp` 图标导入及 `/apps` 导航链接代码片段，不得删除 `SiteHeader.tsx` 文件本身。
- **FR-006**：系统必须从各语言 locale 文件中移除仅被游戏/apps 功能使用的 i18n 键（`"apps"`、`"playGame"`、`"learnMore"`、`"allGames"`、`"gameDetailTitle"`、`"features"`、`"about"`、`"engine"`），在确认其他页面无引用后执行删除。
- **FR-007**：系统必须删除 `src/app/[lang]/privacy/page.tsx` 路由页面文件。
- **FR-008**：系统必须删除 `src/data/privacy.ts` 隐私数据文件。
- **FR-009**：`SiteHeader.tsx`、`SiteFooter.tsx`、`src/lib/i18n.ts`、`src/lib/language.ts` 等被其它页面共用的文件必须保留，不得删除。
- **FR-010**：移除后，执行项目构建必须无错误、无类型错误。

### 关键实体

- **游戏功能代码集**：`apps/page.tsx`、`games/[game]/page.tsx`、`data/games.ts`、`GameGrid`、`GameCard`、`GameCoverPlaceholder` 及相关测试文件——完全孤立于其它功能，可整体删除。
- **隐私功能代码集**：`privacy/page.tsx`、`data/privacy.ts`——完全孤立，可整体删除。
- **共享导航组件**：`SiteHeader.tsx`——仅需手术式移除 Apps 入口代码片段，文件本身保留。
- **i18n Locale 文件**：8 个语言文件——仅删除游戏/apps 专属键，其余键保留。

---

## 成功标准 *(必填)*

### 可衡量结果

- **SC-001**：网站所有页面的顶部导航条中，不存在任何指向 `/apps` 的链接或图标。
- **SC-002**：直接访问 `/{lang}/apps`、`/{lang}/games/{game}` 或 `/{lang}/privacy` 均返回 404，无法访问已删除页面。
- **SC-003**：移除完成后，项目构建（包括类型检查）100% 通过，无新增错误或警告。
- **SC-004**：代码库中不存在对已删除文件（`games.ts`、`privacy.ts`、`GameGrid`、`GameCard`、`GameCoverPlaceholder`）的任何导入引用。
- **SC-005**：网站其它核心功能页面（首页、控制台、图片、频道、账户等）行为不受本次变更影响。

---

## 假设

- `siteTagline` i18n 键仅被 `apps/page.tsx` 使用，可与其一同删除（需在执行前通过代码搜索确认）。
- 不存在 Cookie 弹窗/同意 UI 组件——已通过代码库搜索确认，`privacy.ts` 文本中仅描述性提及 cookie，无实际组件实现。
- `/privacy` 在 `SiteHeader` 和 `SiteFooter` 中均无导航入口，因此移除路由文件后用户无感知。
- 移除后无需添加重定向规则（旧路由不在站点地图/SEO 索引中）。
- 项目使用 Next.js App Router，删除路由目录即自动停用对应路由。
