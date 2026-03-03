"use client";

import { useEffect, useRef, useState } from "react";
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

  const customerRef = doc(firestore, "customers", customerId ?? "_placeholder");

  const { data: customer } = useFirestoreDocData(customerRef, {
    suspense: false,
  });

  // Escuchar estado de la tarjeta en tiempo real
  const cardDocRef = doc(firestore, "cards", cardIdParam);
  const { data: cardDoc } = useFirestoreDocData(cardDocRef, { suspense: false });

  // Auto-redirect a la página de canje cuando la tarjeta se completa
  useEffect(() => {
    if (!cardId) return; // Esperar a que la sesión esté verificada
    if ((cardDoc as any)?.status !== "completed") return;
    router.replace(`/card/${cardIdParam}/redeem`);
  }, [(cardDoc as any)?.status, cardId, cardIdParam, router]);

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

  const isCompleted = (cardDoc as any)?.status === "completed";

  return <Card cardId={cardId} customer={customer as Customer} isCompleted={isCompleted} />;
}


function Card({
  cardId,
  customer,
  isCompleted,
}: {
  cardId: string;
  customer?: Customer;
  isCompleted?: boolean;
}) {
  const router = useRouter();
  const name = customer?.name?.trim();
  const lastVisit = formatDate(customer?.lastVisitAt);
  const memberSince = formatDate(customer?.createdAt);
  const totalVisits = customer?.totalVisits ?? 0;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);

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

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (dy > 72 && window.scrollY === 0) {
        if ("vibrate" in navigator) navigator.vibrate(30);
        setRefreshing(true);
        router.refresh();
        setTimeout(() => setRefreshing(false), 1200);
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [router]);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: "La Commune · Tarjeta de fidelidad",
        text: name
          ? `${name} ya tiene su tarjeta de fidelidad en La Commune ☕ Cada visita suma — a las 5 te invitan una bebida. ¡Pásate!`
          : "Ya tengo mi tarjeta de fidelidad en La Commune ☕ Cada visita suma — a las 5 te invitan una bebida. ¡Pásate!",
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
        <Link
          href="/menu"
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-white transition-colors duration-300 group"
        >
          Menú
          <span className="w-4 h-px bg-stone-500 group-hover:w-7 group-hover:bg-white transition-all duration-500" />
        </Link>
      </nav>

      {/* Indicador pull-to-refresh */}
      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex justify-center py-2"
          >
            <span className="text-[9px] uppercase tracking-[0.4em] text-stone-600">
              Actualizando…
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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

        {/* CTA de canje cuando tarjeta completa */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              key="redeem-cta"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link
                href={`/card/${cardId}/redeem`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-900/30 border border-amber-700/50 text-amber-300 text-[11px] uppercase tracking-[0.3em] hover:bg-amber-900/50 hover:border-amber-600 transition-colors duration-300"
              >
                Canjear bebida gratis →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Acciones secundarias */}
        {/* TODO: Mejorar implementacion de botones */}
        {/* <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex items-center gap-5 flex-wrap justify-center"
        >
          <DownloadCardButton />
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
        </motion.div> */}

        {/* CTA de compartir */}
        {/* TODO: Reactivar cuando se tenga el contenido en instagram y algo consolidado */}
        {/* {typeof navigator !== "undefined" && !!navigator.share && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="w-[320px] border border-stone-800 rounded-2xl px-6 py-5 text-center space-y-3"
          >
            <p className="text-[10px] uppercase tracking-[0.35em] text-stone-700">
              El café sabe mejor en compañía
            </p>
            <button
              onClick={handleShare}
              className="w-full py-2.5 rounded-xl border border-stone-700 text-[11px] uppercase tracking-[0.3em] text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-colors duration-300"
            >
              Invitar a La Commune
            </button>
          </motion.div>
        )} */}

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
