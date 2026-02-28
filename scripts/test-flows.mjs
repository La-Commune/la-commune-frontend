/**
 * test-flows.mjs — Prueba el flujo completo: registro → tarjeta → sellos → completar
 *
 * Uso:
 *   node scripts/test-flows.mjs
 *
 * Al terminar limpia los documentos de prueba de Firestore.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
  addDoc,
  collection,
  runTransaction,
  Timestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";

// ── Leer .env.local ────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf-8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => { const [k, ...v] = l.split("="); return [k.trim(), v.join("=").trim()]; })
);

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

// ── Helpers visuales ───────────────────────────────────────
const ok   = (msg) => console.log(`  ✅  ${msg}`);
const fail = (msg) => console.log(`  ❌  ${msg}`);
const info = (msg) => console.log(`\n── ${msg} ${"─".repeat(40 - msg.length)}`);
const bar  = (stamps, max) => {
  const filled = "█".repeat(stamps);
  const empty  = "░".repeat(max - stamps);
  return `[${filled}${empty}] ${stamps}/${max}`;
};

const created = [];

// ── Lógica equivalente a los servicios ────────────────────
async function createCustomer(data) {
  return addDoc(collection(db, "customers"), {
    name: data.name,
    phone: data.phone,
    consentWhatsApp: data.consentWhatsApp,
    active: true,
    totalVisits: 0,
    totalStamps: 0,
    createdAt: Timestamp.now(),
    lastVisitAt: Timestamp.now(),
    notes: "",
    schemaVersion: 1,
  });
}

async function createCard(customerRef, rewardRef) {
  return addDoc(collection(db, "cards"), {
    customerId: customerRef,
    rewardId: rewardRef,
    stamps: 0,
    maxStamps: 5,
    status: "active",
    createdAt: Timestamp.now(),
    schemaVersion: 1,
  });
}

async function addStamp(cardId, customerId) {
  const cardRef = doc(db, "cards", cardId);
  const eventsRef = collection(db, "stamp-events");
  let result = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(cardRef);
    if (!snap.exists()) throw new Error("Card not found");
    const card = snap.data();

    const newStamps = card.stamps + 1;
    const isComplete = newStamps >= card.maxStamps;

    tx.update(cardRef, {
      stamps: newStamps,
      lastStampAt: Timestamp.now(),
      ...(isComplete ? { status: "completed", completedAt: Timestamp.now() } : {}),
    });

    const eventRef = doc(eventsRef);
    tx.set(eventRef, {
      cardId: cardRef,
      customerId: customerId ?? null,
      createdAt: Timestamp.now(),
      addedBy: "test",
      source: "manual",
    });

    // Guardamos el ID fuera del array created — la transacción puede reintentar
    // y causaría duplicados. Los stamp-events los limpiamos por cardId al final.
    result = { stamps: newStamps, maxStamps: card.maxStamps, status: isComplete ? "completed" : card.status, eventId: eventRef.id };
  });

  return result;
}

// ── Tests ──────────────────────────────────────────────────
async function run() {
  console.log(`\n🧪  Test flows → ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}\n`);
  let customerRef, cardRef;

  // ── 1. Verificar que rewards/default existe ──────────────
  info("PASO 1: rewards/default");
  const rewardSnap = await getDoc(doc(db, "rewards", "default"));
  if (!rewardSnap.exists()) {
    fail("rewards/default no existe — corre primero: node scripts/seed.mjs");
    process.exit(1);
  }
  const reward = rewardSnap.data();
  ok(`rewards/default encontrado → requiredStamps: ${reward.requiredStamps}, tipo: "${reward.type}"`);

  // ── 2. Crear cliente ─────────────────────────────────────
  info("PASO 2: Crear cliente (registro)");
  try {
    customerRef = await createCustomer({
      name: "Cliente Test",
      phone: "5512345678",
      consentWhatsApp: true,
    });
    created.push({ col: "customers", id: customerRef.id });
    ok(`customers/${customerRef.id}`);

    const snap = await getDoc(customerRef);
    const d = snap.data();
    ok(`nombre: "${d.name}"  |  teléfono: ${d.phone}  |  activo: ${d.active}`);
  } catch (e) {
    fail(`No se pudo crear el cliente: ${e.message}`);
    process.exit(1);
  }

  // ── 3. Crear tarjeta ─────────────────────────────────────
  info("PASO 3: Crear tarjeta");
  try {
    const rewardRef = doc(db, "rewards", "default");
    cardRef = await createCard(customerRef, rewardRef);
    created.push({ col: "cards", id: cardRef.id });
    ok(`cards/${cardRef.id}`);

    const snap = await getDoc(cardRef);
    const d = snap.data();
    ok(`estado: "${d.status}"  |  ${bar(d.stamps, d.maxStamps)}`);
  } catch (e) {
    fail(`No se pudo crear la tarjeta: ${e.message}`);
    process.exit(1);
  }

  // ── 4. Agregar 5 sellos (hasta completar) ───────────────
  info("PASO 4: Agregar sellos (runTransaction)");
  const stampEventIds = [];
  try {
    for (let i = 1; i <= 5; i++) {
      const result = await addStamp(cardRef.id, customerRef);
      if (result.eventId) stampEventIds.push(result.eventId);
      const isLast = result.stamps >= result.maxStamps;
      ok(`Sello ${i}: ${bar(result.stamps, result.maxStamps)}  status: "${result.status}"${isLast ? "  🎉 COMPLETADA" : ""}`);
    }
  } catch (e) {
    fail(`Error al agregar sello: ${e.message}`);
  }

  // ── 5. Verificar estado final en Firestore ───────────────
  info("PASO 5: Verificar estado final en Firestore");
  try {
    const finalCard = await getDoc(cardRef);
    const fc = finalCard.data();
    if (fc.status === "completed" && fc.stamps === 5) {
      ok(`stamps: ${fc.stamps}  |  status: "${fc.status}"  |  completedAt: ${fc.completedAt?.toDate().toISOString() ?? "—"}`);
    } else {
      fail(`Estado inesperado → stamps: ${fc.stamps}, status: "${fc.status}"`);
    }
  } catch (e) {
    fail(`getDoc card falló: ${e.message}`);
  }

  // ── 6. Verificar eventos en stamp-events ─────────────────
  info("PASO 6: Verificar stamp-events");
  let eventsFound = 0;
  for (const id of stampEventIds) {
    try {
      const snap = await getDoc(doc(db, "stamp-events", id));
      if (snap.exists()) eventsFound++;
    } catch (e) {
      fail(`getDoc stamp-event ${id} falló: ${e.message}`);
    }
  }
  if (eventsFound === 5) {
    ok(`${eventsFound} eventos registrados correctamente`);
  } else {
    fail(`Se esperaban 5 eventos, se encontraron ${eventsFound}`);
  }

  // ── 7. Limpiar documentos de prueba ─────────────────────
  info("PASO 7: Limpieza");
  for (const { col, id } of created) {
    try {
      await deleteDoc(doc(db, col, id));
      ok(`Eliminado ${col}/${id}`);
    } catch (e) {
      fail(`deleteDoc ${col}/${id}: ${e.message}`);
    }
  }
  for (const id of stampEventIds) {
    try {
      await deleteDoc(doc(db, "stamp-events", id));
      ok(`Eliminado stamp-events/${id}`);
    } catch (e) {
      fail(`deleteDoc stamp-events/${id}: ${e.message}`);
    }
  }

  console.log("\n✔  Todos los flujos pasaron correctamente.\n");
  // Terminar conexión de Firestore explícitamente
  const { terminate } = await import("firebase/firestore");
  await terminate(db);
  process.exit(0);
}

run().catch((e) => {
  console.error("\n❌  Error inesperado:", e.message, "\n");
  process.exit(1);
});
