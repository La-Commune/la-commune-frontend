"use client";

import { useEffect, useState, useCallback } from "react";

// VAPID public key — debe coincidir con la guardada en Supabase Vault
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

type PushState = "prompt" | "granted" | "denied" | "unsupported";

/**
 * Mapea Notification.permission ("default"|"granted"|"denied") a nuestro PushState
 */
function mapPermission(perm: NotificationPermission): PushState {
  if (perm === "granted") return "granted";
  if (perm === "denied") return "denied";
  return "prompt"; // "default" → "prompt"
}

/**
 * Hook para gestionar push notifications.
 *
 * - Detecta soporte del navegador (incluido iOS PWA standalone)
 * - Solicita permiso al usuario
 * - Registra la suscripción en el servidor
 * - Permite desuscribirse
 */
export function usePushNotifications(clienteId?: string) {
  const [permission, setPermission] = useState<PushState>("prompt");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detectar estado inicial
  useEffect(() => {
    // Verificar soporte: SW + PushManager + Notification API
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasPushManager = "PushManager" in window;
    const hasNotification = "Notification" in window;

    if (!hasServiceWorker || !hasPushManager || !hasNotification) {
      setPermission("unsupported");
      if (process.env.NODE_ENV === "development") {
        console.log("[Push] No soportado:", {
          sw: hasServiceWorker,
          push: hasPushManager,
          notif: hasNotification,
        });
      }
      return;
    }

    setPermission(mapPermission(Notification.permission));

    // Verificar si ya está suscrito
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
        if (sub) setPermission("granted");
      });
    });
  }, []);

  // Suscribirse a push notifications
  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) {
      if (process.env.NODE_ENV === "development") {
        console.warn("VAPID_PUBLIC_KEY no configurada");
      }
      return false;
    }

    setLoading(true);
    try {
      // 1. Pedir permiso
      const result = await Notification.requestPermission();
      setPermission(result as PushState);

      if (result !== "granted") {
        return false;
      }

      // 2. Obtener suscripción de PushManager
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Convertir VAPID key de base64url a Uint8Array
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      // 3. Enviar suscripción al servidor
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          clienteId,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al registrar suscripción");
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error suscribiéndose a push:", err);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  // Desuscribirse
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Desactivar en servidor
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Desuscribir en el navegador
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error desuscribiéndose:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    isSupported: permission !== "unsupported",
  };
}

/**
 * Convierte una clave VAPID base64url a Uint8Array
 * (necesario para PushManager.subscribe)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
