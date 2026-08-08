# 研究报告：移除小游戏导航与隐私政策页面

**功能**: 008-remove-apps-privacy
**日期**: 2026-08-08

---

## 一、i18n 键使用情况（精确验证）

通过全代码库搜索，确认以下键的唯一使用位置：

| i18n 键 | 使用文件 | 是否可删除 |
|---|---|---|
| `siteTagline` | `src/app/[lang]/apps/page.tsx` L36（仅此处） | ✅ 可删除 |
| `siteDescription` | **无任何 .ts/.tsx 文件引用** | ✅ 可删除 |
| `playGame` | `GameCard.tsx` L63、`games/[game]/page.tsx` L81/L135 | ✅ 可删除 |
| `learnMore` | `GameCard.tsx` L55（仅此处） | ✅ 可删除 |
| `allGames` | `games/[game]/page.tsx` L49（仅此处） | ✅ 可删除 |
| `features` | `games/[game]/page.tsx` L107（仅此处） | ✅ 可删除 |
| `about` | `games/[game]/page.tsx` L122（仅此处） | ✅ 可删除 |
| `engine` | `games/[game]/page.tsx` L71（仅此处） | ✅ 可删除 |
| `gameDetailTitle` | `games/[game]/page.tsx` L25（仅此处） | ✅ 可删除 |
| `controls` | **无任何 .ts/.tsx 文件引用** | ✅ 可删除 |
| `apps` | `SiteHeader.tsx` L36、`apps/page.tsx` L18 | ✅ 可删除 |
| `backToHome` | **无任何文件使用** | ✅ 可删除 |

**决策**: 以上 12 个 i18n 键全部可从 8 个 locale 文件中删除。

---

## 二、Cookie 同意组件验证

**决策**: 不存在 Cookie 弹窗/同意 UI 组件。

**依据**: 全代码库搜索 `cookie`, `consent`, `banner`, `CookieBanner` 等关键词，均无匹配的 React 组件文件。`src/data/privacy.ts` 文件文本中仅描述性提及 `cookie-consent` cookie 名称，无任何实际 UI 实现。

**结论**: 移除 `privacy` 功能仅需删除路由页和数据文件，无需处理 Cookie UI。

---

## 三、路由入口验证

**`/apps` 路由入口**:
- `SiteHeader.tsx` L34-40：存在 `IoAppsSharp` 图标链接，**需手术式移除**
- `SiteFooter.tsx`：**无** `/apps` 链接
- 无 sitemap.ts / robots.ts 文件

**`/privacy` 路由入口**:
- `SiteHeader.tsx`：**无** `/privacy` 链接
- `SiteFooter.tsx`：**无** `/privacy` 链接
- 无任何导航入口指向该路由

**决策**: `/privacy` 路由在整个站点中无任何入口，用户无法从 UI 到达该页面，移除后用户完全无感知。

---

## 四、文件依赖关系图（完整验证）

```
apps/page.tsx
  └── @/data/games (games.ts)     → 仅此处引用
  └── @/components/GameGrid       → 仅此处引用
      └── @/data/games (GameData 类型) → 仅 GameGrid 和 games/[game]/page 引用
      └── @/components/GameCard   → 仅 GameGrid 引用
          └── @/data/games (GameData 类型)
          └── @/components/GameCoverPlaceholder → 仅 GameCard 和 games/[game]/page 引用

games/[game]/page.tsx
  └── @/data/games                → 同上
  └── @/components/GameCoverPlaceholder → 同上

privacy/page.tsx
  └── @/data/privacy              → 仅此处引用
```

**结论**: 所有游戏组件和数据文件形成一个完全孤立的依赖岛，与其它功能零共用。

---

## 五、`SiteHeader.tsx` 手术式修改范围

需移除的精确代码（`src/components/SiteHeader.tsx`）：

**第 5 行** — 删除整行：
```ts
import { IoAppsSharp } from "react-icons/io5";
```

**第 34-40 行** — 删除整块（注意保留前后标签结构完整性）：
```tsx
<Link
    href={`/${lang}/apps`}
    title={t(lang, "apps")}
    className="text-gray-500 hover:text-gray-900 transition-colors"
>
    <IoAppsSharp size={20} />
</Link>
```

修改后 `<div className="flex items-center gap-3">` 内仅剩：`LanguageSelector` + `BiSolidUserRectangle` console 链接，布局完整。

---

## 六、Next.js App Router 路由删除机制

**决策**: 直接删除路由目录即可停用对应路由，无需额外配置。

**依据**: Next.js App Router 通过文件系统路由，`src/app/[lang]/apps/` 目录下的 `page.tsx` 被删除后，该路由自动停止存在，访问时返回 404（由 Next.js 默认 not-found 处理）。同理适用于 `games/[game]/` 和 `privacy/`。

---

## 七、所有 NEEDS CLARIFICATION 已解决

无遗留疑问。所有键的使用情况、文件依赖关系、修改范围均已通过代码搜索精确确认。
