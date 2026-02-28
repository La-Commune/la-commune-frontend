/**
 * seedMenu.mjs — Migra el menú hardcodeado a Firestore
 *
 * Uso:
 *   node scripts/seedMenu.mjs
 *
 * Lee credenciales desde .env.local automáticamente.
 * Requiere que las reglas de Firestore permitan escritura.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, addDoc } from "firebase/firestore";

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

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

function ok(msg) { console.log(`  ✅  ${msg}`); }
function skip(msg) { console.log(`  ⏭   ${msg}`); }
function info(msg) { console.log(`\n${msg}`); }

// ── Datos del menú actual ──────────────────────────────────────────

const MENU_DATA = [
  {
    title: "Con leche",
    description: "Suaves, balanceadas y cremosas",
    type: "drink",
    order: 1,
    active: true,
    schemaVersion: 1,
    items: [
      {
        name: "Latte",
        price: 40,
        ingredients: ["Espresso", "Leche vaporizada"],
        tags: [],
        highlight: false,
        seasonal: false,
        available: true,
        order: 1,
        schemaVersion: 1,
      },
      {
        name: "Cappuccino",
        price: 40,
        ingredients: ["Espresso", "Leche vaporizada", "Espuma de leche"],
        tags: ["Cremoso"],
        highlight: false,
        seasonal: false,
        available: true,
        order: 2,
        schemaVersion: 1,
      },
      {
        name: "Flat White",
        price: 40,
        ingredients: ["Espresso", "Leche vaporizada"],
        note: "Más café, menos espuma",
        tags: ["Intenso"],
        highlight: false,
        seasonal: false,
        available: true,
        order: 3,
        schemaVersion: 1,
      },
      {
        name: "Moka",
        price: 45,
        ingredients: ["Espresso", "Chocolate", "Cocoa", "Leche", "Vainilla"],
        tags: ["Dulce"],
        highlight: false,
        seasonal: false,
        available: true,
        order: 4,
        schemaVersion: 1,
      },
    ],
  },
  {
    title: "Especiales",
    description: "Con sabores y perfil más dulce",
    type: "drink",
    order: 2,
    active: true,
    schemaVersion: 1,
    items: [
      {
        name: "Latte Praliné",
        sizes: [
          { label: "10 oz", price: 45 },
          { label: "12 oz", price: 52 },
        ],
        ingredients: ["Espresso", "Caramelo", "Leche vaporizada", "Nuez pecana"],
        note: "Nuez pecana garapiñada con cubierta de praliné",
        tags: ["Gourmet"],
        highlight: false,
        seasonal: true,
        available: true,
        order: 1,
        schemaVersion: 1,
      },
      {
        name: "Chocolate caliente",
        price: 40,
        ingredients: ["Chocolate", "Cocoa", "Leche", "Vainilla"],
        note: "Sin café · Perfil más cremoso",
        tags: ["Dulce"],
        highlight: false,
        seasonal: false,
        available: true,
        order: 2,
        schemaVersion: 1,
      },
      {
        name: "Latte Helado",
        price: 50,
        ingredients: ["Espresso", "Caramelo", "Leche fría", "Hielo"],
        tags: ["Refrescante"],
        highlight: false,
        seasonal: false,
        available: true,
        order: 3,
        schemaVersion: 1,
      },
    ],
  },
  {
    title: "Base espresso",
    description: "Bebidas intensas, cortas y directas",
    type: "drink",
    order: 3,
    active: true,
    schemaVersion: 1,
    items: [
      {
        name: "Espresso",
        price: 30,
        ingredients: ["Espresso"],
        tags: ["Fuerte"],
        highlight: false,
        seasonal: false,
        available: true,
        order: 1,
        schemaVersion: 1,
      },
      {
        name: "Americano",
        price: 30,
        ingredients: ["Espresso", "Agua caliente"],
        note: "Espresso servido primero",
        tags: [],
        highlight: false,
        seasonal: false,
        available: true,
        order: 2,
        schemaVersion: 1,
      },
    ],
  },
];

// ── Seed ─────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n🌱  Seed menú → ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  console.log(`\n⚠️   Asegúrate de tener reglas abiertas en Firestore antes de continuar.`);
  console.log(`    Firebase Console → Firestore → Reglas → allow read, write: if true\n`);

  // Verificar si ya existe alguna sección
  const existingSnap = await getDocs(collection(db, "menu-sections"));
  if (!existingSnap.empty) {
    skip(`menu-sections ya tiene ${existingSnap.size} secciones — no se sobreescribieron`);
    console.log("\n✔  Seed omitido (ya existen datos). Elimina las secciones en Firestore Console para re-sembrar.\n");
    process.exit(0);
  }

  let totalItems = 0;

  for (const section of MENU_DATA) {
    const { items, ...sectionData } = section;

    info(`── ${sectionData.title} ──`);
    const sectionRef = await addDoc(collection(db, "menu-sections"), sectionData);
    ok(`Sección "${sectionData.title}" creada (${sectionRef.id})`);

    for (const item of items) {
      await addDoc(collection(db, "menu-sections", sectionRef.id, "items"), item);
      ok(`  Item "${item.name}" creado`);
      totalItems++;
    }
  }

  console.log(`\n✔  Seed completado: ${MENU_DATA.length} secciones, ${totalItems} items.\n`);
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
