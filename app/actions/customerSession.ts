"use server";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase-server";

const COOKIE_NAME = "customer-session";
const NEGOCIO_ID = process.env.NEXT_PUBLIC_NEGOCIO_ID ?? "";

function getHmacKey(): string {
  const key = process.env.ADMIN_HMAC_KEY;
  if (!key) throw new Error("ADMIN_HMAC_KEY not configured");
  return key;
}

// --- PIN hashing ---

export async function hashCustomerPin(pin: string): Promise<string> {
  return createHmac("sha256", getHmacKey())
    .update(`customer-pin:${pin}`)
    .digest("hex");
}

// --- Session cookie (signed) ---

export async function setCustomerSession(
  customerId: string,
  cardId: string
): Promise<void> {
  const sig = createHmac("sha256", getHmacKey())
    .update(`session:${customerId}:${cardId}`)
    .digest("hex");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${customerId}:${cardId}:${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}

export async function getCustomerSession(): Promise<{
  customerId: string;
  cardId: string;
} | null> {
  const hmacKey = getHmacKey();
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return null;

  const parts = value.split(":");
  if (parts.length !== 3) return null;

  const [customerId, cardId, sig] = parts;

  const expected = createHmac("sha256", hmacKey)
    .update(`session:${customerId}:${cardId}`)
    .digest("hex");

  try {
    if (
      !timingSafeEqual(
        Buffer.from(sig, "hex"),
        Buffer.from(expected, "hex")
      )
    )
      return null;
  } catch {
    return null;
  }

  return { customerId, cardId };
}

export async function clearCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// --- PIN verification + login (via Supabase) ---

export type VerifyPinResult =
  | { ok: true; customerId: string; cardId: string }
  | { ok: false; error: string };

export async function verifyCustomerPin(
  phone: string,
  pin: string
): Promise<VerifyPinResult> {
  const hmacKey = getHmacKey();
  const sb = getSupabaseServer();

  // 1) Find customer by phone
  const { data: cliente, error: clienteError } = await sb
    .from("clientes")
    .select("id, pin_hmac")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("telefono", phone)
    .eq("activo", true)
    .order("creado_en", { ascending: false })
    .limit(1)
    .single();

  if (clienteError || !cliente) {
    return { ok: false, error: "No encontramos una cuenta con ese numero." };
  }

  if (!cliente.pin_hmac) {
    return {
      ok: false,
      error:
        "Esta cuenta no tiene PIN de recuperacion. Visitanos en barra para que te ayudemos.",
    };
  }

  // 2) Verify PIN
  const computed = createHmac("sha256", hmacKey)
    .update(`customer-pin:${pin}`)
    .digest("hex");

  try {
    if (
      !timingSafeEqual(
        Buffer.from(computed, "hex"),
        Buffer.from(cliente.pin_hmac, "hex")
      )
    ) {
      return { ok: false, error: "PIN incorrecto." };
    }
  } catch {
    return { ok: false, error: "PIN incorrecto." };
  }

  // 3) Find card (active or completed) for this customer
  const { data: tarjetas } = await sb
    .from("tarjetas")
    .select("id, estado")
    .eq("negocio_id", NEGOCIO_ID)
    .eq("cliente_id", cliente.id)
    .in("estado", ["activa", "completada"])
    .order("creado_en", { ascending: false });

  const cards = tarjetas || [];
  const activeCard = cards.find((c) => c.estado === "activa");
  const completedCard = cards.find((c) => c.estado === "completada");
  const bestCard = activeCard ?? completedCard;

  if (!bestCard) {
    return {
      ok: false,
      error:
        "Encontramos tu cuenta pero no tu tarjeta. Visitanos en barra para que te ayudemos.",
    };
  }

  // 4) Set session cookie
  await setCustomerSession(cliente.id, bestCard.id);

  return { ok: true, customerId: cliente.id, cardId: bestCard.id };
}

// --- Update phone (server-verified) ---

export async function updateCustomerPhone(
  customerId: string,
  pin: string,
  newPhone: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const hmacKey = getHmacKey();
  const sb = getSupabaseServer();

  // Read customer
  const { data: cliente } = await sb
    .from("clientes")
    .select("pin_hmac")
    .eq("id", customerId)
    .eq("negocio_id", NEGOCIO_ID)
    .single();

  if (!cliente) {
    return { ok: false, error: "No se pudo leer tu cuenta." };
  }

  if (!cliente.pin_hmac) {
    return { ok: false, error: "Tu cuenta no tiene PIN configurado." };
  }

  // Verify PIN
  const computed = createHmac("sha256", hmacKey)
    .update(`customer-pin:${pin}`)
    .digest("hex");

  try {
    if (
      !timingSafeEqual(
        Buffer.from(computed, "hex"),
        Buffer.from(cliente.pin_hmac, "hex")
      )
    ) {
      return { ok: false, error: "PIN incorrecto." };
    }
  } catch {
    return { ok: false, error: "PIN incorrecto." };
  }

  // Update phone
  const { error } = await sb
    .from("clientes")
    .update({ telefono: newPhone, actualizado_en: new Date().toISOString() })
    .eq("id", customerId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) {
    return { ok: false, error: "No se pudo actualizar el telefono." };
  }

  return { ok: true };
}
