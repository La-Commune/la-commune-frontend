import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { Customer } from "@/models/customer.model";

export async function createCustomer(
  data: {
    name?: string;
    phone: string;
    email?: string;
    consentWhatsApp: boolean;
    consentEmail?: boolean;
    referrerCustomerId?: string;
    pinHmac?: string;
  },
) {
  const supabase = getSupabase();

  const customerData = {
    negocio_id: NEGOCIO_ID,
    nombre: data.name || data.phone,
    telefono: data.phone,
    email: data.email || null,
    consentimiento_whatsapp: data.consentWhatsApp,
    consentimiento_email: data.consentEmail || false,
    activo: true,
    total_visitas: 0,
    total_sellos: 0,
    creado_en: new Date().toISOString(),
    ultima_visita: new Date().toISOString(),
    notas: "",
    pin_hmac: data.pinHmac || null,
    ...(data.referrerCustomerId ? { id_referidor: data.referrerCustomerId } : {}),
  };

  const { data: result, error } = await supabase
    .from("clientes")
    .insert([customerData])
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function getCustomerByPhone(phone: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("telefono", phone)
    .eq("activo", true)
    .order("creado_en", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data || null;
}

export async function getAllCustomers(): Promise<(Customer & { id: string })[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("activo", true)
    .order("creado_en", { ascending: false });

  if (error) throw error;

  // Map Supabase columns to Customer model fields
  return (data || []).map((row) => ({
    id: row.id,
    name: row.nombre,
    phone: row.telefono,
    email: row.email,
    active: row.activo,
    totalVisits: row.total_visitas,
    totalStamps: row.total_sellos,
    createdAt: new Date(row.creado_en),
    lastVisitAt: row.ultima_visita ? new Date(row.ultima_visita) : undefined,
    consentWhatsApp: row.consentimiento_whatsapp,
    consentEmail: row.consentimiento_email,
    pinHmac: row.pin_hmac,
    notes: row.notas,
    referrerCustomerId: row.id_referidor,
    referralBonusGiven: row.bono_referido_entregado,
    schemaVersion: 1,
  }));
}

export async function updateCustomerNotes(
  customerId: string,
  notes: string,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("clientes")
    .update({ notas: notes })
    .eq("id", customerId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) throw error;
}

export async function deleteCustomer(
  customerId: string,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("clientes")
    .update({ activo: false })
    .eq("id", customerId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) throw error;
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

/** Like getCardByCustomer but also finds completed cards (useful for recovery). */
export async function getAnyCardByCustomer(customerRef: string) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("tarjetas")
    .select("*")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("cliente_id", customerRef)
    .order("creado_en", { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Prefer active > completed > anything else
  const active = data.find((c) => c.estado === "activa");
  if (active) return active;

  const completed = data.find((c) => c.estado === "completada");
  if (completed) return completed;

  return data[0];
}

export async function updateCustomerPhone(
  customerId: string,
  phone: string,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("clientes")
    .update({ telefono: phone })
    .eq("id", customerId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) throw error;
}

export async function updateCustomerEmail(
  customerId: string,
  email: string,
  consentEmail?: boolean,
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("clientes")
    .update({
      email,
      ...(consentEmail != null ? { consentimiento_email: consentEmail } : {}),
    })
    .eq("id", customerId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) throw error;
}
