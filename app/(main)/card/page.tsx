"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getCustomerSession } from "@/app/actions/customerSession";

export default function CardPage() {
  const router = useRouter();

  useEffect(() => {
    async function resolve() {
      const customerId = localStorage.getItem("customerId");
      const cardId = localStorage.getItem("cardId");

      if (customerId && cardId) {
        router.replace("/card/" + cardId);
        return;
      }

      // Cookie fallback
      try {
        const session = await getCustomerSession();
        if (session) {
          localStorage.setItem("customerId", session.customerId);
          localStorage.setItem("cardId", session.cardId);
          router.replace("/card/" + session.cardId);
          return;
        }
      } catch {
        // fall through
      }

      router.replace("/recover");
    }

    resolve();
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-stone-500">Cargando tu tarjeta...</p>
    </div>
  );
}
