"use client";

import { doc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Card } from "@/models/card.model";
import { CoffeeBean } from "./CoffeeBean";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export function StampCardFront({
  cardId,
  onComplete,
}: {
  cardId: string;
  onComplete: () => void;
}) {
  const firestore = useFirestore();
  const ref = doc(firestore, "cards", cardId);
  const { data } = useFirestoreDocData(ref);

  const hasCompletedRef = useRef(false);

  const card = data as Card | undefined;
  const isComplete = card ? card.stamps >= card.maxStamps : false;
  const remaining = card ? card.maxStamps - card.stamps : 0;
  const progress = card ? (card.stamps / card.maxStamps) * 100 : 0;

  useEffect(() => {
    if (isComplete && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  }, [isComplete, onComplete]);

  if (!card) return null;

  return (
    <div
      className="absolute inset-0 backface-hidden rounded-[24px] overflow-hidden text-[#2B2B2B] shadow-[0_12px_40px_rgba(0,0,0,0.14)] flex flex-col"
      style={{ background: "linear-gradient(145deg, #FAF7F4 0%, #F0E9E0 100%)" }}
    >
      {/* Header con marca */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E8E0D8]">
        <p
          className="text-[13px] font-light tracking-[0.35em] uppercase text-[#2B2B2B]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          La Commune
        </p>
        <p className="text-[9px] tracking-widest uppercase text-[#A89E97]">
          {isComplete ? "Completada" : "Fidelidad"}
        </p>
      </div>

      {/* Título + granos */}
      <div className="flex-1 flex flex-col justify-center px-5 py-3 gap-3">
        <div>
          <h2
            className="text-[17px] font-light leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {isComplete ? "¡Bebida de cortesía!" : "Café de la casa"}
          </h2>
          <p className="text-[10px] tracking-wide text-[#8A817A] mt-0.5">
            {isComplete
              ? "Preséntala en barra"
              : "Cliente frecuente"}
          </p>
        </div>

        <div className="flex justify-between">
          {Array.from({ length: card.maxStamps }).map((_, i) => (
            <CoffeeBean key={i} active={i < card.stamps} />
          ))}
        </div>
      </div>

      {/* Barra de progreso + conteo */}
      <div className="px-5 pb-4 space-y-2">
        <div className="h-[2px] bg-[#E8E0D8] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: isComplete
                ? "linear-gradient(90deg, #8A6A3A, #C4954A)"
                : "#3A2F2A",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="flex justify-between">
          <p className="text-[9px] tracking-widest uppercase text-[#A89E97]">
            {card.stamps} de {card.maxStamps} visitas
          </p>
          <p className="text-[9px] text-[#A89E97]">
            {isComplete
              ? "✓ Lista"
              : `${remaining} restante${remaining !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
    </div>
  );
}
