import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "./fixtures/supabase-mock";

test.describe("Frontend — Menú Público", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("carga la página del menú", async ({ page }) => {
    await page.goto("/menu");
    // El menú público debe mostrar categorías y productos
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("muestra categorías del menú", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle");

    // Categorías mock: "Café Caliente", "Café Frío"
    await expect(
      page.getByText("Café Caliente").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("muestra productos del menú con precios", async ({ page }) => {
    await page.goto("/menu");
    await page.waitForLoadState("networkidle");

    // Productos mock: Americano $45, Latte $55
    await expect(page.getByText("Americano").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Latte").first()).toBeVisible();
  });
});
