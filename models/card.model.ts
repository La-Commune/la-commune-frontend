import { Timestamp, DocumentReference } from "firebase/firestore";

export interface Card {
  customerId: DocumentReference;
  rewardId: DocumentReference;

  stamps: number;
  maxStamps: number;

  status: "active" | "completed" | "expired";

  /** Control */
  createdAt: Timestamp;
  lastStampAt?: Timestamp;
  completedAt?: Timestamp;

  /** Seguridad */
  pinHash?: string; // para vista barista

  schemaVersion: number;
}
