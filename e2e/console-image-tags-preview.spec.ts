import { expect, test, type Page } from "@playwright/test";

async function devLogin(page: Page, email: string) {
    await page.goto("/en/account/signin");
    await page.locator("#email").fill(email);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL("**/en/console");
}

const minimalPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
);

async function uploadImage(page: Page, name: string): Promise<string> {
    const form = new FormData();
    form.append("file", new Blob([minimalPng], { type: "image/png" }), name);
    const res = await page.request.post("/en/console/api/upload", { multipart: form });
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { ids: string[] };
    return json.ids[0];
}

test("标签在 Title 与 Description 之间，保存后再进页回显规范化结果", async ({ page }) => {
    await devLogin(page, "e2e-tags-save@weable.test");
    const id = await uploadImage(page, "e2e-tags-save.png");
    await page.goto(`/en/console/images/${id}`);

    const title = page.locator('input[name="title"]');
    const tags = page.locator('input[name="tags"]');
    const description = page.locator("textarea[name=description]");
    await expect(title).toBeVisible();
    await expect(tags).toBeVisible();
    const titleBox = await title.boundingBox();
    const tagsBox = await tags.boundingBox();
    const descBox = await description.boundingBox();
    expect(titleBox && tagsBox && descBox).toBeTruthy();
    expect(titleBox!.y).toBeLessThan(tagsBox!.y);
    expect(tagsBox!.y).toBeLessThan(descBox!.y);

    await tags.fill(" a, ,sunset ");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL("**/en/console/images");

    await page.goto(`/en/console/images/${id}`);
    await expect(page.locator('input[name="tags"]')).toHaveValue("a, sunset");
});

test("确认正文含标签；无模型时 AI 禁用、预览可开并 Escape 关闭；new 页无入口", async ({ page }) => {
    await page.addInitScript(() => {
        (window as unknown as { LanguageModel?: unknown }).LanguageModel = {
            availability: async () => "unavailable",
            create: async () => {
                throw new Error("unavailable");
            },
        };
    });
    await devLogin(page, "e2e-tags-preview@weable.test");
    const id = await uploadImage(page, "e2e-tags-preview.png");
    await page.goto(`/zh/console/images/${id}`);

    const ai = page.getByRole("button", { name: "AI 识别" });
    await expect(ai).toBeDisabled();
    const preview = page.getByRole("button", { name: "放大预览" });
    await expect(preview).toBeVisible();
    await page.locator("#image-preview").evaluate((img: HTMLImageElement) => img.decode());
    await expect(preview).toBeEnabled();
    await preview.click();
    await expect(page.getByRole("button", { name: "关闭预览" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "关闭预览" })).toHaveCount(0);

    await page.goto("/en/console/images/new");
    await expect(page.locator('input[name="tags"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Enlarge preview" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "AI recognize" })).toHaveCount(0);
});

test("注入假 LanguageModel 后回填标题、描述与标签且无写请求", async ({ page }) => {
    await page.addInitScript(() => {
        (window as unknown as { LanguageModel: unknown }).LanguageModel = {
            availability: async () => "available",
            create: async () => ({
                prompt: async () =>
                    JSON.stringify({
                        title: "Mock title",
                        description: "Mock desc",
                        tags: ["sky", "ocean"],
                    }),
                destroy() {},
            }),
        };
    });

    await devLogin(page, "e2e-tags-ai@weable.test");
    const id = await uploadImage(page, "e2e-tags-ai.png");

    const writes: string[] = [];
    page.on("request", (req) => {
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method()) && req.url().includes("/console/api/images")) {
            writes.push(`${req.method()} ${req.url()}`);
        }
    });

    await page.goto(`/zh/console/images/${id}`);
    const button = page.getByRole("button", { name: "AI 识别" });
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.getByRole("dialog")).toContainText("标签");
    await page.getByRole("button", { name: "开始识别" }).click();

    await expect(page.locator('input[name="title"]')).toHaveValue("Mock title");
    await expect(page.locator("textarea[name=description]")).toHaveValue("Mock desc");
    await expect(page.locator('input[name="tags"]')).toHaveValue("sky, ocean");
    expect(writes).toEqual([]);
});
