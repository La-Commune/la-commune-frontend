"use server";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase-server";

const COOKIE_NAME = "customer-session";
const NEGOCIO_ID = process.env.NEXT_PUBLIC_NEGOCIO_ID ?? "";

/** Sesión de cliente: 90 días (antes 1 año sin expiración firmada) */
const SESSION_MAX_AGE_S = 60 * 60 * 24 * 90;

// — Rate limiting de verificación de PIN (mismo patrón que verifyAdminPin) —
// El PIN es de 4 dígitos: sin límite de intentos se fuerza en minutos.
const PIN_MAX_ATTEMPTS = 8;
const PIN_WINDOW_MS = 15 * 60 * 1000;
const pinAttemptMap = new Map<string, { count: number; resetAt: number }>();

async function getClientIP(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-real-ip")?.trim() ||
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}

/** true si la llave (ip|identificador) está bloqueada; registra el intento fallido aparte */
function isPinBlocked(key: string): boolean {
  const now = Date.now();
  const entry = pinAttemptMap.get(key);
  if (entry && now >= entry.resetAt) {
    pinAttemptMap.delete(key);
    return false;
  }
  return !!entry && entry.count >= PIN_MAX_ATTEMPTS;
}

function registerPinFailure(key: string): void {
  const now = Date.now();
  const entry = pinAttemptMap.get(key);
  if (entry && now < entry.resetAt) {
    entry.count += 1;
  } else {
    pinAttemptMap.set(key, { count: 1, resetAt: now + PIN_WINDOW_MS });
  }
}

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
  // exp DENTRO del payload firmado — una cookie capturada deja de ser
  // válida para siempre (antes solo expiraba el maxAge del navegador)
  const exp = Date.now() + SESSION_MAX_AGE_S * 1000;
  const sig = createHmac("sha256", getHmacKey())
    .update(`session:${customerId}:${cardId}:${exp}`)
    .digest("hex");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${customerId}:${cardId}:${exp}:${sig}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_S,
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
  // Formato nuevo: customerId:cardId:exp:sig. Cookies legacy (3 partes,
  // sin exp) se rechazan — localStorage sigue siendo la vía primaria y la
  // cookie se reescribe en el siguiente setCustomerSession.
  if (parts.length !== 4) return null;

  const [customerId, cardId, expStr, sig] = parts;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  const expected = createHmac("sha256", hmacKey)
    .update(`session:${customerId}:${cardId}:${exp}`)
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

  // 0) Rate limiting — PIN de 4 dígitos sin límite = fuerza bruta en minutos
  const ip = await getClientIP();
  const rlKey = `${ip}|${phone}`;
  if (isPinBlocked(rlKey)) {
    return {
      ok: false,
      error: "Demasiados intentos. Espera unos minutos e intenta de nuevo.",
    };
  }

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
    return { ok: false, error: "No encontramos una cuenta con ese número." };
  }

  if (!cliente.pin_hmac) {
    return {
      ok: false,
      error:
        "Esta cuenta no tiene PIN de recuperación. Visítanos en barra para que te ayudemos.",
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
      registerPinFailure(rlKey);
      return { ok: false, error: "PIN incorrecto." };
    }
  } catch {
    registerPinFailure(rlKey);
    return { ok: false, error: "PIN incorrecto." };
  }

  // PIN correcto — resetear contador
  pinAttemptMap.delete(rlKey);

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
        "Encontramos tu cuenta pero no tu tarjeta. Visítanos en barra para que te ayudemos.",
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

  // Rate limiting — misma protección que verifyCustomerPin
  const ip = await getClientIP();
  const rlKey = `${ip}|update|${customerId}`;
  if (isPinBlocked(rlKey)) {
    return {
      ok: false,
      error: "Demasiados intentos. Espera unos minutos e intenta de nuevo.",
    };
  }

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
      registerPinFailure(rlKey);
      return { ok: false, error: "PIN incorrecto." };
    }
  } catch {
    registerPinFailure(rlKey);
    return { ok: false, error: "PIN incorrecto." };
  }

  pinAttemptMap.delete(rlKey);

  // Update phone
  const { error } = await sb
    .from("clientes")
    .update({ telefono: newPhone, actualizado_en: new Date().toISOString() })
    .eq("id", customerId)
    .eq("negocio_id", NEGOCIO_ID);

  if (error) {
    return { ok: false, error: "No se pudo actualizar el teléfono." };
  }

  return { ok: true };
}
