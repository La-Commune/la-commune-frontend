import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { Promotion } from "@/models/promotion.model";

export async function getPromotions(): Promise<Promotion[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .order("creado_en", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    title: row.nombre,
    description: row.descripcion,
    type: row.tipo,
    discountPercent: row.valor_descuento,
    startsAt: new Date(row.fecha_inicio),
    endsAt: new Date(row.fecha_fin),
    daysOfWeek: row.dias_semana || [],
    active: row.activo,
    appliesTo: row.aplica_a,
    order: 0,
    schemaVersion: 1,
  }));
}

/**
 * Returns only promotions that are active AND currently within their date range
 */
export async function getActivePromotions(): Promise<Promotion[]> {
  const all = await getPromotions();
  const now = new Date();

  return all.filter((p) => {
    if (!p.active) return false;

    const start =
      p.startsAt instanceof Date ? p.startsAt : new Date(p.startsAt);
    const end = p.endsAt instanceof Date ? p.endsAt : new Date(p.endsAt);

    // Set end to end-of-day
    end.setHours(23, 59, 59, 999);

    if (now < start || now > end) return false;

    // Check day-of-week filter
    if (p.daysOfWeek.length > 0 && !p.daysOfWeek.includes(now.getDay()))
      return false;

    return true;
  });
}

export async function addPromotion(
  data: Omit<Promotion, "id">
): Promise<string> {
  const supabase = getSupabase();

  const insertData = {
    negocio_id: NEGOCIO_ID,
    nombre: data.title,
    descripcion: data.description,
    tipo: data.type,
    valor_descuento: data.discountPercent,
    es_porcentaje: true,
    fecha_inicio: data.startsAt instanceof Date
      ? data.startsAt.toISOString()
      : data.startsAt,
    fecha_fin: data.endsAt instanceof Date
      ? data.endsAt.toISOString()
      : data.endsAt,
    dias_semana: data.daysOfWeek,
    activo: data.active,
    aplica_a: data.appliesTo,
  };

  const { data: result, error } = await supabase
    .from("promociones")
    .insert([insertData])
    .select()
    .single();

  if (error) throw error;
  return result.id;
}

export async function updatePromotion(
  promoId: string,
  data: Partial<Promotion>
): Promise<void> {
  const supabase = getSupabase();

  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.nombre = data.title;
  if (data.description !== undefined) updateData.descripcion = data.description;
  if (data.type !== undefined) updateData.tipo = data.type;
  if (data.discountPercent !== undefined) updateData.valor_descuento = data.discountPercent;
  if (data.startsAt !== undefined) {
    updateData.fecha_inicio = data.startsAt instanceof Date
      ? data.startsAt.toISOString()
      : data.startsAt;
  }
  if (data.endsAt !== undefined) {
    updateData.fecha_fin = data.endsAt instanceof Date
      ? data.endsAt.toISOString()
      : data.endsAt;
  }
  if (data.daysOfWeek !== undefined) updateData.dias_semana = data.daysOfWeek;
  if (data.active !== undefined) updateData.activo = data.active;
  if (data.appliesTo !== undefined) updateData.aplica_a = data.appliesTo;

  const { error } = await supabase
    .from("promociones")
    .update(updateData)
    .eq("id", promoId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) throw error;
}

export async function deletePromotion(
  promoId: string
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("promociones")
    .delete()
    .eq("id", promoId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) throw error;
}
