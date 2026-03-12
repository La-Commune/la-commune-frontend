import { test, expect } from "@playwright/test";

test.describe("Frontend — Landing Page", () => {
  test("carga la landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("La Commune")).toBeVisible({ timeout: 10_000 });
  });

  test("tiene link al programa de fidelidad / onboarding", async ({ page }) => {
    await page.goto("/");
    // La landing debe tener un CTA para unirse al programa
    const ctaLink = page.locator("a[href*='onboarding'], a[href*='card'], button:has-text('tarjeta'), button:has-text('unirse'), button:has-text('fidelidad')").first();
    await expect(ctaLink).toBeVisible({ timeout: 10_000 });
  });

  test("tiene link al menú", async ({ page }) => {
    await page.goto("/");
    const menuLink = page.locator("a[href*='menu'], button:has-text('Menú'), a:has-text('Menú')").first();
    await expect(menuLink).toBeVisible({ timeout: 10_000 });
  });

  test("tiene navegación consistente", async ({ page }) => {
    await page.goto("/");
    // Nav debería existir
    await expect(page.locator("nav").first()).toBeVisible({ timeout: 10_000 });
  });
});
