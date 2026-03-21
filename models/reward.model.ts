import type { IllustrationId } from "@/components/ui/stamp-illustrations";

export interface Reward {
  id?: string;
  name: string;
  description: string;
  requiredStamps: number;
  type: "drink" | "discount" | "custom";
  active: boolean;
  expiresAt?: string | Date;
  illustration: IllustrationId;
}

/** Fila cruda de Supabase (tabla recompensas) */
export interface RecompensaRow {
  id: string;
  negocio_id: string;
  nombre: string;
  descripcion: string;
  sellos_requeridos: number;
  tipo: "drink" | "discount" | "custom";
  activa: boolean;
  es_default: boolean;
  expira_en?: string | null;
  ilustracion: string;
  creado_en: string;
  actualizado_en: string;
}

export function mapRecompensaToReward(row: RecompensaRow): Reward & { id: string } {
  return {
    id: row.id,
    name: row.nombre,
    description: row.descripcion,
    requiredStamps: row.sellos_requeridos,
    type: row.tipo,
    active: row.activa,
    expiresAt: row.expira_en ?? undefined,
    illustration: (row.ilustracion || "flat-white-cenital") as IllustrationId,
  };
}
