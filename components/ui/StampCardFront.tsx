"use client";

import { doc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Card } from "@/models/card.model";
import { CoffeeBean } from "./CoffeeBean";

export function StampCardFront({ cardId }: { cardId: string }) {
  const firestore = useFirestore();
  const ref = doc(firestore, "cards", cardId);
  const { data } = useFirestoreDocData(ref);

  if (!data) return null;
  const card = data as Card;

  return (
    <div
      className="
        absolute inset-0 backface-hidden
        rounded-[24px] p-5
        bg-[#FAF7F4] text-[#2B2B2B]
        shadow-[0_10px_30px_rgba(0,0,0,0.08)]
        flex flex-col justify-between
      "
    >
      {/* Header */}
      <div className="space-y-1">
        <p className="text-[10px] tracking-wide text-[#8A817A]">
          Cliente frecuente
        </p>
        <h2 className="text-[15px] font-medium">
          Café de la casa
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
        {card.stamps} de {card.maxStamps} visitas
      </p>
    </div>

  );
}
