"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook mejorado de detección de red.
 *
 * navigator.onLine NO es confiable — solo detecta conexión al router,
 * no al internet. Este hook combina:
 *  1. navigator.onLine como señal rápida (false = siempre offline, true = puede ser falso positivo)
 *  2. Fetch HEAD periódico al propio origen para confirmar conectividad real
 *  3. Eventos online/offline del browser para reaccionar rápido
 *
 * Retorna:
 *  - isOnline: true si hay conectividad real confirmada
 *  - isChecking: true durante la verificación
 *  - checkNow: función para forzar un check manual (ej. retry button)
 */

const CHECK_INTERVAL_MS = 30_000; // 30s check periódico cuando online
const OFFLINE_RETRY_MS = 5_000; // 5s retry cuando offline (más agresivo)
const FETCH_TIMEOUT_MS = 5_000; // 5s timeout para el check

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isChecking, setIsChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    // Si el browser dice offline, es confiable — no hay red
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return false;
    }

    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      // HEAD request al propio origin con cache-bust
      // Usar /icons/icon-192.png que siempre existe y es pequeño
      const res = await fetch(`/icons/icon-192.png?_cb=${Date.now()}`, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
        // Importante: NO pasar por el service worker para este check
        headers: { "X-Network-Check": "1" },
      });

      clearTimeout(timer);
      const online = res.ok;
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const startPolling = useCallback(
    (interval: number) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        checkConnectivity();
      }, interval);
    },
    [checkConnectivity]
  );

  useEffect(() => {
    // Check inicial
    checkConnectivity();

    const handleOnline = () => {
      // El browser dice que hay red — verificar si es real
      checkConnectivity();
      startPolling(CHECK_INTERVAL_MS);
    };

    const handleOffline = () => {
      setIsOnline(false);
      // Polling más frecuente para detectar reconexión rápido
      startPolling(OFFLINE_RETRY_MS);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Polling normal
    startPolling(navigator.onLine ? CHECK_INTERVAL_MS : OFFLINE_RETRY_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkConnectivity, startPolling]);

  return { isOnline, isChecking, checkNow: checkConnectivity };
}
