import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock de Supabase (patrón thenable, como customer.service.test.ts) ──
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => mockSupabase,
  NEGOCIO_ID: "test-negocio-id",
}));

import { getCustomerStats } from "../card.service";

type MockChain = {
  [key: string]: ReturnType<typeof vi.fn> | ((...args: unknown[]) => unknown);
};

/** Query builder awaitable que resuelve con los eventos dados */
function chainWith(rows: Array<{ creado_en: string; origen: string; tipo_bebida: string | null }>): MockChain {
  const chain: MockChain = {};
  for (const m of ["select", "eq", "order"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null });
  return chain;
}

/** Evento de sello con fecha local a mediodía (evita líos de huso horario) */
const visita = (fecha: string, bebida: string | null = "Latte") => ({
  creado_en: `${fecha}T12:00:00`,
  origen: "stamp",
  tipo_bebida: bebida,
});
const canje = (fecha: string) => ({
  creado_en: `${fecha}T12:00:00`,
  origen: "canje",
  tipo_bebida: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  // "Hoy" fijo: miércoles 3 de junio de 2026, mediodía local
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 3, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getCustomerStats", () => {
  it("sin eventos devuelve estadísticas en cero", async () => {
    mockFrom.mockReturnValue(chainWith([]));
    const s = await getCustomerStats("c1");

    expect(s.totalVisits).toBe(0);
    expect(s.totalRedemptions).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(0);
    expect(s.avgDaysBetween).toBeNull();
    expect(s.favDrink).toBeNull();
    expect(s.favoriteDay).toBeNull();
    expect(s.memberSince).toBeNull();
    expect(s.weeklyActivity).toHaveLength(12);
  });

  it("separa visitas de canjes (origen 'canje' y 'redemption')", async () => {
    mockFrom.mockReturnValue(
      chainWith([
        visita("2026-05-01"),
        canje("2026-05-10"),
        { creado_en: "2026-05-20T12:00:00", origen: "redemption", tipo_bebida: null },
        visita("2026-05-25"),
      ])
    );
    const s = await getCustomerStats("c1");
    expect(s.totalVisits).toBe(2);
    expect(s.totalRedemptions).toBe(2);
  });

  it("calcula la bebida favorita con su conteo", async () => {
    mockFrom.mockReturnValue(
      chainWith([
        visita("2026-05-01", "Latte"),
        visita("2026-05-02", "Cappuccino"),
        visita("2026-05-03", "Latte"),
        visita("2026-05-04", null), // sin bebida no cuenta
      ])
    );
    const s = await getCustomerStats("c1");
    expect(s.favDrink).toBe("Latte");
    expect(s.favDrinkCount).toBe(2);
  });

  it("racha actual: días consecutivos que terminan hoy", async () => {
    mockFrom.mockReturnValue(
      chainWith([visita("2026-06-01"), visita("2026-06-02"), visita("2026-06-03")])
    );
    const s = await getCustomerStats("c1");
    expect(s.currentStreak).toBe(3);
    expect(s.bestStreak).toBe(3);
  });

  it("racha actual sigue viva si la última visita fue ayer", async () => {
    mockFrom.mockReturnValue(chainWith([visita("2026-06-01"), visita("2026-06-02")]));
    const s = await getCustomerStats("c1");
    expect(s.currentStreak).toBe(2);
  });

  it("racha actual muere si la última visita fue hace 2+ días, pero bestStreak se conserva", async () => {
    mockFrom.mockReturnValue(
      chainWith([
        visita("2026-05-10"),
        visita("2026-05-11"),
        visita("2026-05-12"),
        visita("2026-05-30"),
      ])
    );
    const s = await getCustomerStats("c1");
    expect(s.currentStreak).toBe(0);
    expect(s.bestStreak).toBe(3);
  });

  it("varias visitas el mismo día cuentan como un solo día para la racha", async () => {
    mockFrom.mockReturnValue(
      chainWith([
        visita("2026-06-02", "Latte"),
        { creado_en: "2026-06-02T18:00:00", origen: "stamp", tipo_bebida: "Moka" },
        visita("2026-06-03"),
      ])
    );
    const s = await getCustomerStats("c1");
    expect(s.currentStreak).toBe(2);
    expect(s.totalVisits).toBe(3);
  });

  it("promedio de días entre visitas", async () => {
    // 1-may y 31-may: 30 días entre primera y última, 3 visitas → 30/2 = 15
    mockFrom.mockReturnValue(
      chainWith([visita("2026-05-01"), visita("2026-05-16"), visita("2026-05-31")])
    );
    const s = await getCustomerStats("c1");
    expect(s.avgDaysBetween).toBe(15);
  });

  it("avgDaysBetween es null con menos de 2 visitas", async () => {
    mockFrom.mockReturnValue(chainWith([visita("2026-05-01")]));
    const s = await getCustomerStats("c1");
    expect(s.avgDaysBetween).toBeNull();
  });

  it("día favorito de la semana", async () => {
    // 1-jun-2026 es lunes; 2 lunes vs 1 miércoles
    mockFrom.mockReturnValue(
      chainWith([visita("2026-05-25"), visita("2026-06-01"), visita("2026-06-03")])
    );
    const s = await getCustomerStats("c1");
    expect(s.favoriteDay).toBe("Lunes");
  });

  it("memberSince es la fecha del primer evento", async () => {
    mockFrom.mockReturnValue(chainWith([visita("2026-04-15"), visita("2026-06-01")]));
    const s = await getCustomerStats("c1");
    expect(s.memberSince?.getFullYear()).toBe(2026);
    expect(s.memberSince?.getMonth()).toBe(3); // abril
    expect(s.memberSince?.getDate()).toBe(15);
  });

  it("weeklyActivity cubre 12 semanas y cuenta visitas de esta semana", async () => {
    mockFrom.mockReturnValue(chainWith([visita("2026-06-01"), visita("2026-06-02")]));
    const s = await getCustomerStats("c1");
    expect(s.weeklyActivity).toHaveLength(12);
    // La última semana (actual) debe contener las 2 visitas
    expect(s.weeklyActivity[11].count).toBe(2);
    // Las semanas viejas en cero
    expect(s.weeklyActivity[0].count).toBe(0);
  });

  it("propaga errores de Supabase", async () => {
    const chain: MockChain = {};
    for (const m of ["select", "eq", "order"]) chain[m] = vi.fn().mockReturnValue(chain);
    chain.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: { message: "boom" } });
    mockFrom.mockReturnValue(chain);

    await expect(getCustomerStats("c1")).rejects.toEqual({ message: "boom" });
  });
});
