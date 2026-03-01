import {
  Firestore,
  DocumentReference,
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { Customer } from "@/models/customer.model";

export async function createCustomer(
  firestore: Firestore,
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

export async function getCustomerByPhone(firestore: Firestore, phone: string) {
  const q = query(
    collection(firestore, "customers"),
    where("phone", "==", phone),
    where("active", "==", true),
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];
  return { id: d.id, ref: doc(firestore, "customers", d.id), ...d.data() };
}

export async function getAllCustomers(
  firestore: Firestore,
): Promise<(Customer & { id: string })[]> {
  const q = query(
    collection(firestore, "customers"),
    where("active", "==", true),
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Customer) }));
  // Ordenar en cliente para evitar índice compuesto en Firestore
  return docs.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

export async function updateCustomerNotes(
  firestore: Firestore,
  customerId: string,
  notes: string,
): Promise<void> {
  await updateDoc(doc(firestore, "customers", customerId), { notes });
}

export async function deleteCustomer(
  firestore: Firestore,
  customerId: string,
): Promise<void> {
  await updateDoc(doc(firestore, "customers", customerId), { active: false });
}

export async function getCardByCustomer(firestore: Firestore, customerRef: DocumentReference) {
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
