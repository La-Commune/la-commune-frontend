"use client";

import { useEffect, useRef } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface PushPromptProps {
  clienteId?: string;
  /** Retraso en ms antes de pedir permiso (default: 3000) */
  delay?: number;
}

/**
 * Componente invisible que solicita permiso de notificaciones push
 * usando el diálogo nativo del navegador.
 *
 * - No renderiza nada en la UI
 * - Pide permiso automáticamente después de un delay
 * - Solo lo hace una vez por sesión (sessionStorage)
 * - Si el usuario acepta, suscribe automáticamente
 */
export function PushPrompt({ clienteId, delay = 3000 }: PushPromptProps) {
  const { permission, isSubscribed, subscribe, isSupported } =
    usePushNotifications(clienteId);
  const attempted = useRef(false);

  useEffect(() => {
    // No hacer nada si: no soportado, ya suscrito, ya denegado, o ya se intentó
    if (!isSupported || isSubscribed || permission === "denied" || attempted.current) return;

    // No repetir si ya se pidió en esta sesión
    const alreadyAsked = sessionStorage.getItem("push-prompt-asked");
    if (alreadyAsked) return;

    const timer = setTimeout(async () => {
      attempted.current = true;
      sessionStorage.setItem("push-prompt-asked", "1");
      await subscribe();
    }, delay);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission, subscribe, delay]);

  // No renderiza nada — el navegador muestra su diálogo nativo
  return null;
}
