import { describe, it, expect } from "vitest";
import { promoApplies } from "../promo-match";

/**
 * promoApplies decide qué items del menú muestran el badge de una promo.
 * Clava el comportamiento ACTUAL, incluido el quirk direccional del
 * `appliesTo.includes(nombre)` (ver lib/promo-match.ts y RESUMEN).
 */
describe("promoApplies", () => {
  it("appliesTo vacío/undefined/null → aplica a TODO", () => {
    expect(promoApplies(undefined, "Latte", "Bebidas")).toBe(true);
    expect(promoApplies(null, "Latte", "Bebidas")).toBe(true);
    expect(promoApplies("", "Latte", "Bebidas")).toBe(true);
  });

  it("match por nombre de item contenido en appliesTo (case-insensitive)", () => {
    expect(promoApplies("Lattes", "Latte", "Bebidas")).toBe(true); // "latte" ⊂ "lattes"
    expect(promoApplies("LATTE", "latte", "Bebidas")).toBe(true);
    expect(promoApplies("Lattes y Espresso", "Latte", "Bebidas")).toBe(true);
  });

  it("match por título de sección contenido en appliesTo", () => {
    expect(promoApplies("Bebidas Calientes", "Café X", "Bebidas")).toBe(true); // "bebidas" ⊂ "bebidas calientes"
  });

  it("no matchea cuando ni item ni sección están contenidos en appliesTo", () => {
    expect(promoApplies("Postres", "Latte", "Bebidas")).toBe(false);
  });

  it("QUIRK DIRECCIONAL: appliesTo amplio NO matchea item específico más largo", () => {
    // "café".includes("café americano") === false → la promo "Café" NO badgea
    // el item "Café Americano". Contraintuitivo; documentado para David.
    expect(promoApplies("Café", "Café Americano", "Bebidas")).toBe(false);
    expect(promoApplies("Latte", "Latte Vainilla Grande", "Bebidas")).toBe(false);
  });

  it("el quirk se evita si el item se nombra completo dentro de appliesTo", () => {
    // Con appliesTo="Café Americano, Latte" el item "Café Americano" sí matchea
    expect(promoApplies("Café Americano, Latte", "Café Americano", "Bebidas")).toBe(true);
  });
});
