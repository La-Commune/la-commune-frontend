"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

/**
 * Hook para pull-to-refresh nativo en mobile.
 * Retorna: { pullDistance, refreshing, handlers }
 * - Montar `handlers` en el container scrollable (o body)
 * - `pullDistance` para animar el indicador (0 → threshold)
 * - `refreshing` para mostrar spinner
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (refreshing) return;
      if (window.scrollY > 5) return; // only trigger at top
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    },
    [refreshing]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (!pulling.current || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) {
        setPullDistance(0);
        return;
      }
      // Resistance: diminishing returns past threshold
      const resistance = dy > threshold ? 0.3 : 0.6;
      const distance = Math.min(dy * resistance, maxPull);
      setPullDistance(distance);
    },
    [refreshing, threshold, maxPull]
  );

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPullDistance(threshold * 0.5); // shrink to spinner size
      try {
        await onRefresh();
      } catch {
        // silencioso
      }
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, threshold, refreshing, onRefresh]);

  // Cleanup si el componente se desmonta durante refresh
  useEffect(() => {
    return () => {
      pulling.current = false;
    };
  }, []);

  return {
    pullDistance,
    refreshing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
