import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, getDoc, doc as fireDoc } from "firebase/firestore";
import pg from "pg";

const app = initializeApp({
  apiKey: "AIzaSyB1dzpJMtV9fJmQJOkLWqmqfPY86xYCXeQ",
  authDomain: "cafestampcard.firebaseapp.com",
  projectId: "cafestampcard",
  storageBucket: "cafestampcard.firebasestorage.app",
  messagingSenderId: "1027614418365",
  appId: "1:1027614418365:web:1f9a56b757531d842c1ed4",
});

const db = getFirestore(app);
const NEGOCIO = "78c5824a-c564-4055-bb07-8ded54b93092";

const client = new pg.Client({
  connectionString: "postgresql://postgres.ntfmubmmykpzbltbeujv:A1ORa9ll1nqUS98V@aws-1-us-east-1.pooler.supabase.com:6543/postgres",
});

await client.connect();
console.log("Connected to Supabase");

// Menu sections + items
const sectionsSnap = await getDocs(collection(db, "menu-sections"));
let secs = 0, items = 0;

for (const secDoc of sectionsSnap.docs) {
  const s = secDoc.data();
  const tipo = s.type || "otro";

  const r = await client.query(
    "INSERT INTO secciones_menu (negocio_id, titulo, descripcion, tipo, orden, activa) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [NEGOCIO, s.title || "Sin titulo", s.description || null, tipo, s.order || 0, s.active !== false]
  );
  secs++;
  const secId = r.rows[0].id;

  const itemsSnap = await getDocs(collection(db, "menu-sections", secDoc.id, "items"));
  for (const iDoc of itemsSnap.docs) {
    const i = iDoc.data();
    await client.query(
      "INSERT INTO items_menu (negocio_id, seccion_id, nombre, precio, descripcion, ingredientes, opcionales, nota, tamanos, imagen_url, disponible, etiquetas, destacado, estacional, orden) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
      [NEGOCIO, secId, i.name || "", i.price || null, i.description || null, i.ingredients || [], i.optional || [], i.note || null, JSON.stringify(i.sizes || []), i.imageUrl || null, i.available !== false, i.tags || [], i.highlight || false, i.seasonal || false, i.order || 0]
    );
    items++;
  }
}
console.log(`Secciones: ${secs}, Items: ${items}`);

// Reward config
try {
  const rDoc = await getDoc(fireDoc(db, "rewards", "default"));
  if (rDoc.exists()) {
    const r = rDoc.data();
    await client.query("UPDATE recompensas SET nombre=$1, descripcion=$2, sellos_requeridos=$3 WHERE negocio_id=$4 AND es_default=TRUE",
      [r.name || "Bebida Gratis", r.description || null, r.requiredStamps || 5, NEGOCIO]);
    console.log(`Reward: "${r.name}", ${r.requiredStamps} sellos`);
  }
} catch (e) { console.log("No reward doc"); }

// Admin config
try {
  const cDoc = await getDoc(fireDoc(db, "config", "admin"));
  if (cDoc.exists()) {
    const c = cDoc.data();
    await client.query("UPDATE config_admin SET pin_hmac=$1, longitud_pin=$2 WHERE negocio_id=$3",
      [c.pinHmac || null, c.pinLength || 4, NEGOCIO]);
    console.log(`Admin config migrated (pinLength: ${c.pinLength})`);
  }
} catch (e) { console.log("No admin config"); }

await client.end();
console.log("Done!");
process.exit(0);
