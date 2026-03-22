import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";

/**
 * @deprecated Use card.service.ts addStamp() instead
 * This file is kept for backward compatibility
 */
export async function addStamp(params: {
  cardId: string;
  customerId?: string;
  source?: "manual" | "promo";
}) {
  const supabase = getSupabase();

  // Call the RPC function from card service
  const { data, error } = await supabase.rpc("agregar_sello_a_tarjeta", {
    p_tarjeta_id: params.cardId,
    p_cliente_id: params.customerId || null,
    p_agregado_por: "system",
    p_tipo_bebida: null,
    p_tamano: null,
    p_notas: null,
  });

  if (error) throw error;
  return data;
}
  