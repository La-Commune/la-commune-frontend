"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import ReactCanvasConfetti from "react-canvas-confetti";
import { StampCardFront } from "./StampCardFront";
import { StampCardBack } from "./StampCardBack";

type ConfettiInstance = (opts: any) => void;

export function StampCardView({ cardId }: { cardId: string }) {
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  const confettiRef = useRef<ConfettiInstance | null>(null);

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

  const handleComplete = () => {
    if (completed) return;
    setCompleted(true);
    fireConfetti();
  };

  const handleFlip = () => {
    setFlipped((f) => !f);
    setHintDismissed(true);
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
          <StampCardFront cardId={cardId} onComplete={handleComplete} />
          <StampCardBack cardId={cardId} />
        </motion.div>
      </motion.div>

      {/* Hint de volteo — desaparece tras el primer toque */}
      <AnimatePresence>
        {!hintDismissed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 1 }}
            className="text-[10px] uppercase tracking-[0.3em] text-stone-600"
          >
            Toca para ver tu QR
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
