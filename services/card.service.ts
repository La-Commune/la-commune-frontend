import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { Card } from "@/models/card.model";
import { Reward } from "@/models/reward.model";
import { StampEvent } from "@/models/stamp-event.model";

/** Fallback si el reward no existe o no tiene requiredStamps */
const DEFAULT_MAX_STAMPS = 5;

export async function createCard(params: {
  customerRef: string;
  rewardRef: string;
}) {
  const supabase = getSupabase();

  // Leer requiredStamps del reward en vez de hardcodear
  const { data: rewardData } = await supabase
    .from("recompensas")
    .select("sellos_requeridos")
    .eq("id", params.rewardRef)
    .eq("negocio_id", NEGOCIO_ID)
    .single();

  const maxStamps = rewardData?.sellos_requeridos ?? DEFAULT_MAX_STAMPS;

  const cardData = {
    negocio_id: NEGOCIO_ID,
    cliente_id: params.customerRef,
    recompensa_id: params.rewardRef,
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

  if (error) throw error;
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
