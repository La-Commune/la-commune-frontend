/**
 * seed.mjs — Crea los documentos base en Firestore
 *
 * Uso:
 *   node scripts/seed.mjs
 *
 * Lee las credenciales desde .env.local automáticamente.
 * Requiere que las reglas de Firestore permitan escritura (modo desarrollo).
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, Timestamp } from "firebase/firestore";

// ── Leer .env.local ────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

let envContent;
try {
  envContent = readFileSync(envPath, "utf-8");
} catch {
  console.error("❌  No se encontró .env.local en la raíz del proyecto.");
  process.exit(1);
}

const env = Object.fromEntries(
  envContent
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim()];
    })
);

const requiredVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const missing = requiredVars.filter((v) => !env[v]);
if (missing.length > 0) {
  console.error("❌  Faltan variables en .env.local:\n  " + missing.join("\n  "));
  process.exit(1);
}

// ── Inicializar Firebase ───────────────────────────────────
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

// ── Helpers ────────────────────────────────────────────────
function ok(msg) { console.log(`  ✅  ${msg}`); }
function skip(msg) { console.log(`  ⏭   ${msg}`); }
function info(msg) { console.log(`\n${msg}`); }

async function upsert(collectionName, docId, data, label) {
  const ref = doc(db, collectionName, docId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    skip(`${label} ya existe — no se sobreescribió`);
    return false;
  }
  await setDoc(ref, data);
  ok(`${label} creado`);
  return true;
}

// ── Datos de seed ──────────────────────────────────────────
async function seed() {
  console.log(`\n🌱  Seed → ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`\n⚠️   Asegúrate de tener reglas abiertas en Firestore antes de continuar.`);
  console.log(`    Firebase Console → Firestore → Reglas → allow read, write: if true\n`);

  // 1. rewards/default
  info("── rewards ──────────────────────────────");
  await upsert(
    "rewards",
    "default",
    {
      name: "Bebida de cortesía",
      description: "Después de 5 visitas, la siguiente bebida es gratis.",
      requiredStamps: 5,
      type: "drink",
      active: true,
      createdAt: Timestamp.now(),
    },
    "rewards/default"
  );

  console.log("\n✔  Seed completado.\n");
  process.exit(0);
}

seed().catch((err) => {
  if (err.message?.includes("permissions")) {
    console.error("\n❌  Sin permisos en Firestore.");
    console.error("    Ve a Firebase Console → Firestore → Reglas y permite escritura temporalmente.");
    console.error("    Reglas temporales:  allow read, write: if true;\n");
  } else {
    console.error("\n❌  Error durante el seed:\n", err.message);
  }
  process.exit(1);
});
