export interface Card {
  id?: string;
  customerId?: string;
  rewardId?: string;

  stamps: number;
  maxStamps: number;

  status: "activa" | "completada" | "canjeada" | "expirada";

  createdAt?: string | Date;
  lastStampAt?: string | Date;
  completedAt?: string | Date;
  redeemedAt?: string | Date;

  pinHash?: string;
  schemaVersion?: number;
}

/** Fila cruda de Supabase (tabla tarjetas) */
export interface TarjetaRow {
  id: string;
  negocio_id: string;
  cliente_id: string;
  recompensa_id: string;
  sellos: number;
  sellos_maximos: number;
  estado: "activa" | "completada" | "canjeada" | "expirada";
  creado_en: string;
  actualizado_en: string;
  completada_en?: string | null;
  canjeada_en?: string | null;
}

export function mapTarjetaToCard(row: TarjetaRow): Card & { id: string } {
  return {
    id: row.id,
    customerId: row.cliente_id,
    rewardId: row.recompensa_id,
    stamps: row.sellos,
    maxStamps: row.sellos_maximos,
    status: row.estado,
    createdAt: row.creado_en,
    completedAt: row.completada_en ?? undefined,
    redeemedAt: row.canjeada_en ?? undefined,
  };
}
