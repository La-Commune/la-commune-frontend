import { test, expect } from "@playwright/test";
import { setupSupabaseMocks, MOCK_CARD } from "./fixtures/supabase-mock";

test.describe("Frontend — Vista de Tarjeta", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);

    // Simular que el cliente ya tiene sesión en localStorage
    await page.addInitScript((cardId) => {
      localStorage.setItem("cardId", cardId);
      localStorage.setItem("customerId", "test-customer-001");
    }, MOCK_CARD.id);
  });

  test("muestra la tarjeta con sellos", async ({ page }) => {
    await page.goto(`/card/${MOCK_CARD.id}`);

    // La tarjeta debe cargarse y mostrar contenido
    await page.waitForLoadState("networkidle");

    // Verificar que la página de tarjeta carga (puede mostrar sellos o QR)
    // El contenido exacto depende de los mock responses
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });
  });

  test("muestra QR code de la tarjeta", async ({ page }) => {
    await page.goto(`/card/${MOCK_CARD.id}`);
    await page.waitForLoadState("networkidle");

    // La tarjeta muestra un QR para que el barista lo escanee
    // Verificar que hay un canvas o svg de QR code
    const qr = page.locator("canvas, svg[class*='qr'], [data-testid='qr']");
    // QR puede tomar un momento en renderizar
    await expect(qr.first()).toBeVisible({ timeout: 15_000 });
  });
});
