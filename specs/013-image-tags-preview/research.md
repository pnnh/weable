# Research: 图片标签与全屏预览

**Feature**: `013-image-tags-preview`
**Date**: 2026-08-13

## R1：标签持久化——`images.tags` 文本列 vs 独立标签表

**Decision**: 在 `images` 上新增 `tags text not null default ''`。库内存储规范化后的英文逗号分隔字符串（项之间 `", "`）。不建标签表、不做多对多、不加索引（本期不按标签搜索）。

**Rationale**:
- 规格把标签定义为「编辑与展示时表现为英文逗号分隔的字符串」。
- 上传 `insert` 与目录 `insert` 不传该列时，DB 默认 `''`，历史行迁移后同样为空。
- 独立表会引入关联查询与维护成本，超出「编辑页读写」范围。

**Alternatives considered**:
- JSON 数组列：SQLite 可存，但表单与 AI 往返都要多一层序列化，和规格「字符串」不一致。
- 独立 `image_tags` 表：利于筛选，规格明确本期不做列表/公开筛选。

---

## R2：规范化规则与长度保护

**Decision**: 抽出纯函数 `normalizeTags(raw: string): string`（`src/lib/imageTags.ts`）：

1. 按英文逗号 `,` 拆分（不按中文顿号 / 分号拆）。
2. 每项 `trim`；空段丢弃。
3. 不做大小写合并、不去重、不改词序。
4. 用 `", "` 重新拼接。
5. 若整串超过 **500** 字符：尽量在不超过 500 的最后一个 `", "` 处截断；找不到则硬截到 500。

AI 路径另用 `tagsFromRecognition(raw: unknown): string`：接受 `string[]` 或逗号字符串；先按上式规范化，再 **最多保留前 8 项**。缺省 / 非数组非字符串 → `''`。

**Rationale**:
- 规格 FR-004：去空白、丢空段；8 个上限只约束 AI。
- 500 与「标题约 80、描述一段」同类：防止超长串撑爆表单，又不引入新的校验错误 UI（现网保存失败靠 throw）。
- Server Action 与 AI 回填共用同一函数，避免两边规则漂移。

**Alternatives considered**:
- 超长拒绝并提示：要新错误态，切口大于截断。
- 人工也限 8 个：规格已否决。

---

## R3：AI 输出契约——`tags` 数组 vs 逗号字符串

**Decision**: `prompt()` 的 `responseConstraint` 改为：

```ts
{
  type: "object",
  additionalProperties: false,
  required: ["title", "description"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
}
```

`tags` **不**放进 `required`。解析时：有则规范化并截到 8 个；无则当空。标题仍为空则整次失败，不写三项。

提示词追加：用目标语言给出不超过 8 个短标签；不要编号或 #。

**Rationale**:
- 011 已用 structured output，数组比让模型自己拼逗号更稳。
- 不把 `tags` 设为 required，避免旧模型偶发缺键导致整次失败（规格允许空标签）。
- 解析侧兼容字符串，防止模型仍输出 `"a, b"`。

**Alternatives considered**:
- `tags` 必填：空标签图会误失败。
- 第二次 prompt 只要标签：多一轮，更容易超时。

---

## R4：全屏预览组件选型

**Decision**: 接入 `yet-another-react-lightbox-lite`。

用法（客户端）：

```tsx
import Lightbox from "yet-another-react-lightbox-lite";
import "yet-another-react-lightbox-lite/styles.css";

const [previewIndex, setPreviewIndex] = useState<number | undefined>();
<Lightbox
  slides={[{ src: imageSrc, alt: title }]}
  index={previewIndex}
  setIndex={setPreviewIndex}
  labels={{ Close: labels.imagePreviewClose }}
  controller={{ closeOnBackdropClick: true, closeOnEscape: true }}
/>
```

打开：`setPreviewIndex(0)`。关闭：库默认工具栏关闭按钮、点遮罩、Escape（`setIndex(undefined)`）。单图不需要 Previous / Next。

