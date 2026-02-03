"use client";

import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import ReactCanvasConfetti from "react-canvas-confetti";
import { StampCardFront } from "./StampCardFront";
import { StampCardBack } from "./StampCardBack";

type ConfettiInstance = (opts: any) => void;

export function StampCardView({ cardId }: { cardId: string }) {
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);

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

  return (
    <div className="relative space-y-4 text-center">
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
        className="w-[320px] h-[210px] mx-auto perspective"
        whileTap={{ scale: 0.98 }}
        animate={completed ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 0.4 }}
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <StampCardFront 
            cardId={cardId} 
            onComplete={handleComplete}/>
          <StampCardBack cardId={cardId} />
        </motion.div>
      </motion.div>
    </div>
  );
}
