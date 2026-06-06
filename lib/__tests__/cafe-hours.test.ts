import { describe, it, expect } from "vitest";
import { getOpenStatus } from "../cafe-hours";

/**
 * getOpenStatus muestra el label abierto/cerrado en la landing. Es lógica de
 * frontera (apertura 10:00, cierre 20:00) en hora de CDMX (UTC-6, sin DST
 * desde 2022). Probamos pasando instantes UTC explícitos que mapean a horas
 * conocidas de CDMX (CDMX = UTC-6 → hora_utc = hora_cdmx + 6).
 */
const utc = (iso: string) => new Date(iso);

describe("getOpenStatus — fronteras de horario (CDMX UTC-6)", () => {
  it("10:00 CDMX (16:00 UTC) → abierto, label de cierre", () => {
    const r = getOpenStatus(utc("2026-06-15T16:00:00Z"));
    expect(r.open).toBe(true);
    expect(r.label).toBe("Abierto · cierra a las 20:00");
  });

  it("09:59 CDMX (15:59 UTC) → cerrado, 'abre a las 10:00'", () => {
    const r = getOpenStatus(utc("2026-06-15T15:59:00Z"));
    expect(r.open).toBe(false);
    expect(r.label).toBe("Cerrado · abre a las 10:00");
  });

  it("13:00 CDMX (19:00 UTC) → abierto (media jornada)", () => {
    expect(getOpenStatus(utc("2026-06-15T19:00:00Z")).open).toBe(true);
  });

  it("19:59 CDMX (01:59 UTC del día siguiente) → abierto (último minuto)", () => {
    const r = getOpenStatus(utc("2026-06-16T01:59:00Z"));
    expect(r.open).toBe(true);
  });

  it("20:00 CDMX (02:00 UTC) → cerrado, 'abre mañana' (cierra AL filo)", () => {
    const r = getOpenStatus(utc("2026-06-16T02:00:00Z"));
    expect(r.open).toBe(false);
    expect(r.label).toBe("Cerrado · abre mañana a las 10:00");
  });

  it("03:00 CDMX (09:00 UTC) madrugada → cerrado, 'abre a las 10:00'", () => {
    const r = getOpenStatus(utc("2026-06-15T09:00:00Z"));
    expect(r.open).toBe(false);
    expect(r.label).toBe("Cerrado · abre a las 10:00");
  });

  it("default sin argumento usa la hora actual (no truena)", () => {
    const r = getOpenStatus();
    expect(typeof r.open).toBe("boolean");
    expect(r.label).toContain("·");
  });

  it("LÍMITE CONOCIDO: ignora el día de la semana — un lunes a las 12:00 da 'Abierto' igual", () => {
    // 2026-06-15 es lunes. La función no distingue días → si el café cerrara
    // los lunes, este label sería incorrecto. Documentado para David.
    const lunes = getOpenStatus(utc("2026-06-15T18:00:00Z")); // 12:00 CDMX, lunes
    expect(lunes.open).toBe(true);
  });
});
