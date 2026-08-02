# Phase 1 数据模型：控制台图片批量上传与树形列表优化

## 1. 领域实体

### 1.1 图片记录（Image）

说明：复用现有 `images` 表中的非目录记录（`mime_type` 以 `image/` 开头）。

关键字段：

- `id: string`
- `userId: string`
- `parentId: string | null`
- `title: string`
- `filename: string`
- `mimeType: string`
- `size: number`
- `createdAt: number`
- `updatedAt: number`

校验规则：

- `mimeType` 必须是图片类型。
- `size` 必须 `<= 5 * 1024 * 1024`（5 MB）。
- 写入时 `parentId` 必须为空或指向当前用户可访问的目录节点。

### 1.2 上传批次（UploadBatch）

说明：本期新增的业务抽象，用于表达“一次上传动作”。该实体为流程实体，不要求新增数据库表。

关键字段：

- `files: UploadFile[]`（1~50）
- `targetParentId: string | null`
- `status: "idle" | "validating" | "uploading" | "succeeded" | "failed"`
- `errorMessage?: string`

子结构 `UploadFile`：

- `name: string`
- `mimeType: string`
- `size: number`

校验规则：

- `files.length` 必须在 `1..50`。
- 任一 `UploadFile.size > 5MB` 时批次不可提交。
- 任一 `UploadFile` 不是图片类型时批次不可提交。

### 1.3 列表节点（TreeRowNode）

说明：树形表格行视图模型，可表示目录或图片。

关键字段：

- `id: string`
- `type: "directory" | "image"`
- `depth: number`（根层为 0）
- `expandable: boolean`
- `expanded: boolean`
- `childrenState: "idle" | "loading" | "loaded" | "error"`
- `parentId: string | null`

展示规则：

- 左侧展开控件区域固定占位，不随 `expanded` 状态改变宽高。
- 子节点相对父节点按统一步长缩进（`depth` 驱动）。

### 1.4 目录上下文（DirectoryContext）

说明：用于保证上传前后停留在同一目录层级。

关键字段：

- `lang: string`
- `parentId: string | null`
- `listUrl: string`（`/{lang}/console/images` 或 `/{lang}/console/images?parentId=...`）

约束：

- `parentId` 存在时必须与当前用户目录可见性匹配。

## 2. 关系模型

- 一个 `UploadBatch` 产生多条 `Image` 记录。
- 一个 `DirectoryContext` 对应一个上传入口与一个上传后返回目标。
- 一个 `TreeRowNode` 可递归拥有多个子 `TreeRowNode`（目录场景）。

## 3. 状态迁移

### 3.1 上传批次状态迁移

1. `idle -> validating`：用户点击上传。
2. `validating -> failed`：数量或大小或类型不符合规则。
3. `validating -> uploading`：规则通过，开始请求上传。
4. `uploading -> succeeded`：服务端成功返回，跳回当前目录列表。
5. `uploading -> failed`：服务端报错或网络异常。

### 3.2 树节点展开状态迁移

1. `idle -> loading`：首次展开目录。
2. `loading -> loaded`：加载子节点成功。
3. `loading -> error`：加载失败。
4. `loaded` 下 `expanded` 在 `true/false` 之间切换，不改变占位宽高规则。
