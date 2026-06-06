import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { StampEvent } from "@/models/stamp-event.model";

/** Fallback si el reward no existe o no tiene requiredStamps */
const DEFAULT_MAX_STAMPS = 5;

export async function createCard(params: {
  customerRef: string;
  rewardRef?: string;
}) {
  const supabase = getSupabase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let rewardId: string | undefined;
  let maxStamps = DEFAULT_MAX_STAMPS;

  // Si se pasa un UUID válido, usarlo directamente
  if (params.rewardRef && uuidRegex.test(params.rewardRef)) {
    rewardId = params.rewardRef;
    const { data: rewardData } = await supabase
      .from("recompensas")
      .select("sellos_requeridos")
      .eq("id", rewardId)
      .eq("negocio_id", NEGOCIO_ID)
      .single();
    maxStamps = rewardData?.sellos_requeridos ?? DEFAULT_MAX_STAMPS;
  }

  // Si no tenemos un rewardId válido, buscar la recompensa default
  // (la más nueva: el versionado de diseño puede dejar defaults viejos degradados)
  if (!rewardId) {
    const { data: defaultReward, error: defaultError } = await supabase
      .from("recompensas")
      .select("id, sellos_requeridos")
      .eq("negocio_id", NEGOCIO_ID)
      .eq("es_default", true)
      .eq("activa", true)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (defaultError || !defaultReward) {
      logger.error("card-service", "Error buscando recompensa default", defaultError);
      throw new Error("No hay recompensa default configurada para este negocio.");
    }

    rewardId = defaultReward.id;
    maxStamps = defaultReward.sellos_requeridos;
  }

  const cardData = {
    negocio_id: NEGOCIO_ID,
    cliente_id: params.customerRef,
    recompensa_id: rewardId,
    sellos: 0,
    sellos_maximos: maxStamps,
    estado: "activa",
    creado_en: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("tarjetas")
    .insert([cardData])
    .select()
    .single();

  if (error) {
    logger.error("card-service", "Error creando tarjeta", error);
    throw error;
  }
  return data;
}

export type AddStampResult = {
  stamps: number;
  maxStamps: number;
  status: string;
  eventId: string;
};

export async function addStamp(
  cardId: string,
  options?: {
    customerId?: string;
    addedBy?: string;
    drinkType?: string;
    size?: string;
  },
): Promise<AddStampResult> {
  const supabase = getSupabase();

  // Call the PostgreSQL function
  const { data, error } = await supabase.rpc("agregar_sello_a_tarjeta", {
    p_tarjeta_id: cardId,
    p_cliente_id: options?.customerId || null,
    p_agregado_por: options?.addedBy || "system",
    p_tipo_bebida: options?.drinkType || null,
    p_tamano: options?.size || null,
    p_notas: null,
  });

  if (error) throw error;

  return {
    stamps: data.sellos,
    maxStamps: data.sellos_maximos,
    status: data.estado,
    eventId: data.evento_id,
  };
}

/**
 * Otorga un sello de bono al referidor cuando el cliente referido recibe su primer sello.
 */
export async function awardReferralBonusIfNeeded(
  referredCustomerId: string,
): Promise<void> {
  const supabase = getSupabase();

  // Get customer data
  const { data: customer, error: customerError } = await supabase
    .from("clientes")
    .select("id_referidor, bono_referido_entregado")
    .eq("id", referredCustomerId)
    .eq("negocio_id", NEGOCIO_ID)
    .single();

  if (customerError || !customer) return;
  if (!customer.id_referidor || customer.bono_referido_entregado) return;

  // Get active card for referrer
  const { data: referrerCard, error: cardError } = await supabase
    .from("tarjetas")
    .select("id, sellos, sellos_maximos, estado")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("cliente_id", customer.id_referidor)
    .eq("estado", "activa")
    .limit(1)
    .single();

  if (cardError || !referrerCard) return;
  if (referrerCard.sellos >= referrerCard.sellos_maximos) return;

  // Award bonus via RPC
  const { error: bonusError } = await supabase.rpc("agregar_sello_a_tarjeta", {
    p_tarjeta_id: referrerCard.id,
    p_cliente_id: customer.id_referidor,
    p_agregado_por: "system",
    p_tipo_bebida: null,
    p_tamano: null,
    p_notas: "Bono por referido",
  });

  if (bonusError) return; // Don't block main flow

  // Mark bonus as delivered
  const { error: updateError } = await supabase
    .from("clientes")
    .update({ bono_referido_entregado: true })
    .eq("id", referredCustomerId)
    .eq("negocio_id", NEGOCIO_ID);

  if (updateError) return;
}

export async function undoStamp(
  cardId: string,
  eventId: string,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.rpc("deshacer_sello", {
    p_tarjeta_id: cardId,
    p_evento_id: eventId,
  });

  if (error) throw error;
}

export async function redeemCard(params: {
  oldCardId: string;
  customerId: string;
  rewardRef: string;
}) {
  const supabase = getSupabase();

  // Call the RPC function to redeem and create new card
  const { data, error } = await supabase.rpc("canjear_tarjeta", {
    p_tarjeta_id: params.oldCardId,
    p_cliente_id: params.customerId,
    p_recompensa_id: params.rewardRef,
  });

  if (error) throw error;
  return data; // Returns new card ID
}

export async function getStampEventsByCard(
  cardId: string,
): Promise<(StampEvent & { id: string })[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("eventos_sello")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("tarjeta_id", cardId)
    .order("creado_en", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    cardId: row.tarjeta_id,
    customerId: row.cliente_id,
    createdAt: new Date(row.creado_en),
    drinkType: row.tipo_bebida,
    size: row.tamano,
    addedBy: row.agregado_por,
    baristaId: row.id_barista,
    notes: row.notas,
    source: row.origen,
    schemaVersion: 1,
  }));
}

