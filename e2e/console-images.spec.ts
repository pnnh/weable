import { expect, test } from "@playwright/test";

// 辅助：开发模拟登录，幂等建立会话 cookie
async function devLogin(page: import("@playwright/test").Page, email = "e2e@weable.test") {
    await page.goto("/en/account/signin");
    await page.locator("#email").fill(email);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL("**/en/console");
}

// FR-009：先经开发模拟登录建立会话，再冒烟 /en/console/images（research.md R5）
test("模拟登录后图片页加载成功且列表区域渲染", async ({ page }) => {
    // 会话建立：登录页提交固定测试邮箱（按邮箱匹配或新建用户，幂等）
    await devLogin(page);

    await page.goto("/en/console/images");

    // 页面标题恒渲染
    await expect(page.getByRole("heading", { name: "Images" })).toBeVisible();

    // 列表区域两种呈现均可接受：空状态提示，或工具栏搜索框（T018 细化约定）
    const emptyState = page.getByText("No images yet.");
    const toolbarSearch = page.getByPlaceholder("Search by name…");
    await expect(emptyState.or(toolbarSearch)).toBeVisible();
});

// 问题2 回归：点击目录条目后 URL 应含 parentId 且页面内容应切换为子目录视图
test("images 页点击目录后导航到子目录视图", async ({ page }) => {
    await devLogin(page, "e2e-dir@weable.test");

    // 创建根目录
    const createDir = async (parentId: string | null, title: string): Promise<string> => {
        const body: Record<string, string | null> = { title, description: "" };
        if (parentId) body.parentId = parentId;
        const res = await page.request.post("/en/console/api/directories", {
            data: body,
        });
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        return json.id as string;
    };

    // 创建目录结构：根目录 → 子目录
    const rootDirId = await createDir(null, "e2e-root-dir");
    const childDirId = await createDir(rootDirId, "e2e-child-dir");

    // 访问图片列表页（根目录级别）
    await page.goto("/en/console/images");
    await expect(page.getByRole("heading", { name: "Images" })).toBeVisible();

    // 定位根目录链接并点击
    const dirLink = page.getByRole("link", { name: "e2e-root-dir" });
    await expect(dirLink).toBeVisible();
    await dirLink.click();

    // 等待 URL 变化：应包含 parentId 参数
    await page.waitForURL(`**/en/console/images?parentId=${rootDirId}`);

    // 子目录视图应渲染：页面标题仍为 Images，且子目录条目可见
    await expect(page.getByRole("heading", { name: "Images" })).toBeVisible();
    const childLink = page.getByRole("link", { name: "e2e-child-dir" });
    await expect(childLink).toBeVisible();

    // 导航链接 href 需包含子目录的 parentId，确认层级正确
    const expectedHref = `/en/console/images?parentId=${childDirId}`;
    await expect(childLink).toHaveAttribute("href", expectedHref);
});
