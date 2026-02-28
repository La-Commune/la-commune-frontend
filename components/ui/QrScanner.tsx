"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

interface Props {
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QrScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let stopped = false;
    const reader = new BrowserQRCodeReader();

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, error, controls) => {
        controlsRef.current = controls;
        if (!stopped && result) {
          stopped = true;
          controls.stop();
          onScan(result.getText());
        }
      })
      .then(() => {
        if (!stopped) setStatus("ready");
      })
      .catch((err: unknown) => {
        if (!stopped) {
          setStatus("error");
          if (err instanceof Error && err.message.includes("Permission")) {
            setErrorMsg("Permiso de cámara denegado");
          } else {
            setErrorMsg("No se pudo iniciar la cámara");
          }
        }
      });

    return () => {
      stopped = true;
      controlsRef.current?.stop();
    };
  }, [onScan]);

  const handleClose = () => {
    controlsRef.current?.stop();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-2xl overflow-hidden border border-stone-800 bg-neutral-900"
    >
      {/* Visor de cámara */}
      <div className="relative w-full aspect-square bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          playsInline
        />

        {/* Overlay oscuro en los bordes (guía de escaneo) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Marco de escaneo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-56 h-56 relative">
              {/* Esquinas del marco */}
              {[
                "top-0 left-0 border-t-2 border-l-2",
                "top-0 right-0 border-t-2 border-r-2",
                "bottom-0 left-0 border-b-2 border-l-2",
                "bottom-0 right-0 border-b-2 border-r-2",
              ].map((cls, i) => (
                <div key={i} className={`absolute w-6 h-6 border-stone-300 ${cls}`} />
              ))}

              {/* Línea de escaneo animada */}
              {status === "ready" && (
                <motion.div
                  className="absolute left-0 right-0 h-px bg-stone-300/70"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Estado de carga */}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 animate-pulse">
              Iniciando cámara…
            </p>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
            <p className="text-[10px] uppercase tracking-widest text-red-400">{errorMsg}</p>
            <p className="text-[10px] text-stone-600">
              Verifica los permisos de cámara en tu navegador
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">
          {status === "ready" ? "Apunta al QR del cliente" : ""}
        </p>
        <button
          onClick={handleClose}
          className="text-[10px] uppercase tracking-[0.3em] text-stone-500 hover:text-white transition-colors duration-200"
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  );
}
