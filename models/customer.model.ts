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

/** Fila cruda de Supabase (tabla clientes) — campos que el frontend consume */
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
  pin_hmac?: string | null;
  notas?: string | null;
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
    pinHmac: row.pin_hmac ?? undefined,
    notes: row.notas ?? undefined,
    referrerCustomerId: row.id_referidor ?? undefined,
    referralBonusGiven: row.bono_referido_entregado ?? undefined,
    schemaVersion: 1,
  };
}
