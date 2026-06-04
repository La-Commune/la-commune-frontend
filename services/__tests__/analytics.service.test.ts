import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock de Supabase (patrón thenable) ──
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabase,
  NEGOCIO_ID: "test-negocio-id",
}));

import {
  getAllStampEvents,
  getStampEventsInRange,
  getTotalCustomers,
  getTotalRedemptions,
  getCustomerTopDrinks,
} from "../analytics.service";

function eventRow(i: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `ev-${i}`,
    creado_en: "2026-06-01T12:00:00",
    origen: "stamp",
    tipo_bebida: "Latte",
    ...overrides,
  };
}

function chainWith(resolution: Record<string, unknown>) {
  const chain: any = {};
  for (const m of ["select", "eq", "order", "range", "gte"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(resolution);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAllStampEvents — paginación", () => {
  it("una sola página cuando hay menos de 500 eventos", async () => {
    mockFrom.mockReturnValue(chainWith({ data: [eventRow(1), eventRow(2)], error: null }));
    const events = await getAllStampEvents();

    expect(events).toHaveLength(2);
    expect(events[0].createdAt).toBeInstanceOf(Date);
    expect(events[0].source).toBe("stamp");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("itera en lotes de 500 hasta agotar los datos", async () => {
    const page1 = Array.from({ length: 500 }, (_, i) => eventRow(i));
    const page2 = [eventRow(500), eventRow(501)];
    mockFrom
      .mockReturnValueOnce(chainWith({ data: page1, error: null }))
      .mockReturnValueOnce(chainWith({ data: page2, error: null }));

    const events = await getAllStampEvents();

    expect(events).toHaveLength(502);
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("lista vacía sin romper", async () => {
    mockFrom.mockReturnValue(chainWith({ data: [], error: null }));
    expect(await getAllStampEvents()).toEqual([]);
  });

  it("propaga errores de la query", async () => {
    mockFrom.mockReturnValue(chainWith({ data: null, error: { message: "boom" } }));
    await expect(getAllStampEvents()).rejects.toEqual({ message: "boom" });
  });
});

describe("getStampEventsInRange", () => {
  it("filtra con gte sobre creado_en", async () => {
    const chain = chainWith({ data: [eventRow(1)], error: null });
    mockFrom.mockReturnValue(chain);

    await getStampEventsInRange(new Date("2026-05-01T00:00:00Z"));

    expect(chain.gte).toHaveBeenCalledWith("creado_en", "2026-05-01T00:00:00.000Z");
  });
});

describe("counts", () => {
  it("getTotalCustomers cuenta clientes activos del negocio", async () => {
    const chain = chainWith({ count: 42, error: null });
    mockFrom.mockReturnValue(chain);

    expect(await getTotalCustomers()).toBe(42);
    expect(chain.eq).toHaveBeenCalledWith("activo", true);
  });

  it("getTotalRedemptions cuenta eventos con origen canje", async () => {
    const chain = chainWith({ count: 7, error: null });
    mockFrom.mockReturnValue(chain);

    expect(await getTotalRedemptions()).toBe(7);
    expect(chain.eq).toHaveBeenCalledWith("origen", "canje");
  });

  it("count null devuelve 0", async () => {
    mockFrom.mockReturnValue(chainWith({ count: null, error: null }));
    expect(await getTotalCustomers()).toBe(0);
  });
});

describe("getCustomerTopDrinks", () => {
  it("agrega, ordena desc y respeta el límite, excluyendo canjes", async () => {
    mockFrom.mockReturnValue(
      chainWith({
        data: [
          eventRow(1, { tipo_bebida: "Latte" }),
          eventRow(2, { tipo_bebida: "Latte" }),
          eventRow(3, { tipo_bebida: "Latte" }),
          eventRow(4, { tipo_bebida: "Cappuccino" }),
          eventRow(5, { tipo_bebida: "Cappuccino" }),
          eventRow(6, { tipo_bebida: "Moka" }),
          eventRow(7, { tipo_bebida: "Latte", origen: "canje" }), // no cuenta
          eventRow(8, { tipo_bebida: null }), // sin bebida no cuenta
        ],
        error: null,
      })
    );

    const top = await getCustomerTopDrinks("c1", 2);

    expect(top).toEqual([
      { drink: "Latte", count: 3 },
      { drink: "Cappuccino", count: 2 },
    ]);
  });

  it("cliente sin eventos devuelve lista vacía", async () => {
    mockFrom.mockReturnValue(chainWith({ data: [], error: null }));
    expect(await getCustomerTopDrinks("c1")).toEqual([]);
  });
});
