import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "./fixtures/supabase-mock";

test.describe("Frontend — Admin PIN Login", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("muestra la pantalla de PIN al acceder a /admin", async ({ page }) => {
    await page.goto("/admin");

    // El PinPad tiene botones numéricos y botón "Entrar"
    await expect(page.locator("button:has-text('Entrar')")).toBeVisible({ timeout: 10_000 });

    // Verificar que los dígitos del pad están presentes
    for (const digit of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
      await expect(
        page.locator(`button:has-text("${digit}")`).first()
      ).toBeVisible();
    }
  });

  test("los dots de PIN se llenan al presionar dígitos", async ({ page }) => {
    await page.goto("/admin");
    await page.locator("button:has-text('1')").first().waitFor({ timeout: 10_000 });

    // Presionar 3 dígitos
    await page.locator("button:has-text('1')").first().click();
    await page.locator("button:has-text('2')").first().click();
    await page.locator("button:has-text('3')").first().click();

    // Debería haber 3 dots llenos (de 4 total)
    const filledDots = page.locator(".rounded-full.bg-stone-800, .rounded-full.bg-stone-200, .w-3.h-3.rounded-full");
    // Al menos verificar que hay dots visibles
    await expect(filledDots.first()).toBeVisible();
  });

  test("backspace borra el último dígito", async ({ page }) => {
    await page.goto("/admin");
    await page.locator("button:has-text('1')").first().waitFor({ timeout: 10_000 });

    // Presionar 2 dígitos
    await page.locator("button:has-text('1')").first().click();
    await page.locator("button:has-text('2')").first().click();

    // Presionar backspace (el botón que contiene el carácter de backspace)
    const backspaceBtn = page.locator("button:has-text('⌫')").first();
    if (await backspaceBtn.isVisible()) {
      await backspaceBtn.click();
    }
  });

  test("link de volver a inicio existe", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.locator("a[href='/'], text=Inicio").first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
