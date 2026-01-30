import { Timestamp, DocumentReference } from "firebase/firestore";

export interface StampEvent {
  cardId: DocumentReference;
  customerId?: DocumentReference;

  createdAt: Timestamp;

  drinkType?: string;
  size?: "10oz" | "12oz";

  /** Auditoría */
  addedBy?: "barista" | "system";
  baristaId?: string;

  notes?: string;

  source: "manual" | "promo" | "auto";
}