**Rationale**:
- 规格要求社区口碑较好、体积轻、支持缩放 / 拖动 / 点击关闭，且避免重型画廊。
- Lite：约 5 kB gzip、无运行时依赖、React 18+、内置滚轮 / 捏合 / 双击 / 键盘缩放与放大后拖动；`closeOnBackdropClick` / `closeOnEscape` 默认 true。
- 与下载量很高的 `yet-another-react-lightbox` 同作者；主库明确支持 React 19。本期单图用不到主库的视频 / 缩略图插件。
- 预览 `src` 用当前 `#image-preview` 的同源地址，不把图发到第三方。

**Alternatives considered**:

| 方案 | 不选原因 |
|------|----------|
| `yet-another-react-lightbox` + Zoom 插件 | 功能完整但偏画廊，体积大于需求 |
| `react-photo-view` | 缩放拖动好，但更偏相册、默认交互更重 |
| PhotoSwipe | 画廊向，集成与体积都超过单图预览 |
| 自研遮罩 + 滚轮缩放 | 手势 / 无障碍 / Escape 成本高，违反简洁优先 |

**Next.js 注意**：不要为控制台文件路由换成 `next/image`（需登录 cookie，且无公开尺寸变体）。默认 `<img>` 即可。CSS 在 `"use client"` 组件内 import，由打包器打进客户端包，Workers 运行时不读 node_modules CSS。

---

## R5：工具栏布局与图标

**Decision**: 工具栏改为从左到右：`放大预览` → `AI 识别`。预览图标从已安装的 `react-icons/tb` 选 `TbZoomIn`（放大查看）。`aria-label` / `title` 走新 i18n key `imagePreview`。

预览按钮：
- `type="button"`，永不 submit。
- 不随识别状态禁用（FR-014）。
- `#image-preview` 不存在或 `naturalWidth === 0` 时禁用，`title` 用 `imagePreviewUnavailable`。

**Rationale**:
- 规格明确预览在 AI 左侧；011「工具栏只放 AI」已被 013 覆盖。
- 不新引入图标包。

**Alternatives considered**:
- 点击缩略图打开预览：规格假设入口以工具栏为准，本期不做。
- `TbMaximize`：更像窗口最大化，语义略偏。

---

## R6：保存路径——只改编辑页 Server Action

**Decision**: `handleSave` 读取 `formData.get("tags")`，经 `normalizeTags` 后与 `title` / `description` 一并 `update`。不改 `PATCH /console/api/images/[imageId]`、不改上传 / 目录 insert。

**Rationale**:
- 编辑页保存走 Server Action，不走 PATCH。
- 宪法「精准手术式修改」：PATCH 扩字段没有调用方。
- insert 省略 `tags` 时 DB 默认 `''`。

**Alternatives considered**:
- 同步改 PATCH：无编辑页调用方，扩大回归面。

---

## R7：i18n

**Decision**: 六份 locale（`en` / `es` / `fr` / `ja` / `zh` / `zh-TW`）同步：

| key | 用途 |
|-----|------|
| `imageTags` | 标签字段 label |
| `imagePreview` | 预览按钮 aria-label / 就绪 title |
| `imagePreviewClose` | Lightbox `labels.Close` |
| `imagePreviewUnavailable` | 图片未就绪时预览按钮 title |
| `aiRecognizeConfirmBody` | **改写**：成功将覆盖标题、描述与标签，且不自动保存 |

**Rationale**:
- 012 已恢复 6 语；漏译会半翻译。
- 确认正文是用户理解「标签会被覆盖」的唯一入口（FR-007）。

**Alternatives considered**:
- 只改 zh / en：违反 012 与宪法语言列表。

---

## R8：测试策略

**Decision**:
- 单元：`normalizeTags` / `tagsFromRecognition`（空段、截断 8 个、500 字符、缺 tags）。
- `parseRecognitionResult`：有 tags / 无 tags / 空标题不写 tags。
- 组件：标题与描述之间有标签框；AI 成功覆盖三项；失败不改标签；预览按钮在 AI 左侧；无 `LanguageModel` 时预览仍可点（有图时）；点预览后出现 Lightbox 门户。
- E2E：填标签保存再进页回显；确认文案含标签；默认 Chromium 无模型时预览仍开得开；注入假 API 后三项回填且无写请求。

**Rationale**: 与 011 同一套 Vitest + Playwright；CI 仍不依赖真模型。

**Alternatives considered**:
- 只靠 E2E 测规范化：边界多，单测更便宜。
