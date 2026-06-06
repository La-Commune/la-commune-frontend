import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock de Supabase (mismo patrón que card.service.test.ts) ──
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
};

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabase,
  NEGOCIO_ID: "test-negocio-id",
}));

import { createCustomer, getReferralCount } from "../customer.service";

/**
 * Chain mock "thenable": permite tanto `.select().eq().eq().single()`
 * como `await supabase.from(...).select(...).eq(...)` directo
 * (el query builder de supabase-js es awaitable).
 */
type MockChain = {
  [key: string]: ReturnType<typeof vi.fn> | ((...args: unknown[]) => unknown);
};

function chainMock(resolution: Record<string, unknown>): MockChain {
  const chain: MockChain = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "is", "limit", "order"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(resolution);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolution);
  // thenable: await chain → resolution
  chain.then = (resolve: (v: unknown) => void) => resolve(resolution);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getReferralCount", () => {
  it("devuelve el count de clientes referidos activos", async () => {
    const chain = chainMock({ count: 3, error: null });
    mockFrom.mockReturnValue(chain);

    const count = await getReferralCount("customer-a");

    expect(mockFrom).toHaveBeenCalledWith("clientes");
    expect(chain.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(chain.eq).toHaveBeenCalledWith("negocio_id", "test-negocio-id");
    expect(chain.eq).toHaveBeenCalledWith("id_referidor", "customer-a");
    expect(chain.eq).toHaveBeenCalledWith("activo", true);
    expect(count).toBe(3);
  });

  it("devuelve 0 cuando count es null", async () => {
    mockFrom.mockReturnValue(chainMock({ count: null, error: null }));
    expect(await getReferralCount("customer-a")).toBe(0);
  });

  it("lanza el error de Supabase si la query falla", async () => {
    mockFrom.mockReturnValue(chainMock({ count: null, error: { message: "boom" } }));
    await expect(getReferralCount("customer-a")).rejects.toEqual({ message: "boom" });
  });
});

describe("createCustomer — referidos", () => {
  it("guarda id_referidor cuando viene referrerCustomerId", async () => {
    const chain = chainMock({ data: { id: "new-customer" }, error: null });
    mockFrom.mockReturnValue(chain);

    await createCustomer({
      name: "Cliente B",
      phone: "7711234567",
      consentWhatsApp: true,
      referrerCustomerId: "customer-a",
    });

    expect(mockFrom).toHaveBeenCalledWith("clientes");
    const inserted = chain.insert.mock.calls[0][0][0];
    expect(inserted.id_referidor).toBe("customer-a");
    expect(inserted.negocio_id).toBe("test-negocio-id");
    expect(inserted.nombre).toBe("Cliente B");
  });

  it("NO incluye id_referidor cuando no hay referidor", async () => {
    const chain = chainMock({ data: { id: "new-customer" }, error: null });
    mockFrom.mockReturnValue(chain);

    await createCustomer({
      name: "Cliente C",
      phone: "7717654321",
      consentWhatsApp: false,
    });

    const inserted = chain.insert.mock.calls[0][0][0];
    expect("id_referidor" in inserted).toBe(false);
  });

  it("usa el teléfono como nombre cuando no se da nombre", async () => {
    const chain = chainMock({ data: { id: "x" }, error: null });
    mockFrom.mockReturnValue(chain);

    await createCustomer({ phone: "7710000000", consentWhatsApp: true });

    const inserted = chain.insert.mock.calls[0][0][0];
    expect(inserted.nombre).toBe("7710000000");
  });

  it("lanza el error de Supabase si el insert falla", async () => {
    const chain = chainMock({ data: null, error: { message: "duplicate" } });
    mockFrom.mockReturnValue(chain);

    await expect(
      createCustomer({ phone: "7710000000", consentWhatsApp: true })
    ).rejects.toEqual({ message: "duplicate" });
  });
});
