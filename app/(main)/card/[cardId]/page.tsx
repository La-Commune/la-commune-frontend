"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { StampCardView } from "@/components/ui/stamp-card";
import { DownloadCardButton } from "@/components/ui/DownloadCardButton";
import { doc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Customer } from "@/models/customer.model";
import { formatDate } from "@/lib/utils";


export default function CardEntry() {
  const { cardId: cardIdParam } = useParams<{ cardId: string }>();
  const router = useRouter();
  const firestore = useFirestore();

  const [loading, setLoading] = useState(true);
  const [cardId, setCardId] = useState<string | null>(null);

  const customerId =
    typeof window !== "undefined"
      ? localStorage.getItem("customerId")
      : null;

  const customerRef = customerId
    ? doc(firestore, "customers", customerId)
    : null;

  const { data: customer } = useFirestoreDocData(customerRef!, {
    suspense: false,
  });

  useEffect(() => {
    const storedCardId = localStorage.getItem("cardId");

    if (!storedCardId || storedCardId !== cardIdParam) {
      router.replace(`/onboarding?cardId=${cardIdParam}`);
      return;
    }

    setCardId(storedCardId);
    setLoading(false);
  }, [cardIdParam, router]);

if (loading || !cardId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <p className="text-sm text-stone-600 animate-pulse tracking-widest uppercase text-[11px]">
          Cargando…
        </p>
      </div>
    );
  }

  return <Card cardId={cardId} customer={customer as Customer} />;
}


function Card({
  cardId,
  customer,
}: {
  cardId: string;
  customer?: Customer;
}) {
  const router = useRouter();
  const name = customer?.name?.trim();
  const lastVisit = formatDate(customer?.lastVisitAt);

  const handleLogout = () => {
    localStorage.removeItem("cardId");
    localStorage.removeItem("customerId");
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-white transition-colors duration-300 group"
        >
          <span className="w-4 h-px bg-stone-500 group-hover:w-7 group-hover:bg-white transition-all duration-500" />
          Inicio
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-500">
          La Commune
        </span>
        <button
          onClick={handleLogout}
          className="text-[10px] uppercase tracking-[0.3em] text-stone-700 hover:text-stone-400 transition-colors duration-300 text-stone-400 hover:text-white"
        >
          Salir
        </button>
      </nav>

      {/* Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-4 pb-16">

        {/* Saludo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-2"
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">
            Bienvenido de vuelta
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-light tracking-wide">
            {name ? `Hola, ${name}` : "Hola"}
          </h1>
          {lastVisit && (
            <p className="text-[11px] text-stone-600 tracking-wide">
              Última visita: {lastVisit}
            </p>
          )}
        </motion.div>

        {/* Tarjeta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <StampCardView cardId={cardId} />
        </motion.div>

        {/* Botón de descarga */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <DownloadCardButton />
        </motion.div>

      </div>
    </div>
  );
}
