"use client";

import { doc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Card as CardUI } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function StampCardView({ cardId }: { cardId: string }) {
  const firestore = useFirestore();
  const ref = doc(firestore, "cards", cardId);
  const { status, data } = useFirestoreDocData(ref);

  if (status === "loading") return <p>Cargando…</p>;
  if (!data) return <p>No encontrada</p>;

  const card = data as any;

  return (
    <CardUI className="max-w-md mx-auto bg-gradient-to-br from-amber-50 to-stone-100 shadow-xl rounded-2xl p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-stone-800">
          ☕ Tarjeta de Café
        </h2>
        <Badge className="bg-amber-700 text-white">
          {card.rewardName}
        </Badge>
      </div>

      {/* Sellos */}
      <div className="grid grid-cols-5 gap-3 my-6">
        {Array.from({ length: card.maxStamps }).map((_, i) => (
          <div
            key={i}
            className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold
              ${
                i < card.stamps
                  ? "bg-amber-700 text-white"
                  : "border-2 border-dashed border-amber-700 text-amber-700"
              }`}
          >
            ☕
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="text-sm text-stone-600 mb-4">
        Sellos: {card.stamps} / {card.maxStamps}
      </p>

      <Button className="w-full bg-amber-700 hover:bg-amber-800">
        + Agregar sello
      </Button>
    </CardUI>
  );
}
