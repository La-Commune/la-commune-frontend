import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Mock de Supabase (patrón thenable) ──
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabase,
  NEGOCIO_ID: "test-negocio-id",
}));

import {
  getDefaultReward,
  getRewardById,
  upsertDefaultRewardWith,
  updateRewardStamps,
} from "../reward.service";

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

/**
 * Chain mock: todos los métodos intermedios devuelven la misma chain.
 * - `maybeSingle`/`single`: terminales con resolución propia
 * - `then`: para awaits directos sobre la chain (update/insert sin terminal)
 */
function makeChain(opts: {
  maybeSingle?: unknown;
  single?: unknown;
  resolution?: unknown;
} = {}) {
  const chain: any = {};
  for (const m of ["select", "eq", "neq", "limit", "order", "insert", "update", "delete"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(opts.single ?? { data: null, error: null });
  chain.maybeSingle = vi
    .fn()
    .mockResolvedValue(opts.maybeSingle ?? { data: null, error: null });
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(opts.resolution ?? { data: null, error: null }).then(resolve, reject);
  return chain;
}

const asClient = mockSupabase as unknown as SupabaseClient;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDefaultReward", () => {
  it("mapea la fila de Supabase al modelo Reward", async () => {
    mockFrom.mockReturnValue(makeChain({ maybeSingle: { data: rewardRow, error: null } }));
    const r = await getDefaultReward();

    expect(r).not.toBeNull();
    expect(r!.id).toBe("rew-1");
    expect(r!.name).toBe("Bebida de cortesía");
    expect(r!.requiredStamps).toBe(5);
    expect(r!.illustration).toBe("flat-white-cenital");
  });

  it("prefiere la default más NUEVA (order creado_en desc) y solo activas", async () => {
    const chain = makeChain({ maybeSingle: { data: rewardRow, error: null } });
    mockFrom.mockReturnValue(chain);

    await getDefaultReward();

    expect(chain.order).toHaveBeenCalledWith("creado_en", { ascending: false });
    expect(chain.eq).toHaveBeenCalledWith("activa", true);
    expect(chain.eq).toHaveBeenCalledWith("es_default", true);
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it("devuelve null cuando no hay reward default", async () => {
    mockFrom.mockReturnValue(makeChain({ maybeSingle: { data: null, error: null } }));
    expect(await getDefaultReward()).toBeNull();
  });

  it("lanza errores que no sean PGRST116", async () => {
    mockFrom.mockReturnValue(
      makeChain({ maybeSingle: { data: null, error: { code: "500", message: "boom" } } }),
    );
    await expect(getDefaultReward()).rejects.toEqual({ code: "500", message: "boom" });
  });

  it("ilustración vacía cae al default flat-white-cenital", async () => {
    mockFrom.mockReturnValue(
      makeChain({ maybeSingle: { data: { ...rewardRow, ilustracion: "" }, error: null } }),
    );
    const r = await getDefaultReward();
    expect(r!.illustration).toBe("flat-white-cenital");
  });
});

describe("getRewardById (DAV-67)", () => {
  it("busca la recompensa por id — la de la tarjeta, no la default", async () => {
    const chain = makeChain({
      maybeSingle: { data: { ...rewardRow, id: "rew-vieja", ilustracion: "croissant" }, error: null },
    });
    mockFrom.mockReturnValue(chain);

    const r = await getRewardById("rew-vieja");

    expect(chain.eq).toHaveBeenCalledWith("id", "rew-vieja");
    expect(r!.id).toBe("rew-vieja");
    expect(r!.illustration).toBe("croissant");
  });

  it("devuelve null si la recompensa ya no existe/no es visible", async () => {
    mockFrom.mockReturnValue(makeChain({ maybeSingle: { data: null, error: null } }));
    expect(await getRewardById("rew-x")).toBeNull();
  });

  it("propaga errores reales", async () => {
    mockFrom.mockReturnValue(
      makeChain({ maybeSingle: { data: null, error: { code: "500", message: "rls" } } }),
    );
    await expect(getRewardById("rew-x")).rejects.toEqual({ code: "500", message: "rls" });
  });
});

describe("upsertDefaultRewardWith — versionado por diseño (DAV-67)", () => {
  const cambios = {
    name: "Postre de cortesía",
    description: "Cualquier postre",
    requiredStamps: 8,
    type: "custom" as const,
    active: true,
  };

  it("actualiza in place cuando NO cambia la ilustración", async () => {
    const selectChain = makeChain({
      maybeSingle: { data: { id: "rew-1", ilustracion: "flat-white-cenital" }, error: null },
    });
    const updateChain = makeChain({ resolution: { error: null } });
    const healChain = makeChain({ resolution: { error: null } });
    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(healChain);

    const result = await upsertDefaultRewardWith(asClient, {
      ...cambios,
      illustration: "flat-white-cenital" as never,
    });

    expect(result.versioned).toBe(false);
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: "Postre de cortesía", sellos_requeridos: 8 }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith("id", "rew-1");
    expect(updateChain.insert).not.toHaveBeenCalled();
    expect(selectChain.insert).not.toHaveBeenCalled();
  });

  it("actualiza in place cuando la ilustración no viene en los cambios", async () => {
    const selectChain = makeChain({
      maybeSingle: { data: { id: "rew-1", ilustracion: "flat-white-cenital" }, error: null },
    });
    const updateChain = makeChain({ resolution: { error: null } });
    const healChain = makeChain({ resolution: { error: null } });
    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(healChain);

    const result = await upsertDefaultRewardWith(asClient, cambios);

    expect(result.versioned).toBe(false);
    expect(updateChain.update).toHaveBeenCalled();
    expect(updateChain.insert).not.toHaveBeenCalled();
  });

  it("AUTO-SANADO: el update in place degrada defaults huérfanas (retry tras demote fallido converge a UNA default)", async () => {
    // Escenario: un versionado anterior insertó la nueva default pero su
    // demote falló → quedó la vieja con es_default=true. El retry encuentra
    // la fila más nueva (misma ilustración) → rama in-place → debe degradar
    // a cualquier OTRA default rezagada.
    const selectChain = makeChain({
      maybeSingle: { data: { id: "rew-new", ilustracion: "croissant" }, error: null },
    });
    const updateChain = makeChain({ resolution: { error: null } });
    const healChain = makeChain({ resolution: { error: null } });
    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(healChain);

    await upsertDefaultRewardWith(asClient, { ...cambios, illustration: "croissant" as never });

    expect(healChain.update).toHaveBeenCalledWith({ es_default: false });
    expect(healChain.eq).toHaveBeenCalledWith("es_default", true);
    expect(healChain.neq).toHaveBeenCalledWith("id", "rew-new");
  });

  it("VERSIONA cuando cambia la ilustración: inserta nueva default y degrada la vieja", async () => {
    const selectChain = makeChain({
      maybeSingle: { data: { id: "rew-old", ilustracion: "flat-white-cenital" }, error: null },
    });
    const insertChain = makeChain({ single: { data: { id: "rew-new" }, error: null } });
    const demoteChain = makeChain({ resolution: { error: null } });
    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(demoteChain);

    const result = await upsertDefaultRewardWith(asClient, {
      ...cambios,
      illustration: "croissant" as never,
    });

    expect(result.versioned).toBe(true);

    // Nueva fila: diseño nuevo, default y activa
    const inserted = insertChain.insert.mock.calls[0][0][0];
    expect(inserted.ilustracion).toBe("croissant");
    expect(inserted.es_default).toBe(true);
    expect(inserted.activa).toBe(true);
    expect(inserted.negocio_id).toBe("test-negocio-id");

    // Vieja fila: SOLO pierde es_default (sigue activa para que las
    // tarjetas existentes puedan leer su diseño con anon)
    expect(demoteChain.update).toHaveBeenCalledWith({ es_default: false });
    expect(demoteChain.neq).toHaveBeenCalledWith("id", "rew-new");
  });

  it("crea el reward si no existe default, marcándolo es_default", async () => {
    const selectChain = makeChain({ maybeSingle: { data: null, error: null } });
    const insertChain = makeChain({ resolution: { error: null } });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(insertChain);

    const result = await upsertDefaultRewardWith(asClient, cambios);

    expect(result.versioned).toBe(false);
    expect(insertChain.insert).toHaveBeenCalled();
    const inserted = insertChain.insert.mock.calls[0][0][0];
    expect(inserted.es_default).toBe(true);
    expect(inserted.negocio_id).toBe("test-negocio-id");
    expect(inserted.nombre).toBe("Postre de cortesía");
  });

  it("propaga error si el insert de la nueva versión falla", async () => {
    const selectChain = makeChain({
      maybeSingle: { data: { id: "rew-old", ilustracion: "flat-white-cenital" }, error: null },
    });
    const insertChain = makeChain({ single: { data: null, error: { message: "rls" } } });
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(insertChain);

    await expect(
      upsertDefaultRewardWith(asClient, { ...cambios, illustration: "croissant" as never }),
    ).rejects.toEqual({ message: "rls" });
  });
});

describe("updateRewardStamps", () => {
  it("actualiza sellos_requeridos del default con scope de negocio", async () => {
    const chain = makeChain({ resolution: { data: null, error: null } });
    mockFrom.mockReturnValue(chain);

    await updateRewardStamps(7);

    expect(chain.update).toHaveBeenCalledWith({ sellos_requeridos: 7 });
    expect(chain.eq).toHaveBeenCalledWith("negocio_id", "test-negocio-id");
    expect(chain.eq).toHaveBeenCalledWith("es_default", true);
  });

  it("propaga errores", async () => {
    mockFrom.mockReturnValue(makeChain({ resolution: { data: null, error: { message: "rls" } } }));
    await expect(updateRewardStamps(7)).rejects.toEqual({ message: "rls" });
  });
});
