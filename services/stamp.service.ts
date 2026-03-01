import {
    Firestore,
    DocumentReference,
    doc,
    runTransaction,
    Timestamp,
    collection,
  } from "firebase/firestore";
  
  export async function addStamp(
    firestore: Firestore,
    params: {
      cardId: string;
      customerRef?: DocumentReference;
      source?: "manual" | "promo";
    }
  ) {
    const cardRef = doc(firestore, "cards", params.cardId);
    const eventsRef = collection(firestore, "stampEvents");
  
    await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(cardRef);
      if (!snap.exists()) throw new Error("Card not found");
  
      const card = snap.data();
      if (card.stamps >= card.maxStamps) return;
  
      tx.update(cardRef, {
        stamps: card.stamps + 1,
        lastStampAt: Timestamp.now(),
        status:
          card.stamps + 1 >= card.maxStamps ? "completed" : "active",
      });
  
      tx.set(doc(eventsRef), {
        cardId: cardRef,
        customerId: params.customerRef ?? null,
        createdAt: Timestamp.now(),
        source: params.source ?? "manual",
      });
    });
  }
  