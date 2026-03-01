"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { StampCardView } from "@/components/ui/stamp-card";
import { DownloadCardButton } from "@/components/ui/DownloadCardButton";
import { doc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Customer } from "@/models/customer.model";
import { formatDate } from "@/lib/utils";
import { getCardByCustomer } from "@/services/card.service";


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

  // Escuchar estado de la tarjeta en tiempo real
  const cardDocRef = doc(firestore, "cards", cardIdParam);
  const { data: cardDoc } = useFirestoreDocData(cardDocRef, { suspense: false });

  // Si la tarjeta fue canjeada, buscar la nueva tarjeta activa y redirigir
  useEffect(() => {
    if (!cardDoc || (cardDoc as any).status !== "redeemed") return;
    if (!customerId) return;

    const customerRef = doc(firestore, "customers", customerId);
    getCardByCustomer(firestore, customerRef).then((newCard) => {
      if (newCard) {
        localStorage.setItem("cardId", newCard.id);
        router.replace(`/card/${newCard.id}`);
      }
    });
  }, [(cardDoc as any)?.status, customerId, firestore, router]);

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
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-10 px-4">
        {/* Skeleton saludo */}
        <div className="text-center space-y-3">
          <div className="h-2.5 w-28 bg-stone-900 rounded-full animate-pulse mx-auto" />
          <div className="h-9 w-48 bg-stone-900 rounded-xl animate-pulse mx-auto" />
          <div className="h-2.5 w-36 bg-stone-900 rounded-full animate-pulse mx-auto" />
        </div>
        {/* Skeleton tarjeta */}
        <div className="w-[320px] h-[210px] bg-stone-900 rounded-[24px] animate-pulse" />
        {/* Skeleton botón */}
        <div className="h-10 w-44 bg-stone-900 rounded-full animate-pulse" />
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
  const memberSince = formatDate(customer?.createdAt);
  const totalVisits = customer?.totalVisits ?? 0;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "Mi tarjeta · La Commune",
        url: window.location.href,
      });
    } catch {
      // User cancelled or API not supported
    }
  };

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
          {memberSince && (
            <p className="text-[11px] text-stone-600 tracking-wide">
              Miembro desde {memberSince}
            </p>
          )}
          {totalVisits > 0 && (
            <p className="text-[11px] text-stone-600 tracking-wide">
              {totalVisits} visitas totales
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

        {/* Botones */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex items-center gap-5 flex-wrap justify-center"
        >
          <DownloadCardButton />
          {typeof navigator !== "undefined" && !!navigator.share && (
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-stone-600 hover:text-stone-300 transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Compartir
            </button>
          )}
          <Link
            href={`/card/${cardId}/history`}
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-stone-600 hover:text-stone-300 transition-colors duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Historial
          </Link>
        </motion.div>

      </div>

      {/* Banner sin conexión */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-stone-800 px-6 py-3 text-center text-[10px] uppercase tracking-widest text-stone-500"
          >
            Sin conexión — tu QR sigue disponible
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
