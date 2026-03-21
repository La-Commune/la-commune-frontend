"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StampIllustration, type IllustrationId } from "./stamp-illustrations";

/**
 * Animación para la sección "Cómo funciona" de la landing.
 * Muestra la ilustración configurada por el admin llenándose sello a sello en loop,
 * con el Endowed Progress Effect.
 */
export function HowItWorksAnimation({
  maxStamps = 5,
  illustrationId = "flat-white-cenital",
}: {
  maxStamps?: number;
  illustrationId?: IllustrationId;
}) {
  const BONUS = 1;
  const visualMax = maxStamps + BONUS;

  const [realStamps, setRealStamps] = useState(0);
  const [isNewStamp, setIsNewStamp] = useState(false);
  const [phase, setPhase] = useState<"filling" | "complete" | "resetting">("filling");
  const [stepLabel, setStepLabel] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visualStamps = realStamps + BONUS;
  const isComplete = realStamps >= maxStamps;
  const CUP_RADIUS = 58;
  const fillRadius = (visualStamps / visualMax) * CUP_RADIUS;

  // Etiquetas de progreso sincronizadas
  const getStepLabel = useCallback(
    (stamps: number): string | null => {
      if (stamps >= maxStamps) return "¡Bebida gratis!";
      if (stamps === maxStamps - 1) return "¡Falta uno!";
      if (stamps === Math.floor(maxStamps / 2)) return "¡Mitad del camino!";
      if (stamps === 1) return "Primer sello";
      if (stamps === 0) return null;
      return `${stamps} de ${maxStamps}`;
    },
    [maxStamps]
  );

  // Ciclo principal de llenado
  useEffect(() => {
    if (phase === "resetting") return;

    if (isComplete) {
      setStepLabel("¡Bebida gratis!");
      // Esperar 3s mostrando completada, luego resetear suavemente
      const timer = setTimeout(() => {
        setPhase("resetting");
        // Dar tiempo al "vaciado" visual, luego reiniciar
        setTimeout(() => {
          setRealStamps(0);
          setIsNewStamp(false);
          setStepLabel(null);
          setPhase("filling");
        }, 800);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Agregar un sello cada intervalo
    const delay = realStamps === 0 ? 1800 : 1200;
    intervalRef.current = setTimeout(() => {
      setIsNewStamp(true);
      const next = realStamps + 1;
      setRealStamps(next);
      setStepLabel(getStepLabel(next));

      // Quitar efecto de pulso
      setTimeout(() => setIsNewStamp(false), 600);
    }, delay);

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [realStamps, isComplete, phase, getStepLabel, maxStamps]);

  // Opacidad de la ilustración durante reset
  const illustrationOpacity = phase === "resetting" ? 0.3 : 1;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Contenedor de altura fija — NUNCA colapsa */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 156, height: 156 }}
      >
        <motion.div
          animate={{
            opacity: illustrationOpacity,
            scale: phase === "resetting" ? 0.92 : 1,
          }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "center center" }}
        >
          <div style={{ transform: "scale(0.8)", transformOrigin: "center center" }}>
            <StampIllustration
              id={illustrationId}
              stamps={phase === "resetting" ? BONUS : visualStamps}
              maxStamps={visualMax}
              displayedStamps={phase === "resetting" ? BONUS : visualStamps}
              animatedStamps={phase === "resetting" ? 0 : visualStamps}
              isComplete={isComplete && phase !== "resetting"}
              isNewStamp={isNewStamp}
              isDark={true}
              fillRadius={
                phase === "resetting"
                  ? (BONUS / visualMax) * CUP_RADIUS
                  : fillRadius
              }
              realStamps={phase === "resetting" ? 0 : realStamps}
              realMaxStamps={maxStamps}
            />
          </div>
        </motion.div>
      </div>

      {/* Badge de paso / label — altura fija para no mover contenido */}
      <div className="h-8 flex items-center justify-center mt-1">
        <AnimatePresence mode="wait">
          {isComplete && phase !== "resetting" ? (
            <motion.div
              key="complete-badge"
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.9 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="px-4 py-1.5 rounded-full bg-[#c8956c]/15 border border-[#c8956c]/25"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#c8956c] whitespace-nowrap font-medium">
                Bebida gratis
              </span>
            </motion.div>
          ) : stepLabel && phase !== "resetting" ? (
            <motion.p
              key={`label-${stepLabel}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="text-[10px] uppercase tracking-[0.2em] text-[#6b6458] whitespace-nowrap"
            >
              {stepLabel}
            </motion.p>
          ) : (
            <motion.p
              key="empty-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-[10px] uppercase tracking-[0.2em] text-[#3a3630] whitespace-nowrap"
            >
              +1 de regalo
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
