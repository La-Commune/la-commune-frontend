// Script de migración Firebase → Supabase
// Ejecutar: node migrate-firebase-to-supabase.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";
import pg from "pg";

const { Client } = pg;

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB1dzpJMtV9fJmQJOkLWqmqfPY86xYCXeQ",
  authDomain: "cafestampcard.firebaseapp.com",
  projectId: "cafestampcard",
  storageBucket: "cafestampcard.firebasestorage.app",
  messagingSenderId: "1027614418365",
  appId: "1:1027614418365:web:1f9a56b757531d842c1ed4",
};

const NEGOCIO_ID = "78c5824a-c564-4055-bb07-8ded54b93092";
const SUPABASE_CONN = "postgresql://postgres.ntfmubmmykpzbltbeujv:A1ORa9ll1nqUS98V@aws-1-us-east-1.pooler.supabase.com:6543/postgres";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  const pgClient = new Client({ connectionString: SUPABASE_CONN });
  await pgClient.connect();
  console.log("✓ Connected to Supabase PostgreSQL");

  // Get default recompensa ID
  const recompensaRes = await pgClient.query(
    "SELECT id FROM recompensas WHERE negocio_id = $1 AND es_default = TRUE LIMIT 1",
    [NEGOCIO_ID]
  );
  const recompensaId = recompensaRes.rows[0]?.id;
  console.log("  Recompensa default:", recompensaId);

  // ── 1. Migrate Customers ──
  console.log("\n── Migrando customers ──");
  const customersSnap = await getDocs(collection(db, "customers"));
  const firebaseIdToSupabaseId = {};
  let custCreated = 0, custSkipped = 0;

  for (const doc of customersSnap.docs) {
    const d = doc.data();

    // Check if already migrated
    const existing = await pgClient.query(
      "SELECT id FROM clientes WHERE firebase_id = $1 AND negocio_id = $2",
      [doc.id, NEGOCIO_ID]
    );

    if (existing.rows.length > 0) {
      firebaseIdToSupabaseId[doc.id] = existing.rows[0].id;
      custSkipped++;
      continue;
    }

    const createdAt = d.createdAt?.toDate?.() || new Date();
    const lastVisit = d.lastVisitAt?.toDate?.() || null;

    const res = await pgClient.query(`
      INSERT INTO clientes (negocio_id, firebase_id, nombre, telefono, email,
        total_visitas, total_sellos, consentimiento_whatsapp, consentimiento_email,
        pin_hmac, notas, activo, ultima_visita, creado_en, actualizado_en,
        id_referidor, bono_referido_entregado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, NULL, $15)
      RETURNING id
    `, [
      NEGOCIO_ID,
      doc.id,
      d.name || "Sin nombre",
      d.phone || null,
      d.email || null,
      d.totalVisits || 0,
      d.totalStamps || 0,
      d.consentWhatsApp || false,
      d.consentEmail || false,
      d.pinHmac || null,
      d.notes || null,
      d.active !== false,
      lastVisit,
      createdAt,
      d.referralBonusGiven || false,
    ]);

    firebaseIdToSupabaseId[doc.id] = res.rows[0].id;
    custCreated++;
  }

  console.log(`  ✓ Clientes: ${custCreated} creados, ${custSkipped} ya existían`);

  // Set referrer IDs (second pass)
  for (const doc of customersSnap.docs) {
    const d = doc.data();
    if (d.referrerCustomerId && firebaseIdToSupabaseId[doc.id]) {
      const referrerId = firebaseIdToSupabaseId[d.referrerCustomerId];
      if (referrerId) {
        await pgClient.query(
          "UPDATE clientes SET id_referidor = $1 WHERE id = $2",
          [referrerId, firebaseIdToSupabaseId[doc.id]]
        );
      }
    }
  }

  // ── 2. Migrate Cards ──
  console.log("\n── Migrando cards ──");
  const cardsSnap = await getDocs(collection(db, "cards"));
  const firebaseCardToSupabase = {};
  let cardsCreated = 0;

  for (const doc of cardsSnap.docs) {
    const d = doc.data();
    const customerFirebaseId = d.customerId?.id || d.customerId;
    const clienteId = firebaseIdToSupabaseId[customerFirebaseId];

    if (!clienteId) {
      console.log(`  ⚠ Card ${doc.id}: cliente no encontrado (${customerFirebaseId})`);
      continue;
    }

    const statusMap = { active: "activa", completed: "completada", redeemed: "canjeada", expired: "expirada" };
    const estado = statusMap[d.status] || "activa";
    const createdAt = d.createdAt?.toDate?.() || new Date();
    const lastStamp = d.lastStampAt?.toDate?.() || null;
    const completedAt = d.completedAt?.toDate?.() || null;
    const redeemedAt = d.redeemedAt?.toDate?.() || null;

    const res = await pgClient.query(`
      INSERT INTO tarjetas (negocio_id, cliente_id, recompensa_id, sellos, sellos_maximos,
        estado, pin_hash, creado_en, ultimo_sello_en, completada_en, canjeada_en, actualizado_en)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $8)
      RETURNING id
    `, [
      NEGOCIO_ID,
      clienteId,
      recompensaId,
      d.stamps || 0,
      d.maxStamps || 5,
      estado,
      d.pinHash || null,
      createdAt,
      lastStamp,
      completedAt,
      redeemedAt,
    ]);

    firebaseCardToSupabase[doc.id] = res.rows[0].id;
    cardsCreated++;
  }

  console.log(`  ✓ Tarjetas: ${cardsCreated} creadas`);

  // ── 3. Migrate Stamp Events ──
  console.log("\n── Migrando stamp-events ──");
  const eventsSnap = await getDocs(collection(db, "stamp-events"));
  let eventsCreated = 0, eventsSkipped = 0;

  for (const doc of eventsSnap.docs) {
    const d = doc.data();
    const cardFirebaseId = d.cardId?.id || d.cardId;
    const customerFirebaseId = d.customerId?.id || d.customerId;

    const tarjetaId = firebaseCardToSupabase[cardFirebaseId];
    const clienteId = firebaseIdToSupabaseId[customerFirebaseId];

    if (!tarjetaId || !clienteId) {
      eventsSkipped++;
      continue;
    }

    const sourceMap = { manual: "manual", promo: "promo", auto: "auto", redemption: "canje", referral_bonus: "bono_referido" };
    const origen = sourceMap[d.source] || "manual";
    const createdAt = d.createdAt?.toDate?.() || new Date();

    await pgClient.query(`
      INSERT INTO eventos_sello (negocio_id, tarjeta_id, cliente_id, creado_en,
        tipo_bebida, tamano, agregado_por, id_barista, notas, origen)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      NEGOCIO_ID,
      tarjetaId,
      clienteId,
      createdAt,
      d.drinkType || null,
      d.size || null,
      d.addedBy || "system",
      d.baristaId || null,
      d.notes || null,
      origen,
    ]);

    eventsCreated++;
  }

  console.log(`  ✓ Eventos: ${eventsCreated} creados, ${eventsSkipped} skipped`);

  // ── 4. Migrate Menu Sections + Items ──
  console.log("\n── Migrando menu-sections ──");
  const sectionsSnap = await getDocs(collection(db, "menu-sections"));
  let sectionsCreated = 0, itemsCreated = 0;

  for (const secDoc of sectionsSnap.docs) {
    const s = secDoc.data();

    const secRes = await pgClient.query(`
      INSERT INTO secciones_menu (negocio_id, titulo, descripcion, tipo, orden, activa, creado_en)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, [
      NEGOCIO_ID,
      s.title || "Sin título",
      s.description || null,
      s.type || "bebida",
      s.order || 0,
      s.active !== false,
    ]);

    const seccionId = secRes.rows[0].id;
    sectionsCreated++;

    // Get items subcollection
    const itemsSnap = await getDocs(collection(db, "menu-sections", secDoc.id, "items"));
    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data();

      await pgClient.query(`
        INSERT INTO items_menu (negocio_id, seccion_id, nombre, precio, descripcion,
          ingredientes, opcionales, nota, tamanos, imagen_url, disponible,
          etiquetas, destacado, estacional, orden)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        NEGOCIO_ID,
        seccionId,
        item.name || "Sin nombre",
        item.price || null,
        item.description || null,
        item.ingredients || [],
        item.optional || [],
        item.note || null,
        JSON.stringify(item.sizes || []),
        item.imageUrl || null,
        item.available !== false,
        item.tags || [],
        item.highlight || false,
        item.seasonal || false,
        item.order || 0,
      ]);

      itemsCreated++;
    }
  }

  console.log(`  ✓ Secciones: ${sectionsCreated}, Items: ${itemsCreated}`);

  // ── 5. Migrate Rewards Config ──
  console.log("\n── Actualizando reward config ──");
  // The reward doc "default" has the actual config
  const { getDoc, doc: fireDoc } = await import("firebase/firestore");
  try {
    const rewardDoc = await getDoc(fireDoc(db, "rewards", "default"));
    if (rewardDoc.exists()) {
      const r = rewardDoc.data();
      await pgClient.query(`
        UPDATE recompensas SET nombre = $1, descripcion = $2, sellos_requeridos = $3, actualizado_en = NOW()
        WHERE negocio_id = $4 AND es_default = TRUE
      `, [r.name || "Bebida Gratis", r.description || null, r.requiredStamps || 5, NEGOCIO_ID]);
      console.log(`  ✓ Reward: "${r.name}", ${r.requiredStamps} sellos`);
    }
  } catch (e) {
    console.log("  ~ No reward doc found, using defaults");
  }

  // ── 6. Migrate Admin Config ──
  console.log("\n── Migrando admin config ──");
  try {
    const configDoc = await getDoc(fireDoc(db, "config", "admin"));
    if (configDoc.exists()) {
      const c = configDoc.data();
      await pgClient.query(`
        UPDATE config_admin SET pin_hmac = $1, longitud_pin = $2, actualizado_en = NOW()
        WHERE negocio_id = $3
      `, [c.pinHmac || null, c.pinLength || 4, NEGOCIO_ID]);
      console.log(`  ✓ Admin config migrated (pinLength: ${c.pinLength})`);
    }
  } catch (e) {
    console.log("  ~ No admin config found");
  }

  await pgClient.end();
  console.log("\n✅ Migración completa!");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("✗ Error:", e);
  process.exit(1);
});
