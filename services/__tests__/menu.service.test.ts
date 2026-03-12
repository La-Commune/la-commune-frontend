import { describe, it, expect, vi, beforeEach } from "vitest";

// Helper to create chainable mock
function chainMock(resolvedValue?: { data: any; error: any }) {
  const defaultVal = resolvedValue || { data: [], error: null };
  // Create a thenable chain: every method returns the chain,
  // and the chain itself is a thenable that resolves to _resolveWith
  const chain: any = { _resolveWith: defaultVal };
  const makeSelf = () => chain;
  chain.select = vi.fn(makeSelf);
  chain.single = vi.fn(() => Promise.resolve(chain._resolveWith));
  chain.eq = vi.fn(makeSelf);
  chain.is = vi.fn(makeSelf);
  chain.order = vi.fn(makeSelf);
  chain.insert = vi.fn(makeSelf);
  chain.update = vi.fn(makeSelf);
  chain.delete = vi.fn(makeSelf);
  chain.not = vi.fn(makeSelf);
  // Make chain awaitable (thenable)
  chain.then = (resolve: any, reject?: any) => Promise.resolve(chain._resolveWith).then(resolve, reject);
  // Helper: set the data the chain will resolve with
  chain.resolvesWith = (val: { data: any; error: any }) => { chain._resolveWith = val; return chain; };
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
  getFullMenu,
  updateMenuItem,
  addMenuItem,
  deleteMenuItem,
  addMenuSection,
  updateMenuSection,
  deleteMenuSection,
} from "../menu.service";

