"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { StampCardFront } from "./StampCardFront";
import { StampCardBack } from "./StampCardBack";

export function StampCardView({ cardId }: { cardId: string }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="space-y-4 text-center">
      {/* Tarjeta */}
      <div
        id="stamp-card"
        className="
        w-[320px] h-[210px] mx-auto perspective
        active:scale-[0.98] transition-transform
        "
        onClick={() => setFlipped(!flipped)}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <StampCardFront cardId={cardId} />
          <StampCardBack cardId={cardId} />
        </motion.div>
      </div>
    </div>
  );
}
