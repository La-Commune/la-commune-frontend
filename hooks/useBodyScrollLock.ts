"use client";

import { useEffect } from "react";

/**
 * Bloquea el scroll del body mientras el componente está montado.
 * Útil para modals y bottom sheets — evita que el contenido de atrás
 * haga scroll cuando el usuario arrastra dentro del overlay.
 *
 * Restaura el overflow original al desmontar.
 */
export function useBodyScrollLock() {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
}
