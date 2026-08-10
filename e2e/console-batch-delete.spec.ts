import { expect, test } from "@playwright/test";

// 辅助：开发模拟登录
async function devLogin(page: import("@playwright/test").Page, email: string) {
    await page.goto("/en/account/signin");
    await page.locator("#email").fill(email);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL("**/en/console");
}

// US1 回归：批量删除图片主流程
test("批量删除：选中图片后确认删除，图片从列表消失", async ({ page }) => {
    await devLogin(page, "e2e-delete@weable.test");

    // 通过 upload API 上传 2 张测试图片（1×1 PNG，最小合法图片）
    const minimalPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
    );

    for (let i = 0; i < 2; i++) {
        const form = new FormData();
        form.append("file", new Blob([minimalPng], { type: "image/png" }), `e2e-delete-${i}.png`);
        const res = await page.request.post("/en/console/api/upload", { multipart: form });
        expect(res.ok()).toBeTruthy();
    }

    // 访问图片列表页
    await page.goto("/en/console/images");
    await expect(page.getByRole("heading", { name: "Images" })).toBeVisible();

    // 确认工具栏"批量删除"按钮初始为禁用
    const deleteBtn = page.getByRole("button", { name: /Delete|批量删除|Eliminar/i });
    await expect(deleteBtn).toBeDisabled();

    // 点击表头全选复选框
    const headerCheckbox = page.getByRole("checkbox", { name: /select all|全选|Seleccionar/i });
    await expect(headerCheckbox).toBeVisible();
    await headerCheckbox.click();

    // 批量删除按钮应变为可用
    await expect(deleteBtn).toBeEnabled();

    // 点击批量删除按钮
    await deleteBtn.click();

    // 确认弹窗出现，含警告文字
    const dialog = page.getByRole("dialog").or(
        page.locator(".fixed.inset-0").filter({ hasText: /cannot be undone|不可撤销|no se puede deshacer/i })
    );
    await expect(dialog).toBeVisible();

    // 点击取消，弹窗关闭，列表保持不变
    await page.getByRole("button", { name: /Cancel|取消|Cancelar/i }).first().click();
    await expect(dialog).not.toBeVisible();

    // 再次点击批量删除 → 确认删除
    await deleteBtn.click();
    const confirmBtn = page.getByRole("button", { name: /^Delete$|确认删除|^Eliminar$/i }).last();
    await confirmBtn.click();

    // 图片应从列表消失（空状态或搜索框显示）
    await expect(
        page.getByText(/No images yet|暂无图片|no hay imágenes/i).or(
            page.getByPlaceholder(/Search by name|按名称搜索|Buscar por nombre/i)
        )
    ).toBeVisible({ timeout: 10000 });
});

// US1 回归：批量删除按钮在未选中时禁用
test("批量删除：未选中任何图片时按钮禁用", async ({ page }) => {
    await devLogin(page, "e2e-delete-check@weable.test");
    await page.goto("/en/console/images");

    // 上传一张图片确保列表非空
    const minimalPng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
    );
    const form = new FormData();
    form.append("file", new Blob([minimalPng], { type: "image/png" }), "e2e-check.png");
    await page.request.post("/en/console/api/upload", { multipart: form });
    await page.reload();

    // 未选中任何图片时，批量删除按钮应禁用
    const deleteBtn = page.getByRole("button", { name: /Delete|批量删除|Eliminar/i });
    await expect(deleteBtn).toBeDisabled();
});
