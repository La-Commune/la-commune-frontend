"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PwaRegister() {
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Registrar service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Mostrar hint de instalación en iOS si no está en modo standalone
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const hintDismissed = sessionStorage.getItem("pwa-hint-dismissed");

    if (isIos && !isStandalone && !hintDismissed) {
      const timer = setTimeout(() => setShowIosHint(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("pwa-hint-dismissed", "1");
    setShowIosHint(false);
  };

  return (
    <AnimatePresence>
      {showIosHint && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-6 left-4 right-4 z-[300] mx-auto max-w-sm rounded-2xl bg-neutral-900 border border-stone-800 px-5 py-4 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-1">
              <p className="text-[11px] uppercase tracking-[0.3em] text-stone-400">
                Instala la app
              </p>
              <p className="text-sm text-stone-300 leading-snug">
                Toca{" "}
                <span className="inline-flex items-center gap-0.5 text-stone-200">
                  {/* Ícono compartir de iOS */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 inline">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16 6 12 2 8 6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </span>{" "}
                y luego <strong className="text-white font-normal">"Añadir a pantalla de inicio"</strong> para acceder a tu tarjeta sin abrir Safari.
              </p>
            </div>
            <button
              onClick={dismiss}
              className="text-stone-600 hover:text-stone-300 transition-colors pt-0.5 shrink-0"
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
