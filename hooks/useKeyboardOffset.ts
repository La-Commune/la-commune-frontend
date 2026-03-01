"use client";

import { useEffect, useState } from "react";

/**
 * Devuelve la altura (en px) que ocupa el teclado virtual.
 * Útil para levantar bottom sheets/modals por encima del teclado en iOS/Android.
 *
 * En iOS el viewport no se redimensiona cuando abre el teclado, pero
 * `window.visualViewport.height` sí encoge, por lo que la diferencia
 * con `window.innerHeight` es la altura del teclado.
 * En Android Chrome el viewport ya encoge solo, el offset queda en 0.
 */
export function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOffset(Math.max(0, window.innerHeight - vv.height));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}
