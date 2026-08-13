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

test("无内置 AI 时编辑页 AI 识别按钮禁用；new 页无工具栏", async ({ page }) => {
    await page.addInitScript(() => {
        (window as unknown as { LanguageModel?: unknown }).LanguageModel = {
            availability: async () => "unavailable",
            create: async () => {
                throw new Error("unavailable");
            },
        };
    });
    await devLogin(page, "e2e-ai-unsupported@weable.test");
    const id = await uploadImage(page, "e2e-ai-unsupported.png");
    await page.goto(`/en/console/images/${id}`);
    const button = page.getByRole("button", { name: "AI recognize" });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
    await expect(button.locator("xpath=..")).toHaveAttribute("title", /Chrome|Edge/);

    await page.goto("/en/console/images/new");
    await expect(page.getByRole("button", { name: "AI recognize" })).toHaveCount(0);
});

test("注入假 LanguageModel 后可确认、改语言回填、失败重试不弹框", async ({ page }) => {
    await page.addInitScript(() => {
        let promptCalls = 0;
        const prompt = async (
            input: Array<{ content: Array<{ type: string; value: unknown }> }>,
        ) => {
            promptCalls += 1;
            const text = String(input[0]?.content.find((c) => c.type === "text")?.value ?? "");
            (window as unknown as { __lastPromptText?: string }).__lastPromptText = text;
            (window as unknown as { __promptCalls?: number }).__promptCalls = promptCalls;
            if (promptCalls === 1) throw new Error("simulated fail");
            return JSON.stringify({ title: "Mock title", description: "Mock desc" });
        };
        (window as unknown as { LanguageModel: unknown }).LanguageModel = {
            availability: async () => "available",
            create: async () => ({ prompt, destroy() {} }),
        };
    });

    await devLogin(page, "e2e-ai-mock@weable.test");
    const id = await uploadImage(page, "e2e-ai-mock.png");

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

    const select = page.getByLabel("输出语言");
    await expect(select).toHaveValue("zh");
    await select.selectOption("en");
    await page.getByRole("button", { name: "开始识别" }).click();

    await expect(button.locator("xpath=..")).toHaveAttribute("title", /失败|识别/);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await button.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator('input[name="title"]')).toHaveValue("Mock title");
    await expect(page.locator("textarea[name=description]")).toHaveValue("Mock desc");
    expect(writes).toEqual([]);

    const promptText = await page.evaluate(() => (window as unknown as { __lastPromptText?: string }).__lastPromptText);
    expect(promptText).toContain("English");
});
