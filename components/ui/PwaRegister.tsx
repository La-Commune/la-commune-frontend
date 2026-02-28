"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PwaRegister() {
  const [showIosHint, setShowIosHint] = useState(false);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    // Registrar service worker
    if ("serviceWorker" in navigator) {
      const buildId = process.env.NEXT_PUBLIC_BUILD_ID || "v1";
      navigator.serviceWorker.register(`/sw.js?v=${buildId}`).catch(() => {});
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    // Android / Chrome — capturar evento de instalación
    if (!isStandalone && !sessionStorage.getItem("pwa-install-dismissed")) {
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e;
        setShowAndroidBanner(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }

    // iOS — mostrar hint si no está en standalone
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const hintDismissed = sessionStorage.getItem("pwa-hint-dismissed");

    if (isIos && !isStandalone && !hintDismissed) {
      const timer = setTimeout(() => setShowIosHint(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissAndroid = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setShowAndroidBanner(false);
  };

  const installApp = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    setShowAndroidBanner(false);
  };

  const dismiss = () => {
    sessionStorage.setItem("pwa-hint-dismissed", "1");
    setShowIosHint(false);
  };

  return (
    <AnimatePresence>
      {showAndroidBanner && (
        <motion.div
          key="android-banner"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-6 left-4 right-4 z-[300] mx-auto max-w-sm rounded-2xl bg-neutral-900 border border-stone-800 px-5 py-4 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-stone-400">
                Instala la app
              </p>
              <p className="text-sm text-stone-300 leading-snug">
                Accede a tu tarjeta directamente desde tu pantalla de inicio.
              </p>
              <button
                onClick={installApp}
                className="text-[11px] uppercase tracking-[0.3em] text-white bg-stone-700 hover:bg-stone-600 transition-colors px-4 py-2 rounded-full"
              >
                Instalar
              </button>
            </div>
            <button
              onClick={dismissAndroid}
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
      {showIosHint && (
        <motion.div
          key="ios-hint"
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
