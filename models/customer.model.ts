import { Timestamp } from "firebase/firestore";

export interface Customer {
  /** Datos básicos */
  name?: string;                // Puede ser opcional (sin fricción)
  phone?: string;               // WhatsApp / identificación futura

  /** Estado */
  active: boolean;

  /** Trazabilidad */
  createdAt: Timestamp;
  lastVisitAt?: Timestamp;

  /** Notas internas */
  notes?: string;               // "Le gusta moka", "sin azúcar"

  /** Versionado */
  schemaVersion: number;
}
