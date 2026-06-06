"use server";

import { getSupabaseServer } from "@/lib/supabase-server";
import { checkBaristaSession } from "./verifyAdminPin";
import { upsertDefaultRewardWith } from "@/services/reward.service";
import type { Reward } from "@/models/reward.model";
import { logger } from "@/lib/logger";

export type SaveRewardConfigResult =
  | { ok: true; versioned: boolean }
  | { ok: false; error: string };

/**
 * Guarda la configuración de la recompensa default desde el admin.
 *
 * Corre en el servidor con service role porque la anon key NO tiene
 * policies de INSERT/UPDATE en `recompensas` (el guardado client-side
 * anterior fallaba en silencio: UPDATE de 0 filas sin error).
 *
 * Protegida por la cookie de sesión barista (HMAC) con rol admin —
 * mismo modelo de auth que el resto del panel.
 *
 * El versionado por cambio de diseño (DAV-67) vive en
 * `upsertDefaultRewardWith` — ver reward.service.ts.
 */
export async function saveRewardConfig(
  data: Partial<Reward>,
): Promise<SaveRewardConfigResult> {
  // Solo admin puede tocar la recompensa
  const session = await checkBaristaSession();
  if (!session.valid || session.rol !== "admin") {
    return { ok: false, error: "Sesión inválida o sin permisos" };
  }

  // Validación ligera de entrada
  const stamps = Number(data.requiredStamps);
  if (!Number.isInteger(stamps) || stamps < 1 || stamps > 30) {
    return { ok: false, error: "Número de sellos inválido (1–30)" };
  }
  if (typeof data.name !== "string" || data.name.trim().length === 0 || data.name.length > 120) {
    return { ok: false, error: "Nombre de recompensa inválido" };
  }
  if (typeof data.description !== "string" || data.description.length > 500) {
    return { ok: false, error: "Descripción inválida" };
  }
  if (data.illustration !== undefined && typeof data.illustration !== "string") {
    return { ok: false, error: "Ilustración inválida" };
  }

  try {
    const sb = getSupabaseServer();
    const { versioned } = await upsertDefaultRewardWith(sb, {
      name: data.name.trim(),
      description: data.description,
      requiredStamps: stamps,
      type: data.type ?? "drink",
      active: true,
      illustration: data.illustration,
    });
    return { ok: true, versioned };
  } catch (err) {
    logger.error("reward-config", "Error guardando recompensa", err);
    return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
  }
}
