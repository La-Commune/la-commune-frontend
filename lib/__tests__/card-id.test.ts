import { describe, it, expect } from "vitest";
import { resolveCardId } from "../card-id";

const UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

/**
 * resolveCardId es la frontera entre el escáner de QR y el sellado: si parsea
 * mal, el barista no puede agregar el sello. Cubrimos los formatos reales que
 * un QR (URL completa) o un pegado manual (UUID pelón) pueden producir.
 */
describe("resolveCardId", () => {
  it("UUID pelón → se devuelve igual", () => {
    expect(resolveCardId(UUID)).toBe(UUID);
  });

  it("URL completa de producción → extrae el UUID", () => {
    expect(resolveCardId(`https://lacommune.netlify.app/card/${UUID}`)).toBe(UUID);
  });

  it("URL con query string (?ref=...) → quita el query", () => {
    expect(resolveCardId(`https://lacommune.netlify.app/card/${UUID}?ref=abc`)).toBe(UUID);
  });

  it("URL con hash (#...) → quita el hash", () => {
    expect(resolveCardId(`https://lacommune.netlify.app/card/${UUID}#top`)).toBe(UUID);
  });

  it("URL con query Y hash → quita ambos", () => {
    expect(resolveCardId(`https://x.mx/card/${UUID}?a=1&b=2#frag`)).toBe(UUID);
  });

  it("espacios alrededor (pegado manual) → trim", () => {
    expect(resolveCardId(`  ${UUID}  `)).toBe(UUID);
  });

  it("URL con espacios alrededor → trim + extracción", () => {
    expect(resolveCardId(`  https://x.mx/card/${UUID}  `)).toBe(UUID);
  });

  it("ruta relativa /card/<uuid> → extrae el UUID", () => {
    expect(resolveCardId(`/card/${UUID}`)).toBe(UUID);
  });

  it("dominio localhost de dev → extrae el UUID", () => {
    expect(resolveCardId(`http://localhost:3000/card/${UUID}?x=1`)).toBe(UUID);
  });

  it("string vacío → string vacío (el caller hace early-return)", () => {
    expect(resolveCardId("")).toBe("");
  });

  it("solo espacios → string vacío", () => {
    expect(resolveCardId("   ")).toBe("");
  });

  it("basura sin /card/ → se devuelve la basura trim (el caller no encontrará la tarjeta)", () => {
    expect(resolveCardId("  no-es-una-tarjeta  ")).toBe("no-es-una-tarjeta");
  });

  it("toma el ÚLTIMO /card/ si la URL lo repite (replace greedy)", () => {
    // El regex /^.*\/card\// es greedy: ancla hasta el último /card/
    expect(resolveCardId(`https://x.mx/card/foo/card/${UUID}`)).toBe(UUID);
  });
});
