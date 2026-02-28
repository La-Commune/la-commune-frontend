import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Customer } from "@/models/customer.model";

export async function createCustomer(
  firestore: any,
  data: {
    name?: string;
    phone: string;
    consentWhatsApp: boolean;
  },
) {
  const customerData: Customer = {
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
  };
  return addDoc(collection(firestore, "customers"), customerData);
}

export async function getCardByCustomer(firestore: any, customerRef: any) {
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
