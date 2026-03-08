import {
  Firestore,
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentReference,
  QueryDocumentSnapshot,
} from "firebase/firestore";

export interface StampEventRaw {
  id: string;
  createdAt: Timestamp;
  source: string;
  drinkType?: string;
}

// ---------------------------------------------------------------------------
// Paginación interna — trae TODOS los docs en batches para no truncar datos
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;

async function fetchAllStampEventsPaginated(
  firestore: Firestore,
  filters: ReturnType<typeof where>[],
): Promise<StampEventRaw[]> {
  const results: StampEventRaw[] = [];
  let lastDoc: QueryDocumentSnapshot | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const constraints = [
      ...filters,
      orderBy("createdAt", "asc"),
      limit(BATCH_SIZE),
      ...(lastDoc ? [startAfter(lastDoc)] : []),
    ];

    const q = query(collection(firestore, "stamp-events"), ...constraints);
    const snap = await getDocs(q);

    snap.docs.forEach((d) => {
      results.push({ id: d.id, ...(d.data() as Omit<StampEventRaw, "id">) });
    });

    if (snap.docs.length < BATCH_SIZE) break; // última página
    lastDoc = snap.docs[snap.docs.length - 1];
  }

  return results;
}

// ---------------------------------------------------------------------------
// Queries públicas
// ---------------------------------------------------------------------------

export async function getStampEventsInRange(
  firestore: Firestore,
  fromDate: Date,
): Promise<StampEventRaw[]> {
  return fetchAllStampEventsPaginated(firestore, [
    where("createdAt", ">=", Timestamp.fromDate(fromDate)),
  ]);
}

/**
 * Obtiene TODOS los stamp events usando paginación cursor-based.
 * Ya no hay limit(1000) — itera en batches de 500 hasta agotar la colección.
 */
export async function getAllStampEvents(
  firestore: Firestore,
): Promise<StampEventRaw[]> {
  return fetchAllStampEventsPaginated(firestore, []);
}

/**
 * Usa getCountFromServer para contar sin traer documentos completos.
 * Más eficiente que getDocs + snap.size para colecciones grandes.
 */
export async function getTotalCustomers(
  firestore: Firestore,
): Promise<number> {
  const q = query(
    collection(firestore, "customers"),
    where("active", "==", true),
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

/**
 * Usa getCountFromServer para contar redemptions sin descargar los docs.
 */
export async function getTotalRedemptions(
  firestore: Firestore,
): Promise<number> {
  const q = query(
    collection(firestore, "stamp-events"),
    where("source", "==", "redemption"),
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function getCustomerTopDrinks(
  firestore: Firestore,
  customerId: DocumentReference,
  limitN = 3,
): Promise<{ drink: string; count: number }[]> {
  const events = await fetchAllStampEventsPaginated(firestore, [
    where("customerId", "==", customerId),
  ]);

  const drinkCount: Record<string, number> = {};
  events.forEach((e) => {
    if (e.drinkType && e.source !== "redemption") {
      drinkCount[e.drinkType] = (drinkCount[e.drinkType] ?? 0) + 1;
    }
  });

  return Object.entries(drinkCount)
    .map(([drink, count]) => ({ drink, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limitN);
}