export async function getLastStampEvent(
  cardId: string,
): Promise<(StampEvent & { id: string }) | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("eventos_sello")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("tarjeta_id", cardId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    cardId: data.tarjeta_id,
    customerId: data.cliente_id,
    createdAt: new Date(data.creado_en),
    drinkType: data.tipo_bebida,
    size: data.tamano,
    addedBy: data.agregado_por,
    baristaId: data.id_barista,
    notes: data.notas,
    source: data.origen,
  };
}

/** Estadísticas calculadas a partir de los eventos de un cliente */
export interface CustomerStats {
  /** Racha actual: días consecutivos con al menos 1 visita */
  currentStreak: number;
  /** Racha más larga histórica */
  bestStreak: number;
  /** Promedio de días entre visitas */
  avgDaysBetween: number | null;
  /** Bebida más pedida */
  favDrink: string | null;
  /** Conteo de la bebida favorita */
  favDrinkCount: number;
  /** Total de visitas (sin contar canjes) */
  totalVisits: number;
  /** Total de canjes */
  totalRedemptions: number;
  /** Actividad por semana (últimas 12 semanas): [{ weekLabel, count }] */
  weeklyActivity: { weekLabel: string; count: number }[];
  /** Día de la semana que más visita (0=dom, 6=sab) */
  favoriteDay: string | null;
  /** Cliente desde (primera visita) */
  memberSince: Date | null;
}

/**
 * Calcula estadísticas del cliente a partir de TODOS sus eventos
 * (no solo los de la tarjeta activa).
 */
export async function getCustomerStats(customerId: string): Promise<CustomerStats> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("eventos_sello")
    .select("creado_en, origen, tipo_bebida")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("cliente_id", customerId)
    .order("creado_en", { ascending: true });

  if (error) throw error;

  const events = (data || []).map((r) => ({
    date: new Date(r.creado_en),
    source: r.origen as string,
    drinkType: r.tipo_bebida as string | null,
  }));

  const visits = events.filter((e) => e.source !== "redemption" && e.source !== "canje");
  const redemptions = events.filter((e) => e.source === "redemption" || e.source === "canje");

  // — Bebida favorita —
  const drinkCounts: Record<string, number> = {};
  for (const v of visits) {
    if (v.drinkType) drinkCounts[v.drinkType] = (drinkCounts[v.drinkType] ?? 0) + 1;
  }
  const sorted = Object.entries(drinkCounts).sort((a, b) => b[1] - a[1]);
  const favDrink = sorted[0]?.[0] ?? null;
  const favDrinkCount = sorted[0]?.[1] ?? 0;

  // — Días únicos con visitas (para racha) —
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const uniqueDays = [...new Set(visits.map((v) => dayKey(v.date)))].sort();

  // — Racha actual y mejor racha —
  let currentStreak = 0;
  let bestStreak = 0;
  if (uniqueDays.length > 0) {
    const parseDayKey = (k: string) => {
      const [y, m, d] = k.split("-").map(Number);
      return new Date(y, m, d);
    };

    const today = new Date();
    const todayKey = dayKey(today);
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = dayKey(yesterdayDate);

    // Calcular streaks caminando los días únicos
    let streak = 1;
    bestStreak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = parseDayKey(uniqueDays[i - 1]);
      const curr = parseDayKey(uniqueDays[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      if (diffDays === 1) {
        streak++;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 1;
      }
    }

    // La racha actual solo cuenta si el último día es hoy o ayer
    const lastDay = uniqueDays[uniqueDays.length - 1];
    currentStreak = (lastDay === todayKey || lastDay === yesterdayKey) ? streak : 0;
  }

  // — Promedio de días entre visitas —
  let avgDaysBetween: number | null = null;
  if (visits.length >= 2) {
    const first = visits[0].date.getTime();
    const last = visits[visits.length - 1].date.getTime();
    avgDaysBetween = Math.round((last - first) / 86400000 / (visits.length - 1));
  }

  // — Día favorito de la semana —
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // dom-sab
  for (const v of visits) dayCounts[v.date.getDay()]++;
  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const maxDay = dayCounts.indexOf(Math.max(...dayCounts));
  const favoriteDay = visits.length > 0 ? dayNames[maxDay] : null;

  // — Actividad por semana (últimas 12 semanas) —
  const weeklyActivity: { weekLabel: string; count: number }[] = [];
  const now = new Date();
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const count = visits.filter(
      (v) => v.date >= weekStart && v.date < weekEnd
    ).length;

    const label = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(weekStart);
    weeklyActivity.push({ weekLabel: label, count });
  }

  return {
    currentStreak,
    bestStreak,
    avgDaysBetween,
    favDrink,
    favDrinkCount,
    totalVisits: visits.length,
    totalRedemptions: redemptions.length,
    weeklyActivity,
    favoriteDay,
    memberSince: events.length > 0 ? events[0].date : null,
  };
}

export async function getCardByCustomer(customerRef: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("tarjetas")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("cliente_id", customerRef)
    .eq("estado", "activa")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}
