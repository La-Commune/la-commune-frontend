import { Timestamp, DocumentReference } from "firebase/firestore";

export interface Card {
  customerId: DocumentReference;
  rewardId: DocumentReference;

  stamps: number;
  maxStamps: number;

  status: "active" | "completed" | "redeemed" | "expired";

  /** Control */
  createdAt: Timestamp;
  lastStampAt?: Timestamp;
  completedAt?: Timestamp;
  redeemedAt?: Timestamp;

  /** Seguridad */
  pinHash?: string; // para vista barista

  schemaVersion: number;
}
