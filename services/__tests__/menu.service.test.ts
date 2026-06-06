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

  describe("addMenuItem — matemática de precios con tamaños", () => {
    // Helper: mock para addMenuItem. Captura los inserts de cada tabla.
    function setupAddItemMock() {
      const inserts: Array<{ table: string; rows: any }> = [];

      const prodChain: any = {
        insert: vi.fn((rows: any) => {
          inserts.push({ table: "productos", rows });
          return prodChain;
        }),
        select: vi.fn(() => prodChain),
        single: vi.fn(() => Promise.resolve({ data: { id: "new-prod-id" }, error: null })),
      };

      const sizeChain: any = {
        insert: vi.fn((rows: any) => {
          inserts.push({ table: "opciones_tamano", rows });
          return Promise.resolve({ data: null, error: null });
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "productos") return prodChain;
        if (table === "opciones_tamano") return sizeChain;
        return chainMock();
      });

      return { inserts };
    }

    it("3 tamaños: precio_base = price del caller (min), adicionales 0/+10/+20", async () => {
      // Convención del dominio: el admin manda data.price = min(sizes).
      // Americano: 10oz=$45, 12oz=$55, 16oz=$65 → base 45, adicionales 0/10/20.
      const { inserts } = setupAddItemMock();

      await addMenuItem("cat-1", {
        name: "Americano",
        price: 45,
        sizes: [
          { label: "10oz", price: 45 },
          { label: "12oz", price: 55 },
          { label: "16oz", price: 65 },
        ],
        ingredients: [],
        available: true,
        visible: true,
        tags: [],
        highlight: false,
        seasonal: false,
        order: 0,
        schemaVersion: 1,
      });

      const prodInsert = inserts.find((i) => i.table === "productos")!;
      // insert recibe un objeto (no array) en addMenuItem
      expect(prodInsert.rows[0].precio_base).toBe(45);

      const sizeInsert = inserts.find((i) => i.table === "opciones_tamano")!;
      expect(sizeInsert.rows).toEqual([
        { producto_id: "new-prod-id", nombre: "10oz", precio_adicional: 0, orden: 0 },
        { producto_id: "new-prod-id", nombre: "12oz", precio_adicional: 10, orden: 1 },
        { producto_id: "new-prod-id", nombre: "16oz", precio_adicional: 20, orden: 2 },
      ]);
    });

    it("un solo tamaño: precio_base = ese precio, adicional 0", async () => {
      const { inserts } = setupAddItemMock();

      await addMenuItem("cat-1", {
        name: "Espresso",
        price: 38,
        sizes: [{ label: "Único", price: 38 }],
        ingredients: [],
        available: true,
        visible: true,
        tags: [],
        highlight: false,
        seasonal: false,
        order: 0,
        schemaVersion: 1,
      });

      const prodInsert = inserts.find((i) => i.table === "productos")!;
      expect(prodInsert.rows[0].precio_base).toBe(38);

      const sizeInsert = inserts.find((i) => i.table === "opciones_tamano")!;
      expect(sizeInsert.rows).toEqual([
        { producto_id: "new-prod-id", nombre: "Único", precio_adicional: 0, orden: 0 },
      ]);
    });

    it("precios con decimales: sin pérdida de precisión", async () => {
      const { inserts } = setupAddItemMock();

      await addMenuItem("cat-1", {
        name: "Latte",
        price: 45.5,
        sizes: [
          { label: "10oz", price: 45.5 },
          { label: "12oz", price: 55.75 },
        ],
        ingredients: [],
        available: true,
        visible: true,
        tags: [],
        highlight: false,
        seasonal: false,
        order: 0,
        schemaVersion: 1,
      });

      const prodInsert = inserts.find((i) => i.table === "productos")!;
      expect(prodInsert.rows[0].precio_base).toBe(45.5);

      const sizeInsert = inserts.find((i) => i.table === "opciones_tamano")!;
      expect(sizeInsert.rows[0].precio_adicional).toBe(0);
      // 55.75 - 45.5 = 10.25, sin redondeo
      expect(sizeInsert.rows[1].precio_adicional).toBeCloseTo(10.25, 10);
    });

    it("OJO: comportamiento actual — el adicional usa data.price como base, NO min(sizes); un price > algún tamaño se clampa a 0 (ver reporte)", async () => {
      // El servicio NO calcula min(sizes) por sí mismo: confía en data.price.
      // Si el caller manda price=65 (el mayor) con tamaños 45/55/65,
      // los adicionales salen Math.max(0, size - 65) = 0/0/0 (clamp negativo).
      const { inserts } = setupAddItemMock();

      await addMenuItem("cat-1", {
        name: "Mal capturado",
        price: 65, // caller manda el max en vez del min
        sizes: [
          { label: "10oz", price: 45 },
          { label: "12oz", price: 55 },
          { label: "16oz", price: 65 },
        ],
        ingredients: [],
        available: true,
        visible: true,
        tags: [],
        highlight: false,
        seasonal: false,
        order: 0,
        schemaVersion: 1,
      });

      const sizeInsert = inserts.find((i) => i.table === "opciones_tamano")!;
      // OJO: comportamiento actual, ver reporte (clamp Math.max(0, ...) en menu.service.ts:242)
      expect(sizeInsert.rows.map((r: any) => r.precio_adicional)).toEqual([0, 0, 0]);
    });
  });

  describe("updateMenuItem — matemática de precios con tamaños", () => {
    // Helper: mock para updateMenuItem. Captura update de productos + delete/insert de tamaños.
    function setupUpdateItemMock(existingPrecioBase?: number) {
      const captured: {
        productUpdate?: any;
        sizeInserts?: any;
        deletedSizes: boolean;
      } = { deletedSizes: false };

      const prodChain: any = {
        update: vi.fn((data: any) => {
          captured.productUpdate = data;
          return prodChain;
        }),
        select: vi.fn(() => prodChain),
        single: vi.fn(() =>
          Promise.resolve({ data: { precio_base: existingPrecioBase ?? 0 }, error: null })
        ),
        eq: vi.fn(() => prodChain),
      };
      // update().eq().eq() debe resolver sin error
      let prodEqCount = 0;
      prodChain.eq.mockImplementation(() => {
        prodEqCount++;
        if (prodEqCount >= 2) return Promise.resolve({ error: null });
        return prodChain;
      });

      const sizeChain: any = {
        delete: vi.fn(() => sizeChain),
        eq: vi.fn(() => Promise.resolve({ error: null })),
        insert: vi.fn((rows: any) => {
          captured.sizeInserts = rows;
          return Promise.resolve({ error: null });
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "productos") return prodChain;
        if (table === "opciones_tamano") return sizeChain;
        return chainMock();
      });

      return { captured };
    }

    it("3 tamaños con price explícito: update lleva precio_base = min, inserts con adicionales 0/+10/+20", async () => {
      const { captured } = setupUpdateItemMock();

      await updateMenuItem("cat-1", "prod-1", {
        price: 45,
        sizes: [
          { label: "10oz", price: 45 },
          { label: "12oz", price: 55 },
          { label: "16oz", price: 65 },
        ],
      });

      expect(captured.productUpdate.precio_base).toBe(45);
      expect(captured.sizeInserts).toEqual([
        { producto_id: "prod-1", nombre: "10oz", precio_adicional: 0, orden: 0 },
        { producto_id: "prod-1", nombre: "12oz", precio_adicional: 10, orden: 1 },
        { producto_id: "prod-1", nombre: "16oz", precio_adicional: 20, orden: 2 },
      ]);
    });

    it("tamaños en orden NO ascendente [16oz $65, 10oz $45]: con price=45 (min), adicionales por tamaño = +20/0", async () => {
      // El servicio respeta el orden recibido (orden: i). El min lo decide el caller (price).
      // Si el caller pasa price=45 (el verdadero min), los adicionales salen correctos
      // independientemente del orden del array.
      const { captured } = setupUpdateItemMock();

      await updateMenuItem("cat-1", "prod-1", {
        price: 45, // min real, aunque el primer tamaño sea el de $65
        sizes: [
          { label: "16oz", price: 65 },
          { label: "10oz", price: 45 },
        ],
      });

      expect(captured.productUpdate.precio_base).toBe(45);
      // 65-45=20 (orden 0), 45-45=0 (orden 1)
      expect(captured.sizeInserts).toEqual([
        { producto_id: "prod-1", nombre: "16oz", precio_adicional: 20, orden: 0 },
        { producto_id: "prod-1", nombre: "10oz", precio_adicional: 0, orden: 1 },
      ]);
    });

    it("sin price en data: usa precio_base existente del producto para calcular adicionales", async () => {
      // data.price undefined → fetch precio_base actual (45) y calcula adicionales contra él.
      const { captured } = setupUpdateItemMock(45);

      await updateMenuItem("cat-1", "prod-1", {
        sizes: [
          { label: "10oz", price: 45 },
          { label: "12oz", price: 55 },
        ],
      });

      // No se mandó price, así que update de productos no incluye precio_base
      expect(captured.productUpdate?.precio_base).toBeUndefined();
      expect(captured.sizeInserts).toEqual([
        { producto_id: "prod-1", nombre: "10oz", precio_adicional: 0, orden: 0 },
        { producto_id: "prod-1", nombre: "12oz", precio_adicional: 10, orden: 1 },
      ]);
    });

    it("decimales en update: 55.75 - 45.5 = 10.25 sin pérdida", async () => {
      const { captured } = setupUpdateItemMock();

      await updateMenuItem("cat-1", "prod-1", {
        price: 45.5,
        sizes: [
          { label: "10oz", price: 45.5 },
          { label: "12oz", price: 55.75 },
        ],
      });

      expect(captured.productUpdate.precio_base).toBe(45.5);
      expect(captured.sizeInserts[0].precio_adicional).toBe(0);
      expect(captured.sizeInserts[1].precio_adicional).toBeCloseTo(10.25, 10);
    });
  });

  describe("getFullMenu — reconstrucción de precios completos", () => {
    function setupReadMenuMock(precioBase: number, sizes: Array<{ nombre: string; precio_adicional: number; orden: number }>) {
      const catChain = chainMock();
      catChain.resolvesWith({
        data: [{ id: "cat-1", nombre: "Cafe", tipo: "drink", orden: 0, activo: true }],
        error: null,
      });

      const prodChain = chainMock();
      prodChain.resolvesWith({
        data: [
          {
            id: "prod-1",
            categoria_id: "cat-1",
            nombre: "Americano",
            precio_base: precioBase,
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
      sizeChain.resolvesWith({
        data: sizes.map((s) => ({ producto_id: "prod-1", ...s })),
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "categorias_menu") return catChain;
        if (table === "productos") return prodChain;
        if (table === "opciones_tamano") return sizeChain;
        return chainMock();
      });
    }

    it("adicionales [0, +10, +20] + base 45 → precios mostrados 45/55/65", async () => {
      setupReadMenuMock(45, [
        { nombre: "10oz", precio_adicional: 0, orden: 0 },
        { nombre: "12oz", precio_adicional: 10, orden: 1 },
        { nombre: "16oz", precio_adicional: 20, orden: 2 },
      ]);

      const menu = await getFullMenu();
      expect(menu[0].items[0].price).toBe(45);
      expect(menu[0].items[0].sizes).toEqual([
        { label: "10oz", price: 45 },
        { label: "12oz", price: 55 },
        { label: "16oz", price: 65 },
      ]);
    });

    it("round-trip decimales: base 45.5 + adicional 10.25 → precio mostrado 55.75", async () => {
      setupReadMenuMock(45.5, [
        { nombre: "10oz", precio_adicional: 0, orden: 0 },
        { nombre: "12oz", precio_adicional: 10.25, orden: 1 },
      ]);

      const menu = await getFullMenu();
      expect(menu[0].items[0].sizes![0].price).toBe(45.5);
      expect(menu[0].items[0].sizes![1].price).toBeCloseTo(55.75, 10);
    });

    it("precio_adicional null se trata como 0 → precio mostrado = base", async () => {
      // rawSizesByProduct usa (s.precio_adicional ?? 0)
      setupReadMenuMock(50, [{ nombre: "Único", precio_adicional: null as any, orden: 0 }]);

      const menu = await getFullMenu();
      expect(menu[0].items[0].sizes).toEqual([{ label: "Único", price: 50 }]);
    });
  });

  describe("addMenuItem / updateMenuItem — sizes vacío", () => {
    it("addMenuItem con sizes=[] NO inserta en opciones_tamano (comportamiento actual)", async () => {
      const inserts: Array<{ table: string }> = [];
      const prodChain: any = {
        insert: vi.fn(() => {
          inserts.push({ table: "productos" });
          return prodChain;
        }),
        select: vi.fn(() => prodChain),
        single: vi.fn(() => Promise.resolve({ data: { id: "new-prod-id" }, error: null })),
      };
      const sizeChain: any = {
        insert: vi.fn(() => {
          inserts.push({ table: "opciones_tamano" });
          return Promise.resolve({ error: null });
        }),
      };
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "productos") return prodChain;
        if (table === "opciones_tamano") return sizeChain;
        return chainMock();
      });

      const id = await addMenuItem("cat-1", {
        name: "Sin tamaños",
        price: 30,
        sizes: [],
        ingredients: [],
        available: true,
        visible: true,
        tags: [],
        highlight: false,
        seasonal: false,
        order: 0,
        schemaVersion: 1,
      });

      expect(id).toBe("new-prod-id");
      // La guarda `data.sizes && data.sizes.length > 0` hace que [] NO dispare insert de tamaños
      expect(inserts.filter((i) => i.table === "opciones_tamano")).toHaveLength(0);
      // precio_base usa data.price tal cual
      expect(prodChain.insert).toHaveBeenCalledWith([
        expect.objectContaining({ precio_base: 30 }),
      ]);
    });

    it("updateMenuItem con sizes=[] borra los tamaños existentes pero NO inserta nuevos", async () => {
      const captured: { deleted: boolean; inserted: boolean } = { deleted: false, inserted: false };

      const prodChain: any = {
        update: vi.fn(() => prodChain),
        eq: vi.fn(() => prodChain),
      };
      let prodEqCount = 0;
      prodChain.eq.mockImplementation(() => {
        prodEqCount++;
        if (prodEqCount >= 2) return Promise.resolve({ error: null });
        return prodChain;
      });

      const sizeChain: any = {
        delete: vi.fn(() => sizeChain),
        eq: vi.fn(() => {
          captured.deleted = true;
          return Promise.resolve({ error: null });
        }),
        insert: vi.fn(() => {
          captured.inserted = true;
          return Promise.resolve({ error: null });
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "productos") return prodChain;
        if (table === "opciones_tamano") return sizeChain;
        return chainMock();
      });

      await updateMenuItem("cat-1", "prod-1", { price: 30, sizes: [] });

      // sizes !== undefined → entra al bloque, borra existentes
      expect(captured.deleted).toBe(true);
      // pero length === 0 → no inserta
      expect(captured.inserted).toBe(false);
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
