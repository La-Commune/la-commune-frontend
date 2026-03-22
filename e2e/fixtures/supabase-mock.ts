import { Page } from "@playwright/test";

// Datos mock para interceptar las llamadas a Supabase REST API
export const MOCK_CUSTOMER = {
  id: "test-customer-001",
  nombre: "Test User",
  telefono: "5551234567",
  email: null,
  activo: true,
  total_sellos: 3,
  nivel: "bronce",
  puntos: 150,
  negocio_id: "test-negocio-001",
  creado_en: "2026-01-15T10:00:00Z",
};

export const MOCK_CARD = {
  id: "test-card-001",
  cliente_id: "test-customer-001",
  negocio_id: "test-negocio-001",
  sellos: 3,
  sellos_maximos: 5,
  estado: "activa",
  creado_en: "2026-01-15T10:00:00Z",
};

export const MOCK_REWARD = {
  id: "test-reward-001",
  negocio_id: "test-negocio-001",
  nombre: "Café gratis",
  descripcion: "Tu siguiente café va por nuestra cuenta",
  sellos_maximos: 5,
  activo: true,
};

export const MOCK_STAMP_EVENTS = [
  {
    id: "evt-1",
    tarjeta_id: "test-card-001",
    tipo_bebida: "Americano",
    notas: null,
    tamano: "12 oz",
    agregado_por: "barista-001",
    creado_en: "2026-02-01T09:00:00Z",
  },
  {
    id: "evt-2",
    tarjeta_id: "test-card-001",
    tipo_bebida: "Latte",
    notas: null,
    tamano: "16 oz",
    agregado_por: "barista-001",
    creado_en: "2026-02-10T14:00:00Z",
  },
  {
    id: "evt-3",
    tarjeta_id: "test-card-001",
    tipo_bebida: "Cappuccino",
    notas: null,
    tamano: "10 oz",
    agregado_por: "barista-001",
    creado_en: "2026-03-01T11:00:00Z",
  },
];

export const MOCK_CATEGORIES = [
  { id: "cat-1", nombre: "Café Caliente", tipo: "drink", orden: 0, activo: true, negocio_id: "test-negocio-001" },
  { id: "cat-2", nombre: "Café Frío", tipo: "drink", orden: 1, activo: true, negocio_id: "test-negocio-001" },
];

export const MOCK_PRODUCTS = [
  {
    id: "prod-1",
    categoria_id: "cat-1",
    nombre: "Americano",
    precio_base: 45,
    disponible: true,
    visible_menu: true,
    negocio_id: "test-negocio-001",
  },
  {
    id: "prod-2",
    categoria_id: "cat-1",
    nombre: "Latte",
    precio_base: 55,
    disponible: true,
    visible_menu: true,
    negocio_id: "test-negocio-001",
  },
];

export const MOCK_PROMOTIONS: unknown[] = [];

/**
 * Configura interceptores de red para mockear la API REST de Supabase.
 * Se llama al inicio de cada test que necesita datos simulados.
 */
export async function setupSupabaseMocks(page: Page) {
  // Interceptar llamadas REST a Supabase
  await page.route("**/rest/v1/clientes*", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (method === "GET") {
      // Si busca por teléfono (para verificar duplicado en onboarding)
      if (url.includes("telefono=eq.")) {
        await route.fulfill({ json: [] }); // No existe
      } else {
        await route.fulfill({ json: [MOCK_CUSTOMER] });
      }
    } else if (method === "POST") {
      await route.fulfill({ json: [MOCK_CUSTOMER] });
    } else {
      await route.continue();
    }
  });

  await page.route("**/rest/v1/tarjetas*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ json: [MOCK_CARD] });
    } else if (method === "POST") {
      await route.fulfill({ json: [MOCK_CARD] });
    } else {
      await route.continue();
    }
  });

  await page.route("**/rest/v1/recompensas*", async (route) => {
    await route.fulfill({ json: [MOCK_REWARD] });
  });

  await page.route("**/rest/v1/eventos_sello*", async (route) => {
    await route.fulfill({ json: MOCK_STAMP_EVENTS });
  });

  await page.route("**/rest/v1/categorias_menu*", async (route) => {
    await route.fulfill({ json: MOCK_CATEGORIES });
  });

  await page.route("**/rest/v1/productos*", async (route) => {
    await route.fulfill({ json: MOCK_PRODUCTS });
  });

  await page.route("**/rest/v1/opciones_tamano*", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route("**/rest/v1/promociones*", async (route) => {
    await route.fulfill({ json: MOCK_PROMOTIONS });
  });

  // Interceptar RPCs
  await page.route("**/rest/v1/rpc/agregar_sello_a_tarjeta", async (route) => {
    await route.fulfill({
      json: { ...MOCK_CARD, sellos: MOCK_CARD.sellos + 1 },
    });
  });

  await page.route("**/rest/v1/rpc/login_por_pin", async (route) => {
    await route.fulfill({
      json: {
        user_id: "barista-001",
        nombre: "David",
        rol: "admin",
      },
    });
  });

  await page.route("**/rest/v1/rpc/deshacer_sello", async (route) => {
    await route.fulfill({
      json: { ...MOCK_CARD, sellos: Math.max(0, MOCK_CARD.sellos - 1) },
    });
  });

  await page.route("**/rest/v1/rpc/canjear_tarjeta", async (route) => {
    await route.fulfill({
      json: {
        ...MOCK_CARD,
        id: "test-card-002",
        sellos: 0,
        estado: "activa",
      },
    });
  });

  // Interceptar Realtime websocket (evitar errores de conexión)
  await page.route("**/realtime/v1/**", async (route) => {
    await route.abort();
  });
}

/**
 * Simula una sesión de barista inyectando la cookie directamente.
 */
export async function mockBaristaSession(page: Page, context: any) {
  // La cookie barista-session se usa para auth del admin panel.
  // En tests, la interceptamos a nivel de server action.
  await page.route("**/admin", async (route, request) => {
    if (request.method() === "POST") {
      // Interceptar el server action de verificación de PIN
      await route.continue();
    } else {
      await route.continue();
    }
  });
}
