import { doc, runTransaction, Timestamp, collection, DocumentReference, addDoc } from "firebase/firestore";

export async function createCard(
  firestore: any,
  params: {
    customerRef: DocumentReference;
    rewardRef: DocumentReference;
    maxStamps: number;
  },
) {
  return addDoc(collection(firestore, "cards"), {
    customerId: params.customerRef,
    rewardId: params.rewardRef,
    stamps: 0,
    maxStamps: params.maxStamps,
    status: "active",
    createdAt: Timestamp.now(),
    schemaVersion: 1,
  });
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
