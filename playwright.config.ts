import { defineConfig, devices } from "@playwright/test";

// E2E 配置：仅桌面 Chrome 单浏览器项目（FR-007），断言为轻量冒烟级（FR-010）
export default defineConfig({
    testDir: "./e2e",
    // 用例仅 2 个，串行执行更稳定（research.md R4）
    fullyParallel: false,
    workers: 1,
    use: {
        baseURL: "http://localhost:7600",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        // 复用已运行的 dev server；未运行时自动拉起，120 秒未就绪则报错退出而非挂起
        command: "pnpm dev",
        url: "http://localhost:7600",
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
