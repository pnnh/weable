import { expect, test } from "@playwright/test";

// FR-008：/en 首页冒烟——仅限"加载成功 + 关键元素可见"的轻量断言（FR-010）
test("首页加载成功且关键元素可见", async ({ page }) => {
    await page.goto("/en");

    // 头部：站点名称链接与导航链接
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Weable" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Channels" })).toBeVisible();

    // 主区域：页面标题与搜索栏恒渲染（数据依赖的卡片/空态不做校验）
    await expect(page.getByRole("heading", { level: 1, name: "Latest Images" })).toBeVisible();
    await expect(
        page.getByPlaceholder("Search by title or description..."),
    ).toBeVisible();

    // 页脚含站点名称
    await expect(page.getByRole("contentinfo")).toContainText("Weable");
});
