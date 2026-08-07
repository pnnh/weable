# Feature Specification: 项目测试体系建设（单元测试、组件测试与 E2E 冒烟测试）

**Feature Branch**: `006-test-suite-setup`

**Created**: 2026-08-07

**Status**: Draft

**Input**: User description: "为当前项目配置 vitest 用以单元测试和组件测试，并为 src/components 和 src/lib 目录下源码实现测试用例。注意需要事先分析代码复杂度，仅对依赖关系简单、容易进行单元测试和组件测试的代码编写用例。若需要复杂 mock 等情况不要编写。然后为项目配置 playwright 框架用以实现 e2e 测试。并为 /en 首页和 /en/console/images 页面实现 e2e 用例。仅仅验证页面能够正确加载，关键元素能正确渲染即可，不必进行太复杂校验以免用例执行时间过久。注意 e2e 用例仅需要支持桌面 Chrome 浏览器即可，不必验证多平台多浏览器以免用例太复杂执行时间过久。"

## 背景与复杂度分析结论

本特性在规划前已对 `src/components` 与 `src/lib` 全部源码完成复杂度分析，结论如下（作为用例覆盖范围的决策依据）：

**适合测试（依赖简单、纯输入→输出或纯 props→渲染）**：

- `src/lib/language.ts`：语言常量、`getTargetLang`、`isValidLang`，纯函数无外部依赖
- `src/lib/i18n.ts`：`t()` 文案查找函数，仅依赖静态 locale JSON，含回退逻辑
- `src/components/SiteFooter.tsx`：纯 props 渲染
- `src/components/GameCoverPlaceholder.tsx`：纯 props 渲染
- `src/components/GameGrid.tsx`：纯 props 列表渲染
- `src/components/GameCard.tsx`：纯 props 渲染（含链接结构）
- `src/components/MarkdownContent.tsx`：纯函数式 markdown 渲染与内容净化
- `src/components/ImagesPagination.tsx`：纯 props 渲染 + 回调，含页码窗口计算逻辑
- `src/components/LanguageSelector.tsx`、`src/components/ImageSearchBar.tsx`：仅依赖路由跳转能力，可用轻量路由桩替代

**不适合本次测试（依赖复杂，需要数据库、文件系统、服务端会话、网络请求或复杂交互状态，mock 成本高）**：

- `src/lib/auth.ts`（依赖服务端会话头/cookie 与数据库）、`src/lib/storage.ts`（依赖文件系统）
- 弹窗与表单类组件（`CreateDirectoryDialog`、`BatchPublishDialog`、`BatchChannelDialog`、`ImageUploadForm`、`ChannelAvatarUpload`）、删除类组件（`ImageDeleteSection`、`ChannelDeleteSection`，依赖服务端操作）、`ImagesTreeTable`（331 行复合交互）、`ImagesBatchToolbar`、`UserProfileClient`、`ChannelSearch`、`ChannelAvatar`（依赖运行时图片加载与 DOM 兜底逻辑）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 开发者快速验证低复杂度模块的正确性 (Priority: P1)

开发者在修改 `src/lib` 与 `src/components` 中的代码后，能够在本地一条命令运行单元测试与组件测试，快速获得通过/失败反馈，确认低复杂度模块的行为未被破坏。

**Why this priority**: 单元测试是回归防护的最小成本单元，覆盖范围内模块均为纯逻辑/纯渲染代码，投入产出比最高，且不依赖任何运行时环境。

**Independent Test**: 在本地执行单元测试命令，全部已列明的低复杂度模块用例通过，即交付了独立可用的价值。

**Acceptance Scenarios**:

1. **Given** 开发者位于项目根目录，**When** 执行单元测试命令，**Then** `language`、`i18n` 两个库模块及 8 个已列明组件的测试用例全部通过并输出结果摘要
2. **Given** 某组件的行为被错误修改，**When** 执行单元测试命令，**Then** 对应用例失败并指明失败位置
3. **Given** 组件测试涉及用户交互（如点击分页按钮），**When** 执行测试，**Then** 能够在模拟 DOM 环境中完成渲染与交互断言

---

### User Story 2 - 通过 E2E 冒烟测试确认关键页面可用 (Priority: P2)

开发者或验证者在本地一条命令运行端到端测试，确认 `/en` 首页与 `/en/console/images` 页面能够正确加载、关键元素正确渲染，作为发布前的快速冒烟检查。

**Why this priority**: E2E 验证真实运行环境下的页面可用性，价值高但依赖完整应用启动，成本高于单元测试，故排在 P1 之后。

**Independent Test**: 在应用本地运行的前提下执行 E2E 命令，两个目标页面用例通过即交付独立价值。

**Acceptance Scenarios**:

1. **Given** 应用已在本地运行，**When** 执行 E2E 测试命令，**Then** `/en` 首页加载成功且页面头部导航、站点名称、页脚等关键元素可见
2. **Given** 测试已事先建立开发模拟登录会话，**When** 访问 `/en/console/images`，**Then** 页面加载成功且图片列表区域（表头/空状态或数据行）正确渲染
3. **Given** E2E 配置已限定浏览器范围，**When** 执行 E2E 测试，**Then** 仅在桌面 Chrome 单一浏览器上运行，不启动其他浏览器或设备模拟

---

