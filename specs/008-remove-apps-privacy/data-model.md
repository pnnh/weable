# 数据模型：移除小游戏导航与隐私政策页面

**功能**: 008-remove-apps-privacy
**日期**: 2026-08-08

---

## 说明

本次变更为纯删除操作，**不新增任何数据实体**，也不修改任何现有数据模型。以下记录被删除的数据结构，供追溯参考。

---

## 被删除的数据实体

### GameData（`src/data/games.ts` — 整体删除）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 游戏唯一标识符（如 `"atetris"`） |
| `url` | `string` | 游戏外链 URL |
| `coverColor` | `string` | 封面背景 CSS 颜色 |
| `engineLabel` | `string` | 引擎标签（如 `"Cocos Creator"`） |
| `name` | `Record<LangKey, string>` | 多语言游戏名称 |
| `description` | `Record<LangKey, string>` | 多语言描述 |
| `features` | `Record<LangKey, string[]>` | 多语言特性列表 |
| `detail` | `Record<LangKey, string>` | 多语言详细介绍 |
| `tags` | `string[]` | 标签数组 |

**关联类型**: `LangMap = Record<LangKey, string>`、`LangMapArray = Record<LangKey, string[]>` — 均在 `games.ts` 内定义，随文件一并删除。

**数据量**: 4 个游戏实体（Atetris、Breakout、CrazyBlock、Space War）

---

### PrivacyContent（`src/data/privacy.ts` — 整体删除）

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | `string` | 隐私政策标题 |
| `lastUpdated` | `string` | 最后更新时间文本 |
| `intro` | `string` | 引言段落 |
| `sections` | `{ heading: string; body: string }[]` | 各条款章节 |

顶层结构为 `Record<LangKey, PrivacyContent>`，按语言键索引。

---

## i18n 键变更（`src/locales/*.json` — 手术式删除）

以下键从全部 8 个语言文件中删除：

| 键名 | 删除原因 |
|---|---|
| `siteTagline` | 仅 `apps/page.tsx` 使用 |
| `siteDescription` | 无任何文件使用 |
| `playGame` | 仅游戏组件使用 |
| `learnMore` | 仅 `GameCard.tsx` 使用 |
| `backToHome` | 无任何文件使用 |
| `allGames` | 仅 `games/[game]/page.tsx` 使用 |
| `features` | 仅 `games/[game]/page.tsx` 使用 |
| `about` | 仅 `games/[game]/page.tsx` 使用 |
| `engine` | 仅 `games/[game]/page.tsx` 使用 |
| `controls` | 无任何文件使用 |
| `gameDetailTitle` | 仅 `games/[game]/page.tsx` 使用 |
| `apps` | 仅 `SiteHeader.tsx` 和 `apps/page.tsx` 使用 |

**类型影响**: `src/lib/i18n.ts` 使用 `typeof en`（`en.json` 的结构）作为 `LocaleMessages` 类型。删除 `en.json` 中的上述键后，TypeScript 编译器将自动收窄 `keyof LocaleMessages` 联合类型，任何残留引用这些键的代码将产生编译错误，辅助发现遗漏清理点。

---

## 变更后保持不变的数据实体

以下数据结构继续存在，不受本次变更影响：

- 所有频道（Channel）相关数据模型
- 所有图片（Image）相关数据模型
- 用户（User）相关数据模型
- `src/lib/language.ts` 中的 `LangKey` 联合类型
- `src/lib/i18n.ts` 的 `t()` 函数（保留，仅类型范围收窄）
