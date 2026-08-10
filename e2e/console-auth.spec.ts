import { expect, test } from "@playwright/test";

// 问题1 回归：未登录访问 /en/console 应重定向到登录页，而非抛异常
test("未登录访问 /en/console 重定向到 signin 页", async ({ page }) => {
    // 确保无会话 cookie（清除所有 cookies 后访问）
    await page.context().clearCookies();
    const response = await page.goto("/en/console");

    // 最终落地页应为 signin
    await expect(page).toHaveURL(/\/en\/account\/signin/);

    // HTTP 状态码应为 200（重定向已完成）
    expect(response?.status()).toBe(200);

    // 登录页标题可见
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

// 问题1 回归：未登录访问 /zh/console 应重定向到 /zh/account/signin（多语言路由）
test("未登录访问 /zh/console 重定向到 zh signin 页", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/zh/console");

    await expect(page).toHaveURL(/\/zh\/account\/signin/);
});
