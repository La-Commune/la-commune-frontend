import { collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { Customer } from "@/models/customer.model";

export async function createCustomer(
  firestore: any,
  data: {
    name?: string;
    phone: string;
    consentWhatsApp: boolean;
  },
) {
  return addDoc(collection(firestore, "customers"), {
    name: data.name ?? null,
    phone: data.phone,
    consentWhatsApp: data.consentWhatsApp,
    active: true,
    totalVisits: 0,
    totalStamps: 0,
    createdAt: Timestamp.now(),
    schemaVelastVisitAtrsion: Timestamp.now(),
    notes: '',
  });
}

export async function getCardByCustomer(
  firestore: any,
  customerRef: any,
) {
  const q = query(
    collection(firestore, "cards"),
    where("customerId", "==", customerRef),
    where("status", "==", "active"),
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}