#!/usr/bin/env node
/**
 * Actualiza el PIN de administrador en Firestore.
 *
 * Uso:
 *   node scripts/setAdminPin.mjs <nuevo-pin>
 *
 * Ejemplo:
 *   node scripts/setAdminPin.mjs 12345
 *
 * Requiere en .env.local:
 *   ADMIN_HMAC_KEY=<clave-secreta-larga>
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
 *   NEXT_PUBLIC_FIREBASE_API_KEY=...
 *
 * Primera vez: genera ADMIN_HMAC_KEY con:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import { createHmac } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

const pin = process.argv[2];

if (!pin) {
  console.error("❌  Uso: node scripts/setAdminPin.mjs <nuevo-pin>");
  console.error("   Ejemplo: node scripts/setAdminPin.mjs 12345");
  process.exit(1);
}

// ── Leer .env.local ──────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
let envRaw;
try {
  envRaw = readFileSync(envPath, "utf-8");
} catch {
  console.error("❌  No se encontró .env.local en la raíz del proyecto");
  process.exit(1);
}

const env = Object.fromEntries(
  envRaw
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const hmacKey   = env.ADMIN_HMAC_KEY;
const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey    = env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!hmacKey || !projectId || !apiKey) {
  console.error("❌  Faltan variables en .env.local:");
  if (!hmacKey)    console.error("   ADMIN_HMAC_KEY  (genera con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")");
  if (!projectId)  console.error("   NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!apiKey)     console.error("   NEXT_PUBLIC_FIREBASE_API_KEY");
  process.exit(1);
}

// ── Calcular HMAC ────────────────────────────────────────
const pinHmac   = createHmac("sha256", hmacKey).update(pin).digest("hex");
const pinLength = pin.length;

// ── Escribir en Firestore ────────────────────────────────
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/config/admin?key=${apiKey}`;

const res = await fetch(url, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    fields: {
      pinHmac:   { stringValue: pinHmac },
      pinLength: { integerValue: String(pinLength) },
    },
  }),
});

if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  console.error("❌  Error al guardar en Firestore:", err.error?.message ?? JSON.stringify(err));
  process.exit(1);
}

console.log(`✓ PIN actualizado correctamente`);
console.log(`  Dígitos : ${pinLength}`);
console.log(`  HMAC    : ${pinHmac.slice(0, 16)}…`);
console.log("");
console.log("Asegúrate de que ADMIN_HMAC_KEY esté configurada en Netlify.");
