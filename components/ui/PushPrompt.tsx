"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushPromptProps {
  clienteId?: string;
  /** Retraso en ms antes de mostrar el prompt (default: 1500) */
  delay?: number;
}

/**
 * Banner que invita al usuario a activar notificaciones push.
 * Se muestra solo si:
 * - El navegador soporta push
 * - El usuario aún no ha dado permiso ni está suscrito
 * - No ha sido descartado en esta sesión (sessionStorage)
 *
 * Se recomienda mostrar después de una acción positiva (ej: primer sello)
 * para aumentar la tasa de aceptación (contexto psicológico).
 */
export function PushPrompt({ clienteId, delay = 1500 }: PushPromptProps) {
  const { permission, isSubscribed, loading, subscribe, isSupported } =
    usePushNotifications(clienteId);
  const [dismissed, setDismissed] = useState(true); // inicia oculto
  const [success, setSuccess] = useState(false);

  // Revisar sessionStorage y mostrar con delay
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("push-prompt-dismissed");
    if (wasDismissed) return;

    const timer = setTimeout(() => setDismissed(false), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // No mostrar si: no soportado, ya suscrito, ya denegado, o descartado
  if (!isSupported || isSubscribed || permission === "denied" || dismissed) {
    // Si se acaba de suscribir con éxito, mostrar confirmación brevemente
    if (success) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.4 }}
          className="mx-4 mt-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/30 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#34d399"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-[13px] text-emerald-300/80 leading-snug">
              Notificaciones activadas. Te avisaremos de tu progreso.
            </p>
          </div>
        </motion.div>
      );
    }
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("push-prompt-dismissed", "1");
  };

  const handleSubscribe = async () => {
    const ok = await subscribe();
    if (ok) {
      setSuccess(true);
      // Ocultar confirmación después de 4s
      setTimeout(() => {
        setSuccess(false);
        setDismissed(true);
      }, 4000);
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-4 mt-4 rounded-2xl bg-[#161412] border border-[#2a2722] px-5 py-5 shadow-lg"
        >
          <div className="flex items-start gap-4">
            {/* Icono de campana */}
            <div className="w-10 h-10 rounded-full bg-[#1e1b17] border border-[#2a2722] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path
                  d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z"
                  stroke="#c8956c"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.73 21a2 2 0 01-3.46 0"
                  stroke="#c8956c"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Contenido */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[13px] font-medium text-[#e8e0d2] leading-snug">
                  No te pierdas tu bebida gratis
                </p>
                <p className="text-[12px] text-[#6b6458] leading-relaxed mt-1">
                  Te avisamos cuando estés cerca de completar tu tarjeta y cuando tu cortesía esté lista.
                </p>
              </div>

              {/* Botones */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="text-[11px] uppercase tracking-[0.25em] text-[#0c0b09] bg-[#c8956c] hover:bg-[#d4a57c] disabled:opacity-50 transition-colors duration-300 px-5 py-2 rounded-full font-medium"
                >
                  {loading ? "Activando..." : "Activar"}
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-[11px] uppercase tracking-[0.2em] text-[#4a443c] hover:text-[#6b6458] transition-colors duration-300"
                >
                  Ahora no
                </button>
              </div>
            </div>

            {/* Cerrar */}
            <button
              onClick={handleDismiss}
              className="text-[#3a3630] hover:text-[#6b6458] transition-colors duration-300 pt-0.5 shrink-0"
              aria-label="Cerrar"
            >
              <svg
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
      )}
    </AnimatePresence>
  );
}
