import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before importing services
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockLimit = vi.fn();
const mockOrder = vi.fn();
const mockFrom = vi.fn();

function chainMock() {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    single: mockSingle,
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  // Make chainable methods return the chain
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
  rpc: mockRpc,
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

describe("card.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addStamp", () => {
    it("llama a RPC agregar_sello_a_tarjeta con los parametros correctos", async () => {
      mockRpc.mockResolvedValue({
        data: {
          sellos: 3,
          sellos_maximos: 5,
          estado: "activa",
          evento_id: "evt-123",
        },
        error: null,
      });

      const result = await addStamp("card-1", {
        customerId: "cust-1",
        addedBy: "barista-1",
        drinkType: "Americano",
        size: "12oz",
      });

      expect(mockRpc).toHaveBeenCalledWith("agregar_sello_a_tarjeta", {
        p_tarjeta_id: "card-1",
        p_cliente_id: "cust-1",
        p_agregado_por: "barista-1",
        p_tipo_bebida: "Americano",
        p_tamano: "12oz",
        p_notas: null,
      });

      expect(result).toEqual({
        stamps: 3,
        maxStamps: 5,
        status: "activa",
        eventId: "evt-123",
      });
    });

    it("usa defaults cuando no se pasan opciones", async () => {
      mockRpc.mockResolvedValue({
        data: {
          sellos: 1,
          sellos_maximos: 5,
          estado: "activa",
          evento_id: "evt-456",
        },
        error: null,
      });

      await addStamp("card-2");

      expect(mockRpc).toHaveBeenCalledWith("agregar_sello_a_tarjeta", {
        p_tarjeta_id: "card-2",
        p_cliente_id: null,
        p_agregado_por: "system",
        p_tipo_bebida: null,
        p_tamano: null,
        p_notas: null,
      });
    });

    it("lanza error si RPC falla", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Card not found" },
      });

      await expect(addStamp("bad-card")).rejects.toEqual({
        message: "Card not found",
      });
    });
  });

  describe("undoStamp", () => {
    it("llama a RPC deshacer_sello", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await undoStamp("card-1", "evt-123");

      expect(mockRpc).toHaveBeenCalledWith("deshacer_sello", {
        p_tarjeta_id: "card-1",
        p_evento_id: "evt-123",
      });
    });

    it("lanza error si RPC falla", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Event not found" },
      });

      await expect(undoStamp("card-1", "bad-evt")).rejects.toEqual({
        message: "Event not found",
      });
    });
  });

  describe("redeemCard", () => {
    it("llama a RPC canjear_tarjeta", async () => {
      mockRpc.mockResolvedValue({ data: "new-card-id", error: null });

      const result = await redeemCard({
        oldCardId: "old-card",
        customerId: "cust-1",
        rewardRef: "reward-1",
      });

      expect(mockRpc).toHaveBeenCalledWith("canjear_tarjeta", {
        p_tarjeta_id: "old-card",
        p_cliente_id: "cust-1",
        p_recompensa_id: "reward-1",
      });
      expect(result).toBe("new-card-id");
    });
  });

  describe("getStampEventsByCard", () => {
    it("retorna eventos mapeados al modelo", async () => {
      const chain = chainMock();
      chain.single.mockResolvedValue({ data: null, error: null });
      // For order which is the last in the chain before resolution
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

  describe("createCard", () => {
    it("crea tarjeta con sellos_maximos del reward", async () => {
      // Mock recompensas query
      const rewardChain = chainMock();
      rewardChain.single.mockResolvedValue({
        data: { sellos_requeridos: 8 },
        error: null,
      });

      // Mock tarjetas insert
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

      const card = await createCard({
        customerRef: "cust-1",
        rewardRef: "reward-1",
      });

      expect(card).toMatchObject({ id: "new-card", sellos: 0 });
    });
  });
});
