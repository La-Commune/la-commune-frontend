"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFirestore } from "reactfire";
import { doc } from "firebase/firestore";
import { getCardByCustomer } from "@/services/card.service";

export default function CardPage() {
  const router = useRouter();
  const firestore = useFirestore();

  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCard = async () => {
      const customerId = localStorage.getItem("customerId");
      const cardId = localStorage.getItem("cardId");      

      if (!customerId) {
        router.replace("/onboarding");
        return;
      }

      if (!cardId) {
        router.replace("/onboarding");
        return;
      }

      router.replace("/card/" + cardId);

    };

    loadCard();
  }, [firestore, router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-stone-500">Cargando tu tarjeta…</p>
    </div>
  );
}
