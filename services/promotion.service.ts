import {
  Firestore,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { Promotion } from "@/models/promotion.model";

const COL = "promotions";

export async function getPromotions(firestore: Firestore): Promise<Promotion[]> {
  const snap = await getDocs(
    query(collection(firestore, COL), orderBy("order"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Promotion));
}

/** Returns only promotions that are active AND currently within their date range */
export async function getActivePromotions(firestore: Firestore): Promise<Promotion[]> {
  const all = await getPromotions(firestore);
  const now = new Date();

  return all.filter((p) => {
    if (!p.active) return false;

    const start = p.startsAt instanceof Timestamp ? p.startsAt.toDate() : new Date(p.startsAt);
    const end = p.endsAt instanceof Timestamp ? p.endsAt.toDate() : new Date(p.endsAt);

    // Set end to end-of-day
    end.setHours(23, 59, 59, 999);

    if (now < start || now > end) return false;

    // Check day-of-week filter
    if (p.daysOfWeek.length > 0 && !p.daysOfWeek.includes(now.getDay())) return false;

    return true;
  });
}

export async function addPromotion(
  firestore: Firestore,
  data: Omit<Promotion, "id">
): Promise<string> {
  const ref = await addDoc(collection(firestore, COL), data);
  return ref.id;
}

export async function updatePromotion(
  firestore: Firestore,
  promoId: string,
  data: Partial<Promotion>
): Promise<void> {
  const { id: _id, ...rest } = data as Promotion;
  await updateDoc(doc(firestore, COL, promoId), rest as Record<string, unknown>);
}

export async function deletePromotion(
  firestore: Firestore,
  promoId: string
): Promise<void> {
  await deleteDoc(doc(firestore, COL, promoId));
}