describe("menu.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFullMenu", () => {
    it("retorna secciones con items mapeados correctamente", async () => {
      const catChain = chainMock();
      // categorias query ends with order()
      catChain.resolvesWith({
        data: [
          {
            id: "cat-1",
            nombre: "Cafe Caliente",
            descripcion: "Bebidas intensas",
            tipo: "drink",
            orden: 0,
            activo: true,
          },
        ],
        error: null,
      });

      const prodChain = chainMock();
      prodChain.resolvesWith({
        data: [
          {
            id: "prod-1",
            categoria_id: "cat-1",
            nombre: "Americano",
            precio_base: 45,
            ingredientes: ["cafe"],
            opcionales: [],
            nota: "Clasico",
            descripcion: "",
            imagen_url: null,
            disponible: true,
            visible_menu: true,
            etiquetas: ["fuerte"],
            destacado: false,
            estacional: false,
            orden: 0,
          },
        ],
        error: null,
      });

      const sizeChain = chainMock();
      sizeChain.resolvesWith({
        data: [
          { producto_id: "prod-1", nombre: "10oz", precio_adicional: 0, orden: 0 },
          { producto_id: "prod-1", nombre: "12oz", precio_adicional: 10, orden: 1 },
        ],
        error: null,
      });

      let fromCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "categorias_menu") return catChain;
        if (table === "productos") return prodChain;
        if (table === "opciones_tamano") return sizeChain;
        return chainMock();
      });

      const menu = await getFullMenu();

      expect(menu).toHaveLength(1);
      expect(menu[0].title).toBe("Cafe Caliente");
      expect(menu[0].items).toHaveLength(1);
      expect(menu[0].items[0].name).toBe("Americano");
      expect(menu[0].items[0].price).toBe(45);
      // Sizes: 10oz = 45+0, 12oz = 45+10
      expect(menu[0].items[0].sizes).toEqual([
        { label: "10oz", price: 45 },
        { label: "12oz", price: 55 },
      ]);
    });

    it("filtra productos no disponibles en modo publico", async () => {
      const catChain = chainMock();
      catChain.resolvesWith({
        data: [{ id: "cat-1", nombre: "Cat", tipo: "drink", orden: 0, activo: true }],
        error: null,
      });

      const prodChain = chainMock();
      // En modo publico el query ya filtra con .eq("disponible", true)
      // asi que el mock simula que solo retorna los disponibles
      prodChain.resolvesWith({ data: [], error: null });

      const sizeChain = chainMock();
      sizeChain.resolvesWith({ data: [], error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "categorias_menu") return catChain;
        if (table === "productos") return prodChain;
        if (table === "opciones_tamano") return sizeChain;
        return chainMock();
      });

      const menu = await getFullMenu(); // sin forAdmin
      expect(menu[0].items).toHaveLength(0);
    });

    it("retorna items sin sizes cuando no hay opciones_tamano", async () => {
      const catChain = chainMock();
      catChain.resolvesWith({
        data: [{ id: "cat-1", nombre: "Cat", tipo: "drink", orden: 0, activo: true }],
        error: null,
      });

      const prodChain = chainMock();
      prodChain.resolvesWith({
        data: [
          {
            id: "prod-1",
            categoria_id: "cat-1",
            nombre: "Te Verde",
            precio_base: 35,
            ingredientes: [],
            opcionales: [],
            nota: "",
            descripcion: "",
            imagen_url: null,
            disponible: true,
            visible_menu: true,
            etiquetas: [],
            destacado: false,
            estacional: false,
            orden: 0,
          },
        ],
        error: null,
      });

      const sizeChain = chainMock();
      sizeChain.resolvesWith({ data: [], error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "categorias_menu") return catChain;
        if (table === "productos") return prodChain;
        if (table === "opciones_tamano") return sizeChain;
        return chainMock();
      });

      const menu = await getFullMenu();
      expect(menu[0].items[0].sizes).toBeUndefined();
      expect(menu[0].items[0].price).toBe(35);
    });
  });

  describe("deleteMenuItem", () => {
    it("hace soft delete con eliminado_en", async () => {
      const chain = chainMock();
      chain.eq.mockReturnValue(chain);
      chain.eq.mockResolvedValue({ error: null });
      // Need to handle the chain: update().eq().eq()
      const updateChain: any = {
        eq: vi.fn().mockReturnThis(),
      };
      updateChain.eq.mockReturnValue(updateChain);
      // Last eq resolves
      let eqCallCount = 0;
      updateChain.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: null });
        }
        return updateChain;
      });

      const baseChain: any = {
        update: vi.fn().mockReturnValue(updateChain),
      };

      mockSupabase.from.mockReturnValue(baseChain);

      await deleteMenuItem("cat-1", "item-1");

      expect(mockSupabase.from).toHaveBeenCalledWith("productos");
      expect(baseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ eliminado_en: expect.any(String) })
      );
    });
  });

  describe("addMenuSection", () => {
    it("inserta categoria correctamente", async () => {
      const chain: any = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "new-cat-id" },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(chain);

      const id = await addMenuSection({
        title: "Nueva Seccion",
        description: "Desc",
        type: "drink",
        order: 5,
        active: true,
        schemaVersion: 1,
      });

      expect(id).toBe("new-cat-id");
      expect(mockSupabase.from).toHaveBeenCalledWith("categorias_menu");
    });
  });

  describe("deleteMenuSection", () => {
    it("hace soft delete de categoria y sus productos", async () => {
      let updateCalls: Array<{ table: string; data: any }> = [];

      const makeUpdateChain = (table: string) => {
        const chain: any = {
          update: vi.fn().mockImplementation((data: any) => {
            updateCalls.push({ table, data });
            return chain;
          }),
          eq: vi.fn().mockReturnThis(),
        };
        let eqCount = 0;
        chain.eq.mockImplementation(() => {
          eqCount++;
          if (eqCount >= 2) {
            return Promise.resolve({ error: null });
          }
          return chain;
        });
        return chain;
      };

      mockSupabase.from.mockImplementation((table: string) => {
        return makeUpdateChain(table);
      });

      await deleteMenuSection("cat-1");

      // Debe llamar from("productos") y from("categorias_menu")
      const fromCalls = mockSupabase.from.mock.calls.map((c: any) => c[0]);
      expect(fromCalls).toContain("productos");
      expect(fromCalls).toContain("categorias_menu");
    });
  });
});
