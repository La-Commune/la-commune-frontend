import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Tests de la lógica de sesión de cliente (firma + exp + rate limiting).
 * Igual que verifyAdminPin.test.ts: las server actions usan cookies()/headers()
 * de Next (server-only), así que se testea la lógica replicada — el contrato
 * del formato firmado `customerId:cardId:exp:sig`.
 */

const HMAC_KEY = "test-hmac-key";
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 90;

function signSession(customerId: string, cardId: string, exp: number): string {
  const sig = createHmac("sha256", HMAC_KEY)
    .update(`session:${customerId}:${cardId}:${exp}`)
    .digest("hex");
  return `${customerId}:${cardId}:${exp}:${sig}`;
}

function verifySession(
  value: string,
): { customerId: string; cardId: string } | null {
  const parts = value.split(":");
  if (parts.length !== 4) return null;

  const [customerId, cardId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  const expected = createHmac("sha256", HMAC_KEY)
    .update(`session:${customerId}:${cardId}:${exp}`)
    .digest("hex");

  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex")))
      return null;
  } catch {
    return null;
  }
  return { customerId, cardId };
}

describe("customer-session — cookie firmada con exp", () => {
  it("roundtrip válido devuelve la sesión", () => {
    const exp = Date.now() + SESSION_MAX_AGE_S * 1000;
    const cookie = signSession("cli-1", "tar-1", exp);
    expect(verifySession(cookie)).toEqual({ customerId: "cli-1", cardId: "tar-1" });
  });

  it("cookie expirada → null", () => {
    const cookie = signSession("cli-1", "tar-1", Date.now() - 1000);
    expect(verifySession(cookie)).toBeNull();
  });

  it("cookie legacy de 3 partes (sin exp) → null", () => {
    const sig = createHmac("sha256", HMAC_KEY)
      .update("session:cli-1:tar-1")
      .digest("hex");
    expect(verifySession(`cli-1:tar-1:${sig}`)).toBeNull();
  });

  it("extender el exp sin re-firmar → null (el exp está DENTRO de la firma)", () => {
    const exp = Date.now() - 1000; // ya expirada
    const cookie = signSession("cli-1", "tar-1", exp);
    const parts = cookie.split(":");
    parts[2] = String(Date.now() + 99999999); // atacante extiende exp
    expect(verifySession(parts.join(":"))).toBeNull();
  });

  it("firma alterada → null", () => {
    const exp = Date.now() + 10000;
    const cookie = signSession("cli-1", "tar-1", exp);
    expect(verifySession(cookie.slice(0, -2) + "ff")).toBeNull();
  });

  it("cambiar el cardId sin re-firmar → null", () => {
    const exp = Date.now() + 10000;
    const cookie = signSession("cli-1", "tar-1", exp);
    const parts = cookie.split(":");
    parts[1] = "tar-OTRA";
    expect(verifySession(parts.join(":"))).toBeNull();
  });
});

describe("customer-session — rate limiting de PIN", () => {
  const MAX_ATTEMPTS = 8;
  const WINDOW_MS = 15 * 60 * 1000;
  let attemptMap: Map<string, { count: number; resetAt: number }>;

  function isBlocked(key: string): boolean {
    const now = Date.now();
    const entry = attemptMap.get(key);
    if (entry && now >= entry.resetAt) {
      attemptMap.delete(key);
      return false;
    }
    return !!entry && entry.count >= MAX_ATTEMPTS;
  }

  function registerFailure(key: string): void {
    const now = Date.now();
    const entry = attemptMap.get(key);
    if (entry && now < entry.resetAt) {
      entry.count += 1;
    } else {
      attemptMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    }
  }

  beforeEach(() => {
    attemptMap = new Map();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("bloquea después de 8 intentos fallidos", () => {
    const key = "1.2.3.4|7711234567";
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(isBlocked(key)).toBe(false);
      registerFailure(key);
    }
    expect(isBlocked(key)).toBe(true);
  });

  it("la ventana expira a los 15 min y desbloquea", () => {
    const key = "1.2.3.4|7711234567";
    for (let i = 0; i < MAX_ATTEMPTS; i++) registerFailure(key);
    expect(isBlocked(key)).toBe(true);

    vi.advanceTimersByTime(WINDOW_MS + 1000);
    expect(isBlocked(key)).toBe(false);
  });

  it("PIN correcto resetea el contador (delete de la llave)", () => {
    const key = "1.2.3.4|7711234567";
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) registerFailure(key);
    attemptMap.delete(key); // lo que hace el flujo en éxito
    expect(isBlocked(key)).toBe(false);
  });

  it("llaves distintas (otro teléfono) no comparten contador", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) registerFailure("1.2.3.4|111");
    expect(isBlocked("1.2.3.4|111")).toBe(true);
    expect(isBlocked("1.2.3.4|222")).toBe(false);
  });
});
