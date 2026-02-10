import { Card } from "@/models/card.model";
import { doc, runTransaction, Timestamp, collection, DocumentReference, addDoc, where, query, getDocs } from "firebase/firestore";

export async function createCard(
  firestore: any,
  params: {
    customerRef: DocumentReference;
    rewardRef: DocumentReference;
  },
) {
  const cardData : Card = {
    customerId: params.customerRef,
    rewardId: params.rewardRef,
    stamps: 0,
    maxStamps: 7,
    status: "active",
    createdAt: Timestamp.now(),
    schemaVersion: 1
  }
  return addDoc(collection(firestore, "cards"), cardData);
}
export async function addStamp(firestore: any, cardId: string) {
  const cardRef = doc(firestore, "cards", cardId);
  const eventsRef = collection(firestore, "stampEvents");

  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(cardRef);
    if (!snap.exists()) throw new Error("Card not found");

    const card = snap.data();

    if (card.stamps >= card.maxStamps) return;

    tx.update(cardRef, {
      stamps: card.stamps + 1,
      lastStampAt: Timestamp.now(),
    });

    tx.set(doc(eventsRef), {
      cardId: cardRef,
      createdAt: Timestamp.now(),
      source: "manual",
    });
  });
}

export async function getCardByCustomer(
  firestore: any,
  customerRef: DocumentReference,
) {
  const q = query(
    collection(firestore, "cards"),
    where("customerId", "==", customerRef),
    where("status", "==", "active"),
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const doc = snap.docs[0];

  return {
    id: doc.id,
    ...doc.data(),
  };
}
