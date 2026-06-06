import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { Reward, RecompensaRow, mapRecompensaToReward } from "@/models/reward.model";

/**
 * Recompensa default ACTUAL (la más reciente marcada es_default).
 * Se ordena por creado_en desc para que, si llegara a existir más de un
 * default transitorio (ventana del versionado), siempre gane el más nuevo.
 */
export async function getDefaultReward(): Promise<
  (Reward & { id: string }) | null
> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("recompensas")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("es_default", true)
    .eq("activa", true)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  return mapRecompensaToReward(data as RecompensaRow);
}

/**
 * Recompensa específica por id — la que una tarjeta tiene asignada
 * vía tarjetas.recompensa_id. Las tarjetas conservan así el diseño
 * con el que fueron creadas aunque el default cambie (DAV-67).
 */
export async function getRewardById(
  rewardId: string,
): Promise<(Reward & { id: string }) | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("recompensas")
    .select("*")
    .eq("id", rewardId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  return mapRecompensaToReward(data as RecompensaRow);
}

export type UpsertDefaultRewardResult = {
  /** true si el cambio de ilustración creó una nueva versión de la recompensa */
  versioned: boolean;
};

/**
 * Crea o actualiza el reward "default" con VERSIONADO por diseño (DAV-67):
 *
 * - Si NO existe default → inserta uno nuevo.
 * - Si la ilustración CAMBIÓ → inserta una NUEVA fila default y degrada la
 *   anterior (es_default=false, pero sigue activa=true para que las tarjetas
 *   existentes puedan seguir leyendo su diseño con la anon key — la RLS de
 *   anon solo permite SELECT con activa=true).
 * - Si la ilustración no cambió → actualiza la fila in place (textos/sellos
 *   sí deben propagarse: corregir un typo no amerita versión nueva).
 *
 * Así las tarjetas existentes (tarjetas.recompensa_id) conservan el diseño
 * con el que nacieron, y solo las tarjetas nuevas toman el diseño nuevo.
 *
 * Recibe el client por parámetro: el flujo real corre en una server action
 * con service role (anon no tiene INSERT/UPDATE en recompensas).
 */
export async function upsertDefaultRewardWith(
  supabase: SupabaseClient,
  data: Partial<Reward>,
): Promise<UpsertDefaultRewardResult> {
  // Default actual (la más nueva, por si hubiera más de una)
  const { data: existingReward, error: fetchError } = await supabase
    .from("recompensas")
    .select("id, ilustracion")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("es_default", true)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

  const updateData: Record<string, unknown> = {
    nombre: data.name,
    descripcion: data.description,
    sellos_requeridos: data.requiredStamps,
    tipo: data.type,
    activa: data.active,
  };
  if (data.illustration) {
    updateData.ilustracion = data.illustration;
  }

  // 1. No hay default todavía → crear
  if (!existingReward) {
    const { error } = await supabase.from("recompensas").insert([
      {
        negocio_id: NEGOCIO_ID,
        ...updateData,
        es_default: true,
      },
    ]);
    if (error) throw error;
    return { versioned: false };
  }

  // 2. Cambió el diseño → nueva versión (insertar primero, degradar después:
  //    nunca hay un instante sin default, y getDefaultReward prefiere la más nueva)
  const illustrationChanged =
    !!data.illustration && data.illustration !== existingReward.ilustracion;

  if (illustrationChanged) {
    const { data: inserted, error: insertError } = await supabase
      .from("recompensas")
      .insert([
        {
          negocio_id: NEGOCIO_ID,
          ...updateData,
          activa: true,
          es_default: true,
        },
      ])
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Degradar TODOS los defaults anteriores (la vieja sigue activa=true
    // para que las tarjetas que la referencian puedan seguir leyéndola)
    const { error: demoteError } = await supabase
      .from("recompensas")
      .update({ es_default: false })
      .eq("negocio_id", NEGOCIO_ID)
      .eq("es_default", true)
      .neq("id", inserted.id);

    if (demoteError) throw demoteError;
    return { versioned: true };
  }

  // 3. Mismo diseño → actualizar in place
  const { error } = await supabase
    .from("recompensas")
    .update(updateData)
    .eq("id", existingReward.id)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) throw error;
  return { versioned: false };
}

export async function updateRewardStamps(
  requiredStamps: number,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("recompensas")
    .update({ sellos_requeridos: requiredStamps })
    .eq("negocio_id", NEGOCIO_ID)
    .eq("es_default", true);

  if (error) throw error;
}
