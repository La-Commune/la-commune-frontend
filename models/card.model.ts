import { Timestamp, DocumentReference } from "firebase/firestore";

export interface Card {
  customerId?: DocumentReference;
  rewardId: DocumentReference;
  stamps: number;
  maxStamps: number;
  status: "active" | "completed" | "expired";
  createdAt: Timestamp;
  lastStampAt: Timestamp;
  schemaVersion: number;
}