### User Story 3 - 测试入口融入项目日常工作流 (Priority: P3)

开发者无需记忆框架细节，通过项目脚本（如 `package.json` 命令）即可分别运行单元/组件测试与 E2E 测试；测试相关配置与产物不影响生产构建与部署。

**Why this priority**: 降低使用门槛、保证测试设施与既有构建流程互不干扰，是体验完善项。

**Independent Test**: 执行项目脚本中的测试命令可正常运行；执行生产构建命令不编译、不打包任何测试代码。

**Acceptance Scenarios**:

1. **Given** 新加入的开发者克隆项目并安装依赖，**When** 执行文档/脚本中给出的测试命令，**Then** 无需额外手工配置即可运行全部测试
2. **Given** 测试代码与配置已就位，**When** 执行生产构建，**Then** 构建成功且产物不包含测试代码

---

### Edge Cases

- `/en/console/images` 在未登录状态下访问会因无法解析当前用户而报错：E2E 用例 MUST 在访问前通过既有开发模拟登录流程建立会话，而非断言未登录行为
- 组件依赖路由跳转能力（`LanguageSelector`、`ImageSearchBar`）：组件测试使用轻量路由桩替代，不启动真实路由；若桩成本超出"轻量"范畴则该组件降级为不覆盖
- `t()` 传入不存在于目标语言 locale 的 key：用例需验证回退到英文文案、再回退到 key 本身的行为
- `getTargetLang` 传入无法识别的语言串：用例需验证回退到给定兜底语言
- `MarkdownContent` 传入含恶意脚本标签的 markdown：用例需验证脚本内容被净化、不会出现在渲染结果中
- `ImagesPagination` 在 `total ≤ pageSize` 时不渲染任何内容、页码越界时收敛到合法范围：均需覆盖
- E2E 运行时应用尚未启动或端口被占用：命令应给出可理解的失败信息而非长时间挂起（通过合理超时控制）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 项目 MUST 提供单元测试与组件测试能力（用户指定 vitest），支持 TypeScript、路径别名与 JSX/TSX
- **FR-002**: 组件测试 MUST 在模拟 DOM 环境中运行，能够渲染组件并断言输出与交互
- **FR-003**: 单元测试 MUST 覆盖 `src/lib/language.ts` 与 `src/lib/i18n.ts` 的核心行为（语言匹配、合法性校验、文案查找与回退）
- **FR-004**: 组件测试 MUST 覆盖以下组件：`SiteFooter`、`GameCoverPlaceholder`、`GameGrid`、`GameCard`、`MarkdownContent`、`ImagesPagination`
- **FR-005**: 组件测试 MAY 覆盖 `LanguageSelector` 与 `ImageSearchBar`，前提是仅需轻量路由桩；若需更复杂 mock 则 MUST 放弃覆盖并在用例目录中说明
- **FR-006**: 项目 MUST NOT 为复杂度分析结论中"不适合测试"清单内的模块编写测试用例；MUST NOT 引入数据库、文件系统、网络请求等复杂 mock
- **FR-007**: 项目 MUST 提供 E2E 测试能力（用户指定 Playwright），且浏览器配置 MUST 仅包含桌面 Chrome 一个项目
- **FR-008**: E2E 用例 MUST 覆盖 `/en` 首页：验证页面加载成功、站点头部导航与页脚关键元素可见
- **FR-009**: E2E 用例 MUST 覆盖 `/en/console/images`：先建立开发模拟登录会话，再验证页面加载成功与图片列表区域关键元素渲染
- **FR-010**: E2E 断言 MUST 限定为"加载成功 + 关键元素渲染"级别的轻量校验；MUST NOT 包含数据增删改、多步交互或跨页面流程
- **FR-011**: `package.json` MUST 提供独立命令分别运行单元/组件测试与 E2E 测试
- **FR-012**: 测试代码、测试配置与测试依赖 MUST NOT 影响生产构建与部署产物

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 开发者在本地执行一次单元/组件测试，全部用例通过且总耗时不超过 1 分钟
- **SC-002**: FR-003/FR-004 列明的每个模块至少拥有 1 个正向用例，整体用例通过率 100%
- **SC-003**: 完整 E2E 套件（2 个页面用例）在本地执行总耗时不超过 2 分钟
- **SC-004**: 故意破坏任一被覆盖模块的预期行为后，对应测试在单次运行内即可暴露失败（回归防护有效性 100%）
- **SC-005**: 生产构建命令在测试设施就位后依然成功，且构建产物的页面清单（路由列表）与测试设施就位前完全一致

## Assumptions

- 本地开发环境可直接运行应用（E2E 依赖本地启动的 Web 服务与既有 SQLite 数据库 `.data/weable.db`）
- E2E 建立登录会话复用现有开发模拟登录入口（登录页提交邮箱即可），不需要新增测试专用后门
- 组件测试的 DOM 环境使用框架社区标准方案（jsdom 或等价物），无需真实浏览器
- 本次不设定覆盖率百分比门槛，覆盖范围以复杂度分析结论为准
- 本次不接入 CI/CD 系统，仅保证本地命令可运行；命令设计预留未来 CI 复用能力
- 多浏览器、多视口、移动端模拟均在范围之外
- 测试用例与配置文档使用简体中文，技术标识符保留英文
