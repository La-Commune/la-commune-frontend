import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests del gate de seguridad de saveRewardConfig (DAV-67):
 * la server action SOLO debe escribir con sesión barista válida de rol admin,
 * valida input, y nunca filtra detalles internos en errores.
 */

const mockCheckSession = vi.fn();
vi.mock("../verifyAdminPin", () => ({
  checkBaristaSession: () => mockCheckSession(),
}));

const mockUpsert = vi.fn();
vi.mock("@/services/reward.service", () => ({
  upsertDefaultRewardWith: (...args: unknown[]) => mockUpsert(...args),
}));

const mockGetServer = vi.fn(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  getSupabaseServer: () => mockGetServer(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { saveRewardConfig } from "../rewardConfig";

const validInput = {
  name: "Bebida de cortesía",
  description: "Cualquier bebida del menú",
  requiredStamps: 5,
  type: "drink" as const,
  active: true,
  illustration: "rol-canela" as never,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue({ versioned: false });
});

describe("saveRewardConfig — gate de sesión", () => {
  it("rechaza sin sesión válida y NO toca la BD", async () => {
    mockCheckSession.mockResolvedValue({ valid: false });

    const r = await saveRewardConfig(validInput);

    expect(r.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockGetServer).not.toHaveBeenCalled();
  });

  it("rechaza a rol barista (solo admin configura la recompensa)", async () => {
    mockCheckSession.mockResolvedValue({ valid: true, nombre: "Caro", rol: "barista" });

    const r = await saveRewardConfig(validInput);

    expect(r.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("acepta admin y llama al upsert con el payload normalizado", async () => {
    mockCheckSession.mockResolvedValue({ valid: true, nombre: "David", rol: "admin" });
    mockUpsert.mockResolvedValue({ versioned: true });

    const r = await saveRewardConfig({ ...validInput, name: "  Bebida  " });

    expect(r).toEqual({ ok: true, versioned: true });
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const [, payload] = mockUpsert.mock.calls[0];
    expect(payload.name).toBe("Bebida"); // trimmed
    expect(payload.requiredStamps).toBe(5);
    expect(payload.active).toBe(true);
  });
});

describe("saveRewardConfig — validación de input (con sesión admin)", () => {
  beforeEach(() => {
    mockCheckSession.mockResolvedValue({ valid: true, nombre: "David", rol: "admin" });
  });

  it.each([
    [0, "cero"],
    [31, "fuera de rango"],
    [2.5, "no entero"],
    [NaN, "NaN"],
  ])("rechaza requiredStamps inválido (%s — %s)", async (stamps) => {
    const r = await saveRewardConfig({ ...validInput, requiredStamps: stamps as number });
    expect(r.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rechaza nombre vacío o gigante", async () => {
    expect((await saveRewardConfig({ ...validInput, name: "   " })).ok).toBe(false);
    expect((await saveRewardConfig({ ...validInput, name: "x".repeat(121) })).ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rechaza descripción de más de 500 chars", async () => {
    const r = await saveRewardConfig({ ...validInput, description: "x".repeat(501) });
    expect(r.ok).toBe(false);
  });

  it("si el upsert truena, devuelve error GENÉRICO (sin detalles internos)", async () => {
    mockUpsert.mockRejectedValue(new Error("duplicate key value violates unique constraint"));

    const r = await saveRewardConfig(validInput);

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).not.toContain("duplicate");
      expect(r.error).not.toContain("constraint");
    }
  });
});
