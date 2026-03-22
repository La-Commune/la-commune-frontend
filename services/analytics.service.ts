import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";

export interface StampEventRaw {
  id: string;
  createdAt: Date;
  source: string;
  drinkType?: string;
}

const BATCH_SIZE = 500;

/**
 * Fetch all stamp events from Supabase with optional date range filter.
 * Uses cursor-based pagination to handle large datasets.
 */
async function fetchAllStampEventsPaginated(
  whereClause?: { column: string; value: unknown; operator?: string }
): Promise<StampEventRaw[]> {
  const supabase = getSupabase();
  const results: StampEventRaw[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase
      .from("eventos_sello")
      .select("id, creado_en, origen, tipo_bebida")
      .eq("negocio_id", NEGOCIO_ID)
      .order("creado_en", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (whereClause) {
      if (whereClause.operator === ">=") {
        query = query.gte(whereClause.column, whereClause.value);
      } else {
        query = query.eq(whereClause.column, whereClause.value);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) break;

    data.forEach((row) => {
      results.push({
        id: row.id,
        createdAt: new Date(row.creado_en),
        source: row.origen,
        drinkType: row.tipo_bebida,
      });
    });

    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return results;
}

/**
 * Get stamp events created on or after a specific date
 */
export async function getStampEventsInRange(
  fromDate: Date
): Promise<StampEventRaw[]> {
  return fetchAllStampEventsPaginated({
    column: "creado_en",
    value: fromDate.toISOString(),
    operator: ">=",
  });
}

/**
 * Get ALL stamp events using cursor-based pagination.
 * Iterates in batches of 500 until all data is fetched.
 */
export async function getAllStampEvents(): Promise<StampEventRaw[]> {
  return fetchAllStampEventsPaginated();
}

/**
 * Count total active customers without fetching full documents
 */
export async function getTotalCustomers(): Promise<number> {
  const supabase = getSupabase();

  const { count, error } = await supabase
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("negocio_id", NEGOCIO_ID)
    .eq("activo", true);

  if (error) throw error;
  return count || 0;
}

/**
 * Count total redemptions without fetching full documents
 */
export async function getTotalRedemptions(): Promise<number> {
  const supabase = getSupabase();

  const { count, error } = await supabase
    .from("eventos_sello")
    .select("id", { count: "exact", head: true })
    .eq("negocio_id", NEGOCIO_ID)
    .eq("origen", "canje");

  if (error) throw error;
  return count || 0;
}

/**
 * Get top drinks ordered by a specific customer
 */
export async function getCustomerTopDrinks(
  customerId: string,
  limitN = 3
): Promise<{ drink: string; count: number }[]> {
  const events = await fetchAllStampEventsPaginated({
    column: "cliente_id",
    value: customerId,
  });

  const drinkCount: Record<string, number> = {};
  events.forEach((e) => {
    if (e.drinkType && e.source !== "canje") {
      drinkCount[e.drinkType] = (drinkCount[e.drinkType] ?? 0) + 1;
    }
  });

  return Object.entries(drinkCount)
    .map(([drink, count]) => ({ drink, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limitN);
}
