import { collection, addDoc, Timestamp } from "firebase/firestore";
import { Customer } from "@/models/customer.model";

export async function createCustomer(
  firestore: any,
  data: Pick<Customer, "name" | "phone">
) {
  return addDoc(collection(firestore, "customers"), {
    ...data,
    active: true,
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


