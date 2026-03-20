import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { Reward, RecompensaRow, mapRecompensaToReward } from "@/models/reward.model";

export async function getDefaultReward(): Promise<
  (Reward & { id: string }) | null
> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("recompensas")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("es_default", true)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  return mapRecompensaToReward(data as RecompensaRow);
}

/**
 * Crea o actualiza el reward "default".
 */
export async function upsertDefaultReward(
  data: Partial<Reward>,
): Promise<void> {
  const supabase = getSupabase();

  // First, get the current default reward
  const { data: existingReward } = await supabase
    .from("recompensas")
    .select("id")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("es_default", true)
    .limit(1)
    .single();

  const updateData = {
    nombre: data.name,
    descripcion: data.description,
    sellos_requeridos: data.requiredStamps,
    tipo: data.type,
    activa: data.active,
  };

  if (existingReward) {
    // Update existing
    const { error } = await supabase
      .from("recompensas")
      .update(updateData)
      .eq("id", existingReward.id)
      .eq("negocio_id", NEGOCIO_ID);

    if (error) throw error;
  } else {
    // Create new
    const { error } = await supabase
      .from("recompensas")
      .insert([
        {
          negocio_id: NEGOCIO_ID,
          ...updateData,
          es_default: true,
        },
      ]);

    if (error) throw error;
  }
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
