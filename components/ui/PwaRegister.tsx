"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function isDismissed(key: string): boolean {
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  const ts = Number(raw);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < DISMISS_DURATION_MS;
}

export function PwaRegister() {
  const [showIosHint, setShowIosHint] = useState(false);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const deferredPrompt = useRef<any>(null);

  const handleFlushStamps = useCallback((event: MessageEvent) => {
    if (event.data?.type === "FLUSH_OFFLINE_STAMPS") {
      // Dispatch un evento custom para que el admin page lo escuche y procese
      window.dispatchEvent(new CustomEvent("flush-offline-stamps"));
    }
  }, []);

  useEffect(() => {
    // Registrar service worker
    if ("serviceWorker" in navigator) {
      const buildId = process.env.NEXT_PUBLIC_BUILD_ID || "v1";
      navigator.serviceWorker
        .register(`/sw.js?v=${buildId}`)
        .then((registration) => {
          // Detectar cuando un nuevo SW se instala
          registration.onupdatefound = () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.onstatechange = () => {
              if (
                newWorker.state === "activated" &&
                navigator.serviceWorker.controller
              ) {
                setShowUpdateBanner(true);
              }
            };
          };
        })
        .catch((err) => console.warn("SW registration failed:", err));

      // Escuchar mensaje de SW_UPDATED desde el SW al activarse
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SW_UPDATED") {
          setShowUpdateBanner(true);
        }
      });

      // Escuchar peticiones del SW para flush de sellos offline
      navigator.serviceWorker.addEventListener("message", handleFlushStamps);
    }

    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

    // iOS — detectar primero para evitar que el bloque de Android lo capture
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

    if (isIos && !isStandalone && !isDismissed("pwa-hint-dismissed")) {
      const timer = setTimeout(() => setShowIosHint(true), 3000);
      return () => {
        clearTimeout(timer);
        navigator.serviceWorker?.removeEventListener(
          "message",
          handleFlushStamps
        );
      };
    }

    // Android / Chrome — capturar evento de instalación
    if (!isStandalone && !isDismissed("pwa-install-dismissed")) {
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e;
        setShowAndroidBanner(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        navigator.serviceWorker?.removeEventListener(
          "message",
          handleFlushStamps
        );
      };
    }

    return () => {
      navigator.serviceWorker?.removeEventListener(
        "message",
        handleFlushStamps
      );
    };
  }, [handleFlushStamps]);

  const dismissAndroid = () => {
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setShowAndroidBanner(false);
  };

  const installApp = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    setShowAndroidBanner(false);
  };

  const dismissIos = () => {
    localStorage.setItem("pwa-hint-dismissed", Date.now().toString());
    setShowIosHint(false);
  };

  const reloadForUpdate = () => {
    setShowUpdateBanner(false);
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showUpdateBanner && (
        <motion.div
          key="update-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="fixed top-4 left-4 right-4 z-[300] mx-auto max-w-sm rounded-2xl bg-neutral-900 border border-stone-800 px-5 py-4 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-stone-400">
                Nueva version
              </p>
              <p className="text-sm text-stone-300 leading-snug">
                Hay una nueva version disponible de La Commune.
              </p>
              <button
                onClick={reloadForUpdate}
                className="text-[11px] uppercase tracking-[0.3em] text-white bg-stone-700 hover:bg-stone-600 transition-colors px-4 py-2 rounded-full"
              >
                Actualizar
              </button>
            </div>
            <button
              onClick={() => setShowUpdateBanner(false)}
              className="text-stone-600 hover:text-stone-300 transition-colors pt-0.5 shrink-0"
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>
        </motion.div>
      )}
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
              <CloseIcon />
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5 inline"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>{" "}
                y luego{" "}
                <strong className="text-white font-normal">
                  &quot;Añadir a pantalla de inicio&quot;
                </strong>{" "}
                para acceder a tu tarjeta sin abrir Safari.
              </p>
            </div>
            <button
              onClick={dismissIos}
              className="text-stone-600 hover:text-stone-300 transition-colors pt-0.5 shrink-0"
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
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
  );
}
