/**
 * Original work licensed under the MIT License by Gavin D. Johnsen.
 * Modifications Copyright (c) 2026 La Commune.
 *
 * The original MIT license applies to the base code.
 */

import { Badge } from "@/components/ui/badge";
import { DownloadCardButton } from "@/components/ui/DownloadCardButton";
import { StampCardView } from "@/components/ui/stamp-card";
import React from "react";

export default function Home() {
  return (
    <div className="flex grow flex-col items-center justify-center gap-8 px-4">
      
      {/* Texto */}
      <section className="text-center space-y-3 max-w-sm">
        <h1 className="text-xl font-medium text-stone-800">
          Tu café suma
        </h1>

        <p className="text-sm text-stone-500 leading-relaxed">
          Cada visita deja huella. Junta sellos y disfruta tu recompensa.
        </p>

        <Badge
          variant="secondary"
          className="text-[11px] px-3 py-1 rounded-full"
        >
          Toca la tarjeta
        </Badge>
      </section>

      {/* Tarjeta */}
      <StampCardView cardId="CHZmWzvA2eZDYagSCpYl" />

      {/* CTA */}
      <DownloadCardButton />
    </div>
  );
}