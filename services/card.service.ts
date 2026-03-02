import { Card } from "@/models/card.model";
import { StampEvent } from "@/models/stamp-event.model";
import { Firestore, doc, runTransaction, Timestamp, collection, DocumentReference, addDoc, where, query, getDocs, updateDoc, orderBy, deleteField } from "firebase/firestore";

export async function createCard(
  firestore: Firestore,
  params: {
    customerRef: DocumentReference;
    rewardRef: DocumentReference;
  },
) {
  const cardData : Card = {
    customerId: params.customerRef,
    rewardId: params.rewardRef,
    stamps: 0,
    maxStamps: 5,
    status: "active",
    createdAt: Timestamp.now(),
    schemaVersion: 1
  }
  return addDoc(collection(firestore, "cards"), cardData);
}
export type AddStampResult = {
  stamps: number;
  maxStamps: number;
  status: string;
  eventId: string;
};

export async function addStamp(
  firestore: Firestore,
  cardId: string,
  options?: {
    customerId?: DocumentReference;
    addedBy?: string;
    drinkType?: string;
    size?: string;
  },
): Promise<AddStampResult> {
  const cardRef = doc(firestore, "cards", cardId);
  const eventsRef = collection(firestore, "stamp-events");
  const eventRef = doc(eventsRef); // Create ref with auto-ID before transaction
  let result: AddStampResult | null = null;

  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(cardRef);
    if (!snap.exists()) throw new Error("Card not found");

    const card = snap.data();
    if (card.stamps >= card.maxStamps) {
      result = { stamps: card.stamps, maxStamps: card.maxStamps, status: card.status, eventId: "" };
      return;
    }

    const newStamps = card.stamps + 1;
    const isComplete = newStamps >= card.maxStamps;
    const newStatus = isComplete ? "completed" : card.status;

    tx.update(cardRef, {
      stamps: newStamps,
      lastStampAt: Timestamp.now(),
      ...(isComplete ? { status: "completed", completedAt: Timestamp.now() } : {}),
    });

    tx.set(eventRef, {
      cardId: cardRef,
      customerId: options?.customerId ?? null,
      createdAt: Timestamp.now(),
      addedBy: options?.addedBy ?? "system",
      source: "manual",
      ...(options?.drinkType ? { drinkType: options.drinkType } : {}),
      ...(options?.size ? { size: options.size } : {}),
    });

    result = { stamps: newStamps, maxStamps: card.maxStamps, status: newStatus, eventId: eventRef.id };
  });

  return result!;
}

export async function undoStamp(
  firestore: Firestore,
  cardId: string,
  eventId: string,
): Promise<void> {
  const cardRef = doc(firestore, "cards", cardId);
  const eventRef = doc(firestore, "stamp-events", eventId);

  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(cardRef);
    if (!snap.exists()) throw new Error("Card not found");

    const card = snap.data();
    const newStamps = Math.max(0, card.stamps - 1);
    const wasCompleted = card.status === "completed";

    tx.update(cardRef, {
      stamps: newStamps,
      ...(wasCompleted ? { status: "active", completedAt: deleteField() } : {}),
    });
    tx.delete(eventRef);
  });
}

export async function redeemCard(
  firestore: Firestore,
  params: {
    oldCardId: string;
    customerRef: DocumentReference;
    rewardRef: DocumentReference;
  },
) {
  const oldCardRef = doc(firestore, "cards", params.oldCardId);

  // Marcar tarjeta actual como canjeada
  await updateDoc(oldCardRef, {
    status: "redeemed",
    redeemedAt: Timestamp.now(),
  });

  // Log del canje para auditoría
  await addDoc(collection(firestore, "stamp-events"), {
    cardId: oldCardRef,
    customerId: params.customerRef,
    createdAt: Timestamp.now(),
    addedBy: "barista",
    source: "redemption",
  });

  // Crear nueva tarjeta limpia para el mismo cliente
  const newCardRef = await createCard(firestore, {
    customerRef: params.customerRef,
    rewardRef: params.rewardRef,
  });

  return newCardRef;
}

export async function getStampEventsByCard(
  firestore: Firestore,
  cardId: string,
): Promise<(StampEvent & { id: string })[]> {
  const cardRef = doc(firestore, "cards", cardId);
  const q = query(
    collection(firestore, "stamp-events"),
    where("cardId", "==", cardRef),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as StampEvent) }));
}

export async function getCardByCustomer(
  firestore: Firestore,
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
