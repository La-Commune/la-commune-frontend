export interface Card {
  id?: string;
  customerId?: string;    // cliente_id UUID
  rewardId?: string;      // recompensa_id UUID

  stamps: number;
  maxStamps: number;

  status: "activa" | "completada" | "canjeada" | "expirada" |
          "active" | "completed" | "redeemed" | "expired"; // backwards compat

  /** Control */
  createdAt?: string | Date;
  lastStampAt?: string | Date;
  completedAt?: string | Date;
  redeemedAt?: string | Date;

  /** Seguridad */
  pinHash?: string;

  schemaVersion?: number;
}
