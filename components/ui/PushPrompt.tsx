"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushPromptProps {
  clienteId?: string;
}

/**
 * Banner que invita al usuario a activar notificaciones push.
 * Se muestra solo si:
 * - El navegador soporta push
 * - El usuario aún no ha dado permiso
 * - No ha sido descartado en esta sesión
 *
 * Se recomienda mostrar después de una acción positiva (ej: primer sello)
 * para aumentar la tasa de aceptación (contexto psicológico).
 */
export function PushPrompt({ clienteId }: PushPromptProps) {
  const { permission, isSubscribed, loading, subscribe, isSupported } =
    usePushNotifications(clienteId);
  const [dismissed, setDismissed] = useState(false);

  // No mostrar si: no soportado, ya suscrito, ya denegado, o descartado
  if (!isSupported || isSubscribed || permission === "denied" || dismissed) {
    return null;
  }

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setDismissed(true);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.4, delay: 1 }}
        className="mx-4 mt-4 rounded-2xl bg-neutral-900 border border-stone-800 px-5 py-4 shadow-lg"
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.3em] text-stone-400">
              Notificaciones
            </p>
            <p className="text-sm text-stone-300 leading-snug">
              Recibe avisos cuando estes cerca de tu bebida de cortesia
              y ofertas exclusivas.
            </p>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="text-[11px] uppercase tracking-[0.3em] text-white bg-stone-700 hover:bg-stone-600 disabled:opacity-50 transition-colors px-4 py-2 rounded-full"
            >
              {loading ? "Activando..." : "Activar"}
            </button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-stone-600 hover:text-stone-300 transition-colors pt-0.5 shrink-0"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
