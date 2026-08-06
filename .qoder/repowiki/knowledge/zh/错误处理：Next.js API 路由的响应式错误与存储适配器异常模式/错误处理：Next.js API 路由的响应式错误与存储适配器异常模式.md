---
kind: error_handling
name: 错误处理：Next.js API 路由的响应式错误与存储适配器异常模式
category: error_handling
scope:
    - '**'
source_files:
    - src/app/api/directories/route.ts
    - src/app/api/upload/route.ts
    - src/app/api/images/route.ts
    - src/lib/auth.ts
    - src/lib/storage.ts
---

该仓库采用基于 Next.js App Router 的 RESTful API 错误处理模式，结合库层的异常抛出与 try/catch 捕获，形成分层错误处理体系。

**错误返回格式统一**：所有 API 路由在参数校验失败、业务规则违反或资源不存在时，均通过 `NextResponse.json({ error: "..." }, { status: ... })` 返回结构化错误对象，HTTP 状态码遵循 REST 约定（400 参数错误、404 未找到、409 冲突）。

**输入验证集中化**：API 层对请求体进行显式校验，如 `directories/route.ts` 中对 title/description 的长度限制、非法字符检查；`upload/route.ts` 中对文件数量、MIME 类型、大小限制的统一校验。解析 JSON 时使用 try/catch 包裹并返回 400 错误。

**库层异常策略**：`src/lib/auth.ts` 中的 `getCurrentUser()` 在无法解析认证信息时直接 `throw new Error(...)`，由调用方决定如何处理；`src/lib/storage.ts` 中的 `LocalStorageAdapter` 和 `R2StorageAdapter` 对 ENOENT 等特定错误进行静默处理（返回 null），其他异常向上抛出。

**路径安全校验**：`storage.ts` 中的 `assertSafeSegment()` 函数对所有用户可控的路径片段进行白名单校验，防止目录遍历攻击，违规时抛出通用 Error。

**无全局错误中间件**：未发现统一的错误处理中间件或全局异常处理器，每个 API 路由独立处理自身错误，错误传播依赖调用链逐层向上。

**无自定义错误类型**：项目未定义专门的错误类或错误码枚举，错误信息以字符串形式直接嵌入响应体中。

**数据库层无显式错误处理**：Drizzle ORM 查询结果通过条件判断处理（如 parent 不存在时返回 404），而非捕获异常。