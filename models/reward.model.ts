import { Timestamp } from "firebase/firestore";

export interface Reward {
    name: string;
    description: string;
    requiredStamps: number;
    type: "drink" | "discount" | "custom";
    active: boolean;
    expiresAt?: Timestamp;
  }
  