# Data Model: 项目测试体系建设

**结论：本特性不涉及任何新增或变更的持久化数据实体。**

- 测试框架配置（`vitest.config.ts`、`playwright.config.ts`、`vitest.setup.ts`）为静态代码配置文件，无数据模式。
- 不新增数据库表/迁移；不修改 `src/db/schema.ts`。
- E2E 用例复用现有 `users` 表：模拟登录时由既有 `signIn` Server Action 按邮箱查找或创建用户行（见 `specs/005-dev-signin-signout` 数据模型），测试本身不直接读写数据库。
- 无状态机、无实体关系需要建模。

因此本文件仅记录 N/A 结论，不展开实体定义。
