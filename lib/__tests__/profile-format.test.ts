import { describe, it, expect } from "vitest";
import { maskPhone, getTierLevel, formatMonthYear } from "../profile-format";

describe("maskPhone", () => {
  it("enmascara dejando los últimos 4 dígitos", () => {
    expect(maskPhone("7711234567")).toBe("****4567");
  });
  it("teléfono de exactamente 4 → enmascara los 4 (devuelve ****+los 4)", () => {
    expect(maskPhone("4567")).toBe("****4567");
  });
  it("teléfono de menos de 4 dígitos → se devuelve tal cual (no enmascara)", () => {
    expect(maskPhone("123")).toBe("123");
    expect(maskPhone("")).toBe("");
  });
});

describe("getTierLevel — fronteras de visitas", () => {
  it("0–4 visitas → Nuevo", () => {
    expect(getTierLevel(0).name).toBe("Nuevo");
    expect(getTierLevel(4).name).toBe("Nuevo");
  });
  it("frontera exacta de 5 → Regular (no Nuevo)", () => {
    expect(getTierLevel(5).name).toBe("Regular");
  });
  it("5–14 → Regular", () => {
    expect(getTierLevel(14).name).toBe("Regular");
  });
  it("frontera exacta de 15 → Frecuente", () => {
    expect(getTierLevel(15).name).toBe("Frecuente");
  });
  it("15–29 → Frecuente", () => {
    expect(getTierLevel(29).name).toBe("Frecuente");
  });
  it("frontera exacta de 30 → VIP", () => {
    expect(getTierLevel(30).name).toBe("VIP");
  });
  it("muchas visitas → VIP", () => {
    expect(getTierLevel(500).name).toBe("VIP");
  });
  it("cada tier trae su color", () => {
    expect(getTierLevel(0).color).toBe("blue");
    expect(getTierLevel(5).color).toBe("amber");
    expect(getTierLevel(15).color).toBe("emerald");
    expect(getTierLevel(30).color).toBe("purple");
  });
});

describe("formatMonthYear", () => {
  it("Date → 'mes año' en español", () => {
    expect(formatMonthYear(new Date(2026, 5, 15))).toBe("junio 2026"); // mes 5 = junio
  });
  it("string ISO → mismo formato", () => {
    expect(formatMonthYear("2026-01-03T00:00:00")).toBe("enero 2026");
  });
  it("undefined/vacío → string vacío", () => {
    expect(formatMonthYear(undefined)).toBe("");
    expect(formatMonthYear("")).toBe("");
  });
  it("diciembre (mes 11, último del array)", () => {
    expect(formatMonthYear(new Date(2025, 11, 1))).toBe("diciembre 2025");
  });
});
