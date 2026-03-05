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
    referrerCustomerId?: string;
    pinHmac?: string;
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
    ...(data.referrerCustomerId ? { referrerCustomerId: data.referrerCustomerId } : {}),
    ...(data.pinHmac ? { pinHmac: data.pinHmac } : {}),
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

  // Sort client-side to get most recent (avoids composite index)
  const docs = snap.docs
    .map((d) => ({ id: d.id, ref: doc(firestore, "customers", d.id), ...d.data() }))
    .sort((a, b) => {
      const ta = (a as any).createdAt?.toMillis?.() ?? 0;
      const tb = (b as any).createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

  return docs[0];
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

  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

/** Like getCardByCustomer but also finds completed cards (useful for recovery). */
export async function getAnyCardByCustomer(firestore: Firestore, customerRef: DocumentReference) {
  const q = query(
    collection(firestore, "cards"),
    where("customerId", "==", customerRef),
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const cards = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

  // Prefer active > completed > anything else
  const active = cards.find((c) => c.status === "active");
  if (active) return active;

  const completed = cards.find((c) => c.status === "completed");
  if (completed) return completed;

  return cards[0];
}

export async function updateCustomerPhone(
  firestore: Firestore,
  customerId: string,
  phone: string,
): Promise<void> {
  await updateDoc(doc(firestore, "customers", customerId), { phone });
}
