import {
  Firestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentReference,
} from "firebase/firestore";

export interface StampEventRaw {
  id: string;
  createdAt: Timestamp;
  source: string;
  drinkType?: string;
}

export async function getStampEventsInRange(
  firestore: Firestore,
  fromDate: Date,
): Promise<StampEventRaw[]> {
  const q = query(
    collection(firestore, "stamp-events"),
    where("createdAt", ">=", Timestamp.fromDate(fromDate)),
    orderBy("createdAt", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<StampEventRaw, "id">),
  }));
}

export async function getAllStampEvents(firestore: Firestore): Promise<StampEventRaw[]> {
  const q = query(collection(firestore, "stamp-events"), limit(1000));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<StampEventRaw, "id">),
  }));
}

export async function getTotalCustomers(firestore: Firestore): Promise<number> {
  const q = query(
    collection(firestore, "customers"),
    where("active", "==", true),
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function getTotalRedemptions(firestore: Firestore): Promise<number> {
  const q = query(
    collection(firestore, "stamp-events"),
    where("source", "==", "redemption"),
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function getCustomerTopDrinks(
  firestore: Firestore,
  customerId: DocumentReference,
  limitN = 3,
): Promise<{ drink: string; count: number }[]> {
  const q = query(
    collection(firestore, "stamp-events"),
    where("customerId", "==", customerId),
  );
  const snap = await getDocs(q);
  const drinkCount: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.drinkType && data.source !== "redemption") {
      drinkCount[data.drinkType] = (drinkCount[data.drinkType] ?? 0) + 1;
    }
  });
  return Object.entries(drinkCount)
    .map(([drink, count]) => ({ drink, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limitN);
}
