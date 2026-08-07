// 注册 jest-dom 自定义断言（toBeVisible、toBeDisabled 等），全部测试文件生效（research.md R2）
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 每个用例后卸载渲染产物，避免跨用例 DOM 残留导致查询命中多个元素
afterEach(() => {
    cleanup();
});
