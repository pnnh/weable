import { expect, test } from "@playwright/test";

// FR-009：先经开发模拟登录建立会话，再冒烟 /en/console/images（research.md R5）
test("模拟登录后图片页加载成功且列表区域渲染", async ({ page }) => {
    // 会话建立：登录页提交固定测试邮箱（按邮箱匹配或新建用户，幂等）
    await page.goto("/en/account/signin");
    await page.locator("#email").fill("e2e@weable.test");
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL("**/en/console");

    await page.goto("/en/console/images");

    // 页面标题恒渲染
    await expect(page.getByRole("heading", { name: "Images" })).toBeVisible();

    // 列表区域两种呈现均可接受：空状态提示，或工具栏搜索框（T018 细化约定）
    const emptyState = page.getByText("No images yet.");
    const toolbarSearch = page.getByPlaceholder("Search by name…");
    await expect(emptyState.or(toolbarSearch)).toBeVisible();
});
