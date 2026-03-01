import {
  Firestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
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
