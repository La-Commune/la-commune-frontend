"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { hapticSuccess, hapticCelebration } from "@/lib/haptics";

type ToastFn = (msg: { title: string; description?: string }) => void;

/**
 * Hook que escucha eventos de Supabase Realtime y muestra toasts in-app.
 * Escucha INSERT en eventos_sello para el cliente actual.
 */
export function useRealtimeToasts(customerId: string | null, showToast: ToastFn) {
  const shownRef = useRef(new Set<string>());

  useEffect(() => {
    if (!customerId) return;
    const sb = getSupabase();

    // Escuchar nuevos sellos del cliente
    const channel = sb
      .channel(`inapp-toasts-${customerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "eventos_sello",
          filter: `cliente_id=eq.${customerId}`,
        },
        (payload) => {
          const eventId = payload.new?.id;
          if (!eventId || shownRef.current.has(eventId)) return;
          shownRef.current.add(eventId);

          const source = payload.new?.source as string;

          if (source === "canje" || source === "redemption") {
            hapticCelebration();
            showToast({
              title: "¡Cortesía canjeada!",
              description: "Tu nueva tarjeta ya está lista",
            });
          } else if (source === "referral_bonus") {
            hapticSuccess();
            showToast({
              title: "¡Sello bonus!",
              description: "Un amigo se registró con tu invitación",
            });
          } else {
            hapticSuccess();
            const drink = payload.new?.tipo_bebida as string | undefined;
            showToast({
              title: "¡Sello agregado!",
              description: drink ? `${drink} sumado a tu tarjeta` : "Un sello más en tu tarjeta",
            });
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [customerId, showToast]);
}
