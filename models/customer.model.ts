import { Timestamp } from "firebase/firestore";

export interface Customer {
  name?: string;
  phone?: string;
  email?: string;

  /** Identidad técnica */
  deviceIds?: string[]; // para multidevice futuro

  /** Estado */
  active: boolean;

  /** Métricas útiles */
  totalVisits?: number;
  totalStamps?: number;

  /** Trazabilidad */
  createdAt: Timestamp;
  lastVisitAt?: Timestamp;

  /** Marketing (opcional) */
  consentWhatsApp?: boolean;
  consentEmail?: boolean;

  /** PIN de recuperación (HMAC-SHA256, verificado server-side) */
  pinHmac?: string;

  notes?: string;

  /** Referidos */
  referrerCustomerId?: string;
  referralBonusGiven?: boolean;

  schemaVersion: number;
}
