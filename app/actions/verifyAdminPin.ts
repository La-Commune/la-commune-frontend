"use server";

import { createHmac, timingSafeEqual } from "crypto";

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

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const hmacKey = process.env.ADMIN_HMAC_KEY;
  if (!hmacKey) throw new Error("ADMIN_HMAC_KEY no está configurado en las variables de entorno");

  const { pinHmac } = await getAdminConfig();

  // HMAC-SHA256 del PIN ingresado con la clave del servidor
  const computed = createHmac("sha256", hmacKey).update(pin).digest("hex");

  // Ambos son hex de SHA-256 (32 bytes) — misma longitud garantizada
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(pinHmac, "hex");

  // timingSafeEqual previene timing attacks
  return timingSafeEqual(a, b);
}
