/**
 * Logger centralizado — reemplaza console.log/warn/error en todo el proyecto.
 *
 * - Desarrollo: imprime todo con contexto
 * - Producción: solo errores, sin datos sensibles (sin payloads, sin mensajes internos)
 *
 * Uso:
 *   import { logger } from "@/lib/logger";
 *   logger.info("card-service", "Tarjeta creada");
 *   logger.warn("pwa", "SW registration falló");
 *   logger.error("onboarding", "Error inesperado", error);
 */

const isDev = process.env.NODE_ENV === "development";

function formatPrefix(context: string): string {
  return `[${context}]`;
}

export const logger = {
  /** Solo se imprime en desarrollo */
  info(context: string, message: string, ...data: unknown[]) {
    if (isDev) {
      console.log(formatPrefix(context), message, ...data);
    }
  },

  /** Solo se imprime en desarrollo */
  warn(context: string, message: string, ...data: unknown[]) {
    if (isDev) {
      console.warn(formatPrefix(context), message, ...data);
    }
  },

  /**
   * Errores: siempre se loguean, pero en producción solo el contexto y mensaje genérico.
   * NUNCA se loguean payloads, stack traces ni mensajes internos de Supabase/Postgres.
   */
  error(context: string, message: string, ...data: unknown[]) {
    if (isDev) {
      console.error(formatPrefix(context), message, ...data);
    } else {
      // Producción: solo contexto + mensaje genérico, sin datos sensibles
      console.error(formatPrefix(context), message);
    }
  },
};
