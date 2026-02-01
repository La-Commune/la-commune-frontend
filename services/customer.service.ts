import { collection, addDoc, Timestamp } from "firebase/firestore";
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
    schemaVersion: 1,
  });
}

// Uso en componenete

// "use client";

// import { useFirestore } from "reactfire";
// import { createCustomer } from "@/services/customer.service";

// const firestore = useFirestore();

// await createCustomer(firestore, {
//   name: "Juan",
//   phone: "2221234567",
// });
