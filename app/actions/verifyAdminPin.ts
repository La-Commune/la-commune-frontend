"use server";

import { createHmac, timingSafeEqual } from "crypto";
import { headers, cookies } from "next/headers";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const attemptMap = new Map<string, { count: number; resetAt: number }>();

export type VerifyResult =
  | { ok: true }
  | { ok: false; blocked?: false }
  | { ok: false; blocked: true; retryAfter: number };

async function getAdminConfig(): Promise<{ pinHmac: string }> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/config/admin?key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo leer la configuración de admin en Firestore");

  const data = await res.json();

  if (!data.fields?.pinHmac?.stringValue) {
    throw new Error("Documento config/admin no encontrado. Ejecuta: node scripts/setAdminPin.mjs <pin>");
  }

  return { pinHmac: data.fields.pinHmac.stringValue };
}

export async function verifyAdminPin(pin: string): Promise<VerifyResult> {
  const hmacKey = process.env.ADMIN_HMAC_KEY;
  if (!hmacKey) throw new Error("ADMIN_HMAC_KEY no está configurado en las variables de entorno");

  // Recovery code bypass (para acceso de emergencia sin HMAC)
  const recoveryCode = process.env.ADMIN_RECOVERY_CODE;
  if (recoveryCode && pin === recoveryCode) {
    return { ok: true };
  }

  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  const now = Date.now();
  const entry = attemptMap.get(ip);

  // Check if currently blocked
  if (entry && entry.count >= MAX_ATTEMPTS && now < entry.resetAt) {
    return { ok: false, blocked: true, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  // Reset expired window
  if (entry && now >= entry.resetAt) {
    attemptMap.delete(ip);
  }

  const { pinHmac } = await getAdminConfig();

  // HMAC-SHA256 del PIN ingresado con la clave del servidor
  const computed = createHmac("sha256", hmacKey).update(pin).digest("hex");

  // Ambos son hex de SHA-256 (32 bytes) — misma longitud garantizada
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(pinHmac, "hex");

  // timingSafeEqual previene timing attacks
  const correct = timingSafeEqual(a, b);

  if (!correct) {
    const existing = attemptMap.get(ip);
    if (existing) {
      existing.count += 1;
    } else {
      attemptMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }
    return { ok: false };
  }

  // PIN correcto — resetear intentos y emitir token de sesión como httpOnly cookie
  attemptMap.delete(ip);
  const epochHour = Math.floor(now / 3600000);
  const token = createHmac("sha256", hmacKey)
    .update(`barista-session:${epochHour}`)
    .digest("hex");

  const cookieStore = await cookies();
  cookieStore.set("barista-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7200, // 2 horas
    path: "/admin",
  });

  return { ok: true };
}

function verifyToken(token: string, hmacKey: string): boolean {
  if (!token || token.length !== 64) return false;

  let tokenBuf: Buffer;
  try {
    tokenBuf = Buffer.from(token, "hex");
    if (tokenBuf.length !== 32) return false;
  } catch {
    return false;
  }

  const epochHour = Math.floor(Date.now() / 3600000);

  for (const hour of [epochHour, epochHour - 1]) {
    const expected = createHmac("sha256", hmacKey)
      .update(`barista-session:${hour}`)
      .digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (timingSafeEqual(tokenBuf, expectedBuf)) return true;
  }

  return false;
}

/** Verifica el token desde la cookie httpOnly. Usar en el cliente para auto-auth en mount. */
export async function checkBaristaSession(): Promise<boolean> {
  const hmacKey = process.env.ADMIN_HMAC_KEY;
  if (!hmacKey) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get("barista-session")?.value ?? "";
  return verifyToken(token, hmacKey);
}

/** Cierra la sesión del barista eliminando la cookie. */
export async function logoutBarista(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("barista-session");
}

/** @deprecated Usar checkBaristaSession() — mantener por compatibilidad temporal */
export async function verifyBaristaSession(token: string): Promise<boolean> {
  const hmacKey = process.env.ADMIN_HMAC_KEY;
  if (!hmacKey) return false;
  return verifyToken(token, hmacKey);
}
