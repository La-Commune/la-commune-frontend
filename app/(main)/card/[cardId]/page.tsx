"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { StampCardView } from "@/components/ui/stamp-card";
import { DownloadCardButton } from "@/components/ui/DownloadCardButton";

export default function CardEntry({
  params,
}: {
  params: { cardId: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // const customerId = localStorage.getItem("customerId");

    // if (!customerId) {
    //   router.replace(`/onboarding?cardId=${params.cardId}`);
    //   return;
    // }

    // ⏳ Simular petición
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800); // 1.8s se siente natural

    return () => clearTimeout(timer);
  }, [params.cardId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-stone-500 animate-pulse">
          Cargando tu tarjeta…
        </p>
      </div>
    );
  }

  return <Card />;
}

function Card() {
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
  