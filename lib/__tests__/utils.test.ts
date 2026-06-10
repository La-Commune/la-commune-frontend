import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, timeAgo, isBrowser, cn } from "../utils";

describe("timeAgo", () => {
  // Ancla el reloj para que "Date.now() - date" sea determinista
  const NOW = new Date("2026-06-06T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const agoMs = (ms: number) => new Date(NOW - ms);

  it("< 1 minuto → 'ahora'", () => {
    expect(timeAgo(agoMs(0))).toBe("ahora");
    expect(timeAgo(agoMs(59_000))).toBe("ahora");
  });

  it("1–59 minutos → 'hace Xm'", () => {
    expect(timeAgo(agoMs(60_000))).toBe("hace 1m");
    expect(timeAgo(agoMs(45 * 60_000))).toBe("hace 45m");
    expect(timeAgo(agoMs(59 * 60_000))).toBe("hace 59m");
  });

  it("frontera exacta de 60 min → 'hace 1h'", () => {
    expect(timeAgo(agoMs(60 * 60_000))).toBe("hace 1h");
  });

  it("1–23 horas → 'hace Xh'", () => {
    expect(timeAgo(agoMs(3 * 3600_000))).toBe("hace 3h");
    expect(timeAgo(agoMs(23 * 3600_000))).toBe("hace 23h");
  });

  it("frontera exacta de 24h → 'hace 1d'", () => {
    expect(timeAgo(agoMs(24 * 3600_000))).toBe("hace 1d");
  });

  it("≥ 1 día → 'hace Xd'", () => {
    expect(timeAgo(agoMs(2 * 86_400_000))).toBe("hace 2d");
    expect(timeAgo(agoMs(30 * 86_400_000))).toBe("hace 30d");
  });
});

describe("formatDate", () => {
  it("null/undefined → null", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate("")).toBeNull();
  });

  it("Date object → 'D mmm' en es-MX", () => {
    const out = formatDate(new Date(2026, 5, 15)); // 15 junio 2026
    expect(out).toBeTruthy();
    expect(out).toContain("15");
    expect(out!.toLowerCase()).toContain("jun");
  });

  it("string ISO → mismo formato", () => {
    const out = formatDate("2026-06-15T08:00:00");
    expect(out).toContain("15");
    expect(out!.toLowerCase()).toContain("jun");
  });

  it("objeto con .toDate() (estilo Firestore) → usa toDate()", () => {
    const firestoreLike = { toDate: () => new Date(2026, 0, 3) }; // 3 enero
    const out = formatDate(firestoreLike);
    expect(out).toContain("3");
    expect(out!.toLowerCase()).toContain("ene");
  });
});

describe("isBrowser", () => {
  it("en happy-dom (con window) → true", () => {
    expect(isBrowser()).toBe(true);
  });
});

describe("cn", () => {
  it("combina clases y deja la última de un conflicto de Tailwind", () => {
    // twMerge: px-2 px-4 → px-4 (la última gana)
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignora falsy y condicionales", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
