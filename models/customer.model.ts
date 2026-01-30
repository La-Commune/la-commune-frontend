import { Timestamp } from "firebase/firestore";

export interface Customer {
  name?: string;
  phone?: string;

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

  notes?: string;

  schemaVersion: number;
}
