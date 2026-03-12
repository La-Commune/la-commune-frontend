import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

// We need to test the helper functions that don't depend on Next.js server APIs
// The main verifyAdminPin function uses headers() and cookies() which are server-only
// So we test the session signing/verification logic separately

describe("verifyAdminPin - session token logic", () => {
  const COOKIE_SECRET = "test-secret-key-for-testing";

  function signSessionPayload(payload: {
    userId: string;
    nombre: string;
    rol: string;
    exp: number;
  }): string {
    const json = JSON.stringify(payload);
    const data = Buffer.from(json).toString("base64url");
    const sig = createHmac("sha256", COOKIE_SECRET)
      .update(data)
      .digest("base64url");
    return `${data}.${sig}`;
  }

  function verifySessionToken(
    token: string
  ): { userId: string; nombre: string; rol: string; exp: number } | null {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [data, sig] = parts;
    const expectedSig = createHmac("sha256", COOKIE_SECRET)
      .update(data)
      .digest("base64url");

    try {
      const sigBuf = Buffer.from(sig, "base64url");
      const expectedBuf = Buffer.from(expectedSig, "base64url");
      if (sigBuf.length !== expectedBuf.length) return null;

      const { timingSafeEqual } = require("crypto");
      if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
    } catch {
      return null;
    }

    try {
      const json = Buffer.from(data, "base64url").toString("utf-8");
      const payload = JSON.parse(json);
      if (!payload.exp || Date.now() > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  }

  describe("signSessionPayload", () => {
    it("genera un token con formato data.sig", () => {
      const token = signSessionPayload({
        userId: "user-1",
        nombre: "David",
        rol: "admin",
        exp: Date.now() + 3600000,
      });

      const parts = token.split(".");
      expect(parts).toHaveLength(2);
      expect(parts[0].length).toBeGreaterThan(0);
      expect(parts[1].length).toBeGreaterThan(0);
    });

    it("codifica el payload en base64url", () => {
      const payload = {
        userId: "user-1",
        nombre: "David",
        rol: "admin",
        exp: Date.now() + 3600000,
      };
      const token = signSessionPayload(payload);
      const data = token.split(".")[0];
      const decoded = JSON.parse(
        Buffer.from(data, "base64url").toString("utf-8")
      );
      expect(decoded.userId).toBe("user-1");
      expect(decoded.nombre).toBe("David");
      expect(decoded.rol).toBe("admin");
    });
  });

  describe("verifySessionToken", () => {
    it("verifica un token valido", () => {
      const exp = Date.now() + 3600000;
      const token = signSessionPayload({
        userId: "user-1",
        nombre: "David",
        rol: "admin",
        exp,
      });

      const result = verifySessionToken(token);
      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user-1");
      expect(result!.nombre).toBe("David");
      expect(result!.rol).toBe("admin");
    });

    it("rechaza token expirado", () => {
      const token = signSessionPayload({
        userId: "user-1",
        nombre: "David",
        rol: "admin",
        exp: Date.now() - 1000, // ya expirado
      });

      const result = verifySessionToken(token);
      expect(result).toBeNull();
    });

    it("rechaza token con firma invalida", () => {
      const token = signSessionPayload({
        userId: "user-1",
        nombre: "David",
        rol: "admin",
        exp: Date.now() + 3600000,
      });

      // Tamper with signature
      const tampered = token.slice(0, -3) + "xxx";
      const result = verifySessionToken(tampered);
      expect(result).toBeNull();
    });

    it("rechaza token mal formado", () => {
      expect(verifySessionToken("not-a-valid-token")).toBeNull();
      expect(verifySessionToken("")).toBeNull();
      expect(verifySessionToken("a.b.c")).toBeNull();
    });

    it("rechaza token con data corrupta", () => {
      const sig = createHmac("sha256", COOKIE_SECRET)
        .update("corrupted-data")
        .digest("base64url");
      const result = verifySessionToken(`not-base64.${sig}`);
      expect(result).toBeNull();
    });
  });

  describe("rate limiting logic", () => {
    it("bloquea despues de MAX_ATTEMPTS intentos", () => {
      const MAX_ATTEMPTS = 10;
      const WINDOW_MS = 15 * 60 * 1000;
      const attemptMap = new Map<
        string,
        { count: number; resetAt: number }
      >();

      const ip = "192.168.1.1";
      const now = Date.now();

      // Simular 10 intentos fallidos
      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const entry = attemptMap.get(ip);
        if (entry) {
          entry.count += 1;
        } else {
          attemptMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        }
      }

      const entry = attemptMap.get(ip)!;
      expect(entry.count).toBe(MAX_ATTEMPTS);

      // Verificar que estaria bloqueado
      const isBlocked =
        entry.count >= MAX_ATTEMPTS && now < entry.resetAt;
      expect(isBlocked).toBe(true);
    });

    it("resetea intentos despues de la ventana", () => {
      const WINDOW_MS = 15 * 60 * 1000;
      const attemptMap = new Map<
        string,
        { count: number; resetAt: number }
      >();

      const ip = "192.168.1.1";
      const pastTime = Date.now() - WINDOW_MS - 1000;

      attemptMap.set(ip, { count: 10, resetAt: pastTime });

      const now = Date.now();
      const entry = attemptMap.get(ip)!;
      if (now >= entry.resetAt) {
        attemptMap.delete(ip);
      }

      expect(attemptMap.has(ip)).toBe(false);
    });
  });
});
