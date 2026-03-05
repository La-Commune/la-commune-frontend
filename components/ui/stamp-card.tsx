"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactCanvasConfetti from "react-canvas-confetti";
import { StampCardFront } from "./StampCardFront";
import { StampCardBack } from "./StampCardBack";

type ConfettiInstance = (opts: any) => void;

export function StampCardView({ cardId }: { cardId: string }) {
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stampNotification, setStampNotification] = useState(false);

  const confettiRef = useRef<ConfettiInstance | null>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, []);

  const fireConfetti = useCallback(() => {
    confettiRef.current?.({
      particleCount: 80,
      spread: 60,
      startVelocity: 25,
      origin: { y: 0.65 },
      colors: ["#2B2B2B", "#8A817A", "#C7B7A3"],
      scalar: 0.9,
    });
  }, []);

  const handleComplete = useCallback(() => {
    if (completed) return;
    setCompleted(true);
    if ("vibrate" in navigator) navigator.vibrate([50, 30, 100]);
    fireConfetti();
  }, [completed, fireConfetti]);

  // Cuando se agrega un sello: mostrar notificación y voltear al frente
  const handleStampAdded = useCallback(() => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);

    if ("vibrate" in navigator) navigator.vibrate(80);
    setStampNotification(true);

    // Voltear al frente después de 800ms (si está mostrando el QR)
    flipTimerRef.current = setTimeout(() => setFlipped(false), 800);

    // Ocultar notificación después de 2.5s
    notifTimerRef.current = setTimeout(() => setStampNotification(false), 2500);
  }, []);

  const handleFlip = () => {
    setFlipped((f) => !f);
  };

  return (
    <div className="relative flex flex-col items-center gap-3">
      <ReactCanvasConfetti
        onInit={({ confetti }) => {
          confettiRef.current = confetti;
        }}
        style={{
          position: "fixed",
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          zIndex: 50,
        }}
      />

      <motion.div
        className="w-[320px] h-[210px] mx-auto perspective cursor-pointer"
        whileTap={{ scale: 0.97 }}
        animate={completed ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 0.4 }}
        onClick={handleFlip}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <StampCardFront
            cardId={cardId}
            onComplete={handleComplete}
            onStampAdded={handleStampAdded}
          />
          <StampCardBack cardId={cardId} />
        </motion.div>
      </motion.div>

      {/* Notificación de sello / hint de volteo */}
      <AnimatePresence mode="wait">
        {stampNotification ? (
          <motion.p
            key="stamp-notif"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-[10px] uppercase tracking-[0.3em] text-stone-600 dark:text-stone-300"
          >
            Sello añadido ✓
          </motion.p>
        ) : !flipped ? (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600"
          >
            Toca para ver tu QR
          </motion.p>
        ) : (
          <motion.p
            key="hint-back"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600"
          >
            Toca para volver
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
