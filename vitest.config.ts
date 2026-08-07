import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// vitest 配置：jsdom 环境承载组件测试；复用 tsconfig 的 @/* 路径别名（research.md R1）
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        // e2e 目录归 Playwright 管辖，避免 vitest 默认 include 误捕获 *.spec.ts
        exclude: ["**/node_modules/**", "**/.git/**", "e2e/**"],
    },
});
