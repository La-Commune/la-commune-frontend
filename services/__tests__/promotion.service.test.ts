import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock de Supabase (patrón thenable) ──
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabase,
  NEGOCIO_ID: "test-negocio-id",
}));

import {
  getActivePromotions,
  addPromotion,
  updatePromotion,
  deletePromotion,
} from "../promotion.service";

/** Fila de promoción como viene de Supabase */
function promoRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "promo-1",
    nombre: "2x1 Lattes",
    descripcion: "Dos por uno",
    tipo: "2x1",
    valor_descuento: null,
    fecha_inicio: "2026-06-01T00:00:00",
    fecha_fin: "2026-06-30T00:00:00",
    dias_semana: [],
    activo: true,
    aplica_a: "Latte",
    creado_en: "2026-05-01T00:00:00",
    ...overrides,
  };
}

type MockChain = {
  [key: string]: ReturnType<typeof vi.fn> | ((...args: unknown[]) => unknown);
};

function chainWith(resolution: Record<string, unknown>): MockChain {
  const chain: MockChain = {};
  for (const m of ["select", "eq", "order", "insert", "update", "delete"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolution);
  chain.then = (resolve: (v: unknown) => void) => resolve(resolution);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // "Hoy": jueves 4 de junio de 2026, mediodía
  vi.setSystemTime(new Date(2026, 5, 4, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getActivePromotions", () => {
  it("incluye promos activas dentro de rango", async () => {
    mockFrom.mockReturnValue(chainWith({ data: [promoRow()], error: null }));
    const promos = await getActivePromotions();
    expect(promos).toHaveLength(1);
    expect(promos[0].title).toBe("2x1 Lattes");
  });

  it("excluye promos inactivas aunque estén en rango", async () => {
    mockFrom.mockReturnValue(chainWith({ data: [promoRow({ activo: false })], error: null }));
    expect(await getActivePromotions()).toHaveLength(0);
  });

  it("excluye promos que aún no empiezan o ya terminaron", async () => {
    mockFrom.mockReturnValue(
      chainWith({
        data: [
          promoRow({ id: "futura", fecha_inicio: "2026-07-01T00:00:00", fecha_fin: "2026-07-31T00:00:00" }),
          promoRow({ id: "pasada", fecha_inicio: "2026-04-01T00:00:00", fecha_fin: "2026-04-30T00:00:00" }),
        ],
        error: null,
      })
    );
    expect(await getActivePromotions()).toHaveLength(0);
  });

  it("la promo vigente HASTA HOY sigue activa todo el día (end-of-day)", async () => {
    // fecha_fin = hoy a las 00:00 — sin el ajuste end-of-day quedaría excluida a mediodía
    mockFrom.mockReturnValue(
      chainWith({ data: [promoRow({ fecha_fin: "2026-06-04T00:00:00" })], error: null })
    );
    expect(await getActivePromotions()).toHaveLength(1);
  });

  it("filtra por día de la semana (hoy es jueves = 4)", async () => {
    mockFrom.mockReturnValue(
      chainWith({
        data: [
          promoRow({ id: "jueves", dias_semana: [4] }),
          promoRow({ id: "lunes", dias_semana: [1] }),
        ],
        error: null,
      })
    );
    const promos = await getActivePromotions();
    expect(promos).toHaveLength(1);
    expect(promos[0].id).toBe("jueves");
  });

  it("dias_semana vacío aplica todos los días", async () => {
    mockFrom.mockReturnValue(chainWith({ data: [promoRow({ dias_semana: [] })], error: null }));
    expect(await getActivePromotions()).toHaveLength(1);
  });
});

describe("addPromotion", () => {
  it("mapea campos al esquema de Supabase y devuelve el id", async () => {
    const chain = chainWith({ data: { id: "nuevo-id" }, error: null });
    mockFrom.mockReturnValue(chain);

    const id = await addPromotion({
      title: "Descuento martes",
      description: "10% en alimentos",
      type: "descuento",
      discountPercent: 10,
      startsAt: new Date(2026, 5, 1),
      endsAt: new Date(2026, 5, 30),
      daysOfWeek: [2],
      active: true,
      appliesTo: "alimentos",
      order: 0,
      schemaVersion: 1,
    });

    expect(id).toBe("nuevo-id");
    const inserted = chain.insert.mock.calls[0][0][0];
    expect(inserted.negocio_id).toBe("test-negocio-id");
    expect(inserted.nombre).toBe("Descuento martes");
    expect(inserted.valor_descuento).toBe(10);
    expect(inserted.dias_semana).toEqual([2]);
    expect(typeof inserted.fecha_inicio).toBe("string"); // Date → ISO
  });

  it("propaga errores de insert", async () => {
    mockFrom.mockReturnValue(chainWith({ data: null, error: { message: "boom" } }));
    await expect(
      addPromotion({
        title: "X", description: "", type: "2x1", discountPercent: undefined as unknown as number,
        startsAt: new Date(), endsAt: new Date(), daysOfWeek: [], active: true,
        appliesTo: "", order: 0, schemaVersion: 1,
      })
    ).rejects.toEqual({ message: "boom" });
  });
});

describe("updatePromotion", () => {
  it("solo actualiza los campos provistos", async () => {
    const chain = chainWith({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await updatePromotion("promo-1", { active: false, title: "Nuevo nombre" });

    const updated = chain.update.mock.calls[0][0];
    expect(updated).toEqual({ activo: false, nombre: "Nuevo nombre" });
    expect(chain.eq).toHaveBeenCalledWith("id", "promo-1");
    expect(chain.eq).toHaveBeenCalledWith("negocio_id", "test-negocio-id");
  });
});

describe("deletePromotion", () => {
  it("borra filtrando por id y negocio", async () => {
    const chain = chainWith({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await deletePromotion("promo-1");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "promo-1");
    expect(chain.eq).toHaveBeenCalledWith("negocio_id", "test-negocio-id");
  });

  it("propaga errores de delete", async () => {
    mockFrom.mockReturnValue(chainWith({ data: null, error: { message: "rls" } }));
    await expect(deletePromotion("promo-1")).rejects.toEqual({ message: "rls" });
  });
});
