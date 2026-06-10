import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing services
const mockSingle = vi.fn();

type MockChain = Record<string, ReturnType<typeof vi.fn>>;

function chainMock(): MockChain {
  const chain: MockChain = {
    select: vi.fn().mockReturnThis(),
    single: mockSingle,
    maybeSingle: vi.fn(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  return chain;
}

const mockSupabase = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabase,
  NEGOCIO_ID: "test-negocio-id",
}));

import {
  addStamp,
  undoStamp,
  redeemCard,
  getStampEventsByCard,
  getCardByCustomer,
  createCard,
} from "../card.service";

// Helper to mock global fetch
function mockFetchOk(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    }),
  );
}

function mockFetchError(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

describe("card.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // ── addStamp ────────────────────────────────────────────────────────────────

  describe("addStamp", () => {
    it("POST /api/stamp/add con los parámetros correctos y retorna resultado", async () => {
      mockFetchOk({ stamps: 3, maxStamps: 5, status: "activa", eventId: "evt-123" });

      const result = await addStamp("card-1", {
        customerId: "cust-1",
        addedBy: "barista-1",
        drinkType: "Americano",
        size: "12oz",
      });

      const fetchMock = vi.mocked(fetch);
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/stamp/add");
      expect(opts?.method).toBe("POST");

      const sentBody = JSON.parse(opts?.body as string);
      expect(sentBody).toMatchObject({
        cardId: "card-1",
        customerId: "cust-1",
        addedBy: "barista-1",
        drinkType: "Americano",
        size: "12oz",
      });

      expect(result).toEqual({
        stamps: 3,
        maxStamps: 5,
        status: "activa",
        eventId: "evt-123",
      });
    });

    it("usa defaults cuando no se pasan opciones", async () => {
      mockFetchOk({ stamps: 1, maxStamps: 5, status: "activa", eventId: "evt-456" });

      await addStamp("card-2");

      const sentBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(sentBody.cardId).toBe("card-2");
      expect(sentBody.customerId).toBeUndefined();
      expect(sentBody.addedBy).toBeUndefined();
    });

    it("lanza error si la API devuelve error", async () => {
      mockFetchError(500, { error: "Error al agregar sello" });

      await expect(addStamp("bad-card")).rejects.toThrow("Error al agregar sello");
    });
  });

  // ── undoStamp ───────────────────────────────────────────────────────────────

  describe("undoStamp", () => {
    it("POST /api/stamp/undo con cardId y eventId", async () => {
      mockFetchOk({ ok: true });

      await undoStamp("card-1", "evt-123");

      const [url, opts] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("/api/stamp/undo");
      expect(opts?.method).toBe("POST");

      const sentBody = JSON.parse(opts?.body as string);
      expect(sentBody).toEqual({ cardId: "card-1", eventId: "evt-123" });
    });

    it("lanza error si la API falla", async () => {
      mockFetchError(500, { error: "Error al deshacer sello" });

      await expect(undoStamp("card-1", "bad-evt")).rejects.toThrow("Error al deshacer sello");
    });
  });

  // ── redeemCard ──────────────────────────────────────────────────────────────

  describe("redeemCard", () => {
    it("POST /api/stamp/redeem y retorna nuevo cardId", async () => {
      mockFetchOk({ newCardId: "new-card-id" });

      const result = await redeemCard({
        oldCardId: "old-card",
        customerId: "cust-1",
        rewardRef: "reward-1",
      });

      const [url, opts] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("/api/stamp/redeem");
      expect(opts?.method).toBe("POST");

      const sentBody = JSON.parse(opts?.body as string);
      expect(sentBody).toEqual({
        oldCardId: "old-card",
        customerId: "cust-1",
        rewardRef: "reward-1",
      });

      expect(result).toBe("new-card-id");
    });

    it("lanza error si la API falla", async () => {
      mockFetchError(500, { error: "Error al canjear tarjeta" });

      await expect(
        redeemCard({ oldCardId: "old", customerId: "c", rewardRef: "r" }),
      ).rejects.toThrow("Error al canjear tarjeta");
    });
  });

  // ── getStampEventsByCard ────────────────────────────────────────────────────

  describe("getStampEventsByCard", () => {
    it("retorna eventos mapeados al modelo", async () => {
      const chain = chainMock();
      chain.order.mockResolvedValue({
        data: [
          {
            id: "evt-1",
            tarjeta_id: "card-1",
            cliente_id: "cust-1",
            creado_en: "2026-03-11T12:00:00Z",
            tipo_bebida: "Latte",
            tamano: "12oz",
            agregado_por: "barista",
            id_barista: "b-1",
            notas: null,
            origen: "admin",
          },
        ],
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      const events = await getStampEventsByCard("card-1");

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        id: "evt-1",
        cardId: "card-1",
        customerId: "cust-1",
        drinkType: "Latte",
        size: "12oz",
        addedBy: "barista",
      });
    });
  });

  // ── getCardByCustomer ───────────────────────────────────────────────────────

  describe("getCardByCustomer", () => {
    it("retorna tarjeta activa del cliente", async () => {
      const chain = chainMock();
      chain.single.mockResolvedValue({
        data: { id: "card-1", sellos: 3, estado: "activa" },
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      const card = await getCardByCustomer("cust-1");

      expect(card).toMatchObject({ id: "card-1", sellos: 3 });
    });

    it("retorna null si no hay tarjeta (PGRST116)", async () => {
      const chain = chainMock();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });
      mockSupabase.from.mockReturnValue(chain);

      const card = await getCardByCustomer("cust-no-card");
      expect(card).toBe(null);
    });
  });

  // ── createCard ──────────────────────────────────────────────────────────────

  describe("createCard", () => {
    it("crea tarjeta con sellos_maximos del reward", async () => {
      const rewardChain = chainMock();
      rewardChain.maybeSingle.mockResolvedValue({
        data: { id: "default-reward-id", sellos_requeridos: 8 },
        error: null,
      });

      const cardChain = chainMock();
      cardChain.single.mockResolvedValue({
        data: { id: "new-card", sellos: 0, sellos_maximos: 8 },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "recompensas") return rewardChain;
        if (table === "tarjetas") return cardChain;
        return chainMock();
      });

      const card = await createCard({ customerRef: "cust-1" });

      expect(card).toMatchObject({ id: "new-card", sellos: 0 });
    });
  });
});
