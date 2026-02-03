"use client";

import { doc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Card } from "@/models/card.model";
import { CoffeeBean } from "./CoffeeBean";
import { useEffect, useRef } from "react";

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
  const isComplete = card
    ? card.stamps >= card.maxStamps
    : false;

  useEffect(() => {
    if (isComplete && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  }, [isComplete, onComplete]);

  if (!card) return null;

  return (
    <div className="absolute inset-0 backface-hidden rounded-[24px] p-5 bg-[#FAF7F4] text-[#2B2B2B] shadow-[0_10px_30px_rgba(0,0,0,0.08)] flex flex-col justify-between">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[10px] tracking-wide text-[#8A817A]">
          Cliente frecuente
        </p>
        <h2 className="text-[15px] font-medium">
          {isComplete ? "Recompensa lista 🎉" : "Café de la casa"}
        </h2>
      </div>

      {/* Granos */}
      <div className="flex justify-between px-1">
        {Array.from({ length: card.maxStamps }).map((_, i) => (
          <CoffeeBean key={i} active={i < card.stamps} />
        ))}
      </div>

      {/* Progreso */}
      <p className="text-[11px] text-center text-[#8A817A]">
        {isComplete
          ? "Presenta esta tarjeta en barra"
          : `${card.stamps} de ${card.maxStamps} visitas`}
      </p>
    </div>
  );
}

