import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock de Supabase (patrón thenable) ──
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabase,
  NEGOCIO_ID: "test-negocio-id",
}));

import { getDefaultReward, upsertDefaultReward, updateRewardStamps } from "../reward.service";

const rewardRow = {
  id: "rew-1",
  negocio_id: "test-negocio-id",
  nombre: "Bebida de cortesía",
  descripcion: "Cualquier bebida del menú",
  sellos_requeridos: 5,
  tipo: "drink",
  activa: true,
  es_default: true,
  expira_en: null,
  ilustracion: "flat-white-cenital",
  creado_en: "2026-03-01T00:00:00",
  actualizado_en: "2026-03-01T00:00:00",
};

function chainWith(resolution: Record<string, unknown>) {
  const chain: any = {};
  for (const m of ["select", "eq", "limit", "insert", "update", "delete"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolution);
  chain.then = (resolve: (v: unknown) => void) => resolve(resolution);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDefaultReward", () => {
  it("mapea la fila de Supabase al modelo Reward", async () => {
    mockFrom.mockReturnValue(chainWith({ data: rewardRow, error: null }));
    const r = await getDefaultReward();

    expect(r).not.toBeNull();
    expect(r!.id).toBe("rew-1");
    expect(r!.name).toBe("Bebida de cortesía");
    expect(r!.requiredStamps).toBe(5);
    expect(r!.illustration).toBe("flat-white-cenital");
  });

  it("devuelve null cuando no hay reward default (PGRST116)", async () => {
    mockFrom.mockReturnValue(chainWith({ data: null, error: { code: "PGRST116" } }));
    expect(await getDefaultReward()).toBeNull();
  });

  it("lanza errores que no sean PGRST116", async () => {
    mockFrom.mockReturnValue(chainWith({ data: null, error: { code: "500", message: "boom" } }));
    await expect(getDefaultReward()).rejects.toEqual({ code: "500", message: "boom" });
  });

  it("ilustración vacía cae al default flat-white-cenital", async () => {
    mockFrom.mockReturnValue(chainWith({ data: { ...rewardRow, ilustracion: "" }, error: null }));
    const r = await getDefaultReward();
    expect(r!.illustration).toBe("flat-white-cenital");
  });
});

describe("upsertDefaultReward", () => {
  const cambios = {
    name: "Postre de cortesía",
    description: "Cualquier postre",
    requiredStamps: 8,
    type: "custom" as const,
    active: true,
  };

  it("actualiza el reward existente", async () => {
    const chain = chainWith({ data: { id: "rew-1" }, error: null });
    mockFrom.mockReturnValue(chain);

    await upsertDefaultReward(cambios);

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Postre de cortesía", sellos_requeridos: 8 })
    );
    expect(chain.insert).not.toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "rew-1");
  });

  it("crea el reward si no existe default, marcándolo es_default", async () => {
    const chain = chainWith({ data: null, error: null });
    chain.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
    mockFrom.mockReturnValue(chain);

    await upsertDefaultReward(cambios);

    expect(chain.insert).toHaveBeenCalled();
    const inserted = chain.insert.mock.calls[0][0][0];
    expect(inserted.es_default).toBe(true);
    expect(inserted.negocio_id).toBe("test-negocio-id");
    expect(inserted.nombre).toBe("Postre de cortesía");
  });

  it("solo incluye ilustracion cuando viene en los cambios", async () => {
    const chain = chainWith({ data: { id: "rew-1" }, error: null });
    mockFrom.mockReturnValue(chain);

    await upsertDefaultReward({ ...cambios, illustration: "croissant" as never });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ ilustracion: "croissant" })
    );
  });
});

describe("updateRewardStamps", () => {
  it("actualiza sellos_requeridos del default con scope de negocio", async () => {
    const chain = chainWith({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await updateRewardStamps(7);

    expect(chain.update).toHaveBeenCalledWith({ sellos_requeridos: 7 });
    expect(chain.eq).toHaveBeenCalledWith("negocio_id", "test-negocio-id");
    expect(chain.eq).toHaveBeenCalledWith("es_default", true);
  });

  it("propaga errores", async () => {
    mockFrom.mockReturnValue(chainWith({ data: null, error: { message: "rls" } }));
    await expect(updateRewardStamps(7)).rejects.toEqual({ message: "rls" });
  });
});
