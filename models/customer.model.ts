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
  createdAt: string | Date;
  lastVisitAt?: string | Date;

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

/**
 * Fila cruda de Supabase (tabla clientes) — campos que el frontend de CLIENTE consume.
 *
 * SEGURIDAD: pin_hmac y notas NO están aquí a propósito. Este mapper también
 * procesa payloads de REALTIME (que traen la fila completa en cada UPDATE —
 * p. ej. en cada sello). Mapearlos filtraría el HMAC del PIN y las notas del
 * staff al navegador. Las vistas de admin que los necesitan tienen su propio
 * fetch (customer.service / CustomerDirectory).
 */
export interface ClienteRow {
  nombre: string;
  telefono: string;
  email?: string | null;
  activo: boolean;
  total_visitas: number;
  total_sellos: number;
  creado_en: string;
  ultima_visita?: string | null;
  consentimiento_whatsapp?: boolean | null;
  consentimiento_email?: boolean | null;
  id_referidor?: string | null;
  bono_referido_entregado?: boolean | null;
}

/**
 * Mapea la fila de Supabase al modelo Customer.
 * (Simetría con mapTarjetaToCard y mapRecompensaToReward — un solo lugar
 * que conoce los nombres de columnas de `clientes`.)
 */
export function mapClienteToCustomer(row: ClienteRow): Customer {
  return {
    name: row.nombre,
    phone: row.telefono,
    email: row.email ?? undefined,
    active: row.activo,
    totalVisits: row.total_visitas,
    totalStamps: row.total_sellos,
    createdAt: new Date(row.creado_en),
    lastVisitAt: row.ultima_visita ? new Date(row.ultima_visita) : undefined,
    consentWhatsApp: row.consentimiento_whatsapp ?? undefined,
    consentEmail: row.consentimiento_email ?? undefined,
    referrerCustomerId: row.id_referidor ?? undefined,
    referralBonusGiven: row.bono_referido_entregado ?? undefined,
    schemaVersion: 1,
  };
}
