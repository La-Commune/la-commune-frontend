"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { StampCardView } from "@/components/ui/stamp-card";
import { DownloadCardButton } from "@/components/ui/DownloadCardButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { doc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Customer } from "@/models/customer.model";
import { formatDate } from "@/lib/utils";
import { getCardByCustomer } from "@/services/card.service";
import { PromoBannerInline } from "@/components/ui/promos/PromoBanner";
import {
  getCustomerSession,
  setCustomerSession,
  clearCustomerSession,
  updateCustomerPhone,
} from "@/app/actions/customerSession";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


export default function CardEntry() {
  const { cardId: cardIdParam } = useParams<{ cardId: string }>();
  const router = useRouter();
  const firestore = useFirestore();

  const [loading, setLoading] = useState(true);
  const [cardId, setCardId] = useState<string | null>(null);
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | null>(null);

  const customerRef = doc(
    firestore,
    "customers",
    resolvedCustomerId ?? "_placeholder",
  );

  const { data: customer } = useFirestoreDocData(customerRef, {
    suspense: false,
  });

  // Escuchar estado de la tarjeta en tiempo real
  const cardDocRef = doc(firestore, "cards", cardIdParam);
  const { data: cardDoc } = useFirestoreDocData(cardDocRef, { suspense: false });

  // Auto-redirect a la página de canje cuando la tarjeta se completa
  useEffect(() => {
    if (!cardId) return;
    if ((cardDoc as any)?.status !== "completed") return;
    router.replace(`/card/${cardIdParam}/redeem`);
  }, [(cardDoc as any)?.status, cardId, cardIdParam, router]);

  // Si la tarjeta fue canjeada, buscar la nueva tarjeta activa y redirigir
  useEffect(() => {
    if (!cardDoc || (cardDoc as any).status !== "redeemed") return;
    if (!resolvedCustomerId) return;

    const ref = doc(firestore, "customers", resolvedCustomerId);
    getCardByCustomer(firestore, ref).then((newCard) => {
      if (newCard) {
        localStorage.setItem("cardId", newCard.id);
        setCustomerSession(resolvedCustomerId, newCard.id);
        router.replace(`/card/${newCard.id}`);
      }
    });
  }, [(cardDoc as any)?.status, resolvedCustomerId, firestore, router]);

  // Session resolution: localStorage first, then cookie fallback
  useEffect(() => {
    async function resolveSession() {
      const storedCardId = localStorage.getItem("cardId");
      const storedCustomerId = localStorage.getItem("customerId");

      if (storedCardId && storedCardId === cardIdParam && storedCustomerId) {
        setCardId(storedCardId);
        setResolvedCustomerId(storedCustomerId);
        setLoading(false);
        return;
      }

      // Cookie fallback — recovers session after cache clear
      try {
        const cookieSession = await getCustomerSession();
        if (cookieSession && cookieSession.cardId === cardIdParam) {
          localStorage.setItem("cardId", cookieSession.cardId);
          localStorage.setItem("customerId", cookieSession.customerId);
          setCardId(cookieSession.cardId);
          setResolvedCustomerId(cookieSession.customerId);
          setLoading(false);
          return;
        }
      } catch {
        // Cookie check failed, fall through
      }

      // No valid session — redirect to recovery
      router.replace(`/recover`);
    }

    resolveSession();
  }, [cardIdParam, router]);

if (loading || !cardId) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-10 px-4">
        {/* Skeleton saludo */}
        <div className="text-center space-y-3">
          <div className="h-2.5 w-28 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse mx-auto" />
          <div className="h-9 w-48 bg-stone-200 dark:bg-stone-900 rounded-xl animate-pulse mx-auto" />
          <div className="h-2.5 w-36 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse mx-auto" />
        </div>
        {/* Skeleton tarjeta */}
        <div className="w-[320px] h-[210px] bg-stone-200 dark:bg-stone-900 rounded-[24px] animate-pulse" />
        {/* Skeleton botón */}
        <div className="h-10 w-44 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse" />
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
          ? `${name} ya tiene su tarjeta de fidelidad en La Commune. Cada visita suma — a las 5 te invitan una bebida.`
          : "Ya tengo mi tarjeta de fidelidad en La Commune. Cada visita suma — a las 5 te invitan una bebida.",
        url: window.location.href,
      });
    } catch {
      // User cancelled or API not supported
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("cardId");
    localStorage.removeItem("customerId");
    await clearCustomerSession();
    router.replace("/");
  };

  // --- Update phone state ---
  const [showPhoneUpdate, setShowPhoneUpdate] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phonePin, setPhonePin] = useState("");
  const [phoneUpdateLoading, setPhoneUpdateLoading] = useState(false);
  const [phoneUpdateMsg, setPhoneUpdateMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const handlePhoneUpdate = async () => {
    if (newPhone.length !== 10 || phonePin.length !== 4) return;
    const cid =
      typeof window !== "undefined"
        ? localStorage.getItem("customerId")
        : null;
    if (!cid) return;

    setPhoneUpdateLoading(true);
    setPhoneUpdateMsg(null);

    try {
      const res = await updateCustomerPhone(cid, phonePin, newPhone);
      if (res.ok) {
        setPhoneUpdateMsg({ type: "ok", text: "Telefono actualizado." });
        setNewPhone("");
        setPhonePin("");
        setTimeout(() => {
          setShowPhoneUpdate(false);
          setPhoneUpdateMsg(null);
        }, 2000);
      } else {
        setPhoneUpdateMsg({ type: "err", text: res.error });
      }
    } catch {
      setPhoneUpdateMsg({ type: "err", text: "Error inesperado." });
    } finally {
      setPhoneUpdateLoading(false);
    }
  };

  return (
    <div id="main-content" className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300 group"
        >
          <span className="w-4 h-px bg-stone-400 dark:bg-stone-500 group-hover:w-7 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500" />
          Inicio
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-400 dark:text-stone-500">
          La Commune
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/menu"
            className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300 group"
          >
            Menu
            <span className="w-4 h-px bg-stone-400 dark:bg-stone-500 group-hover:w-7 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500" />
          </Link>
        </div>
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
            <span className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">
              Actualizando...
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
          <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">
            Bienvenido de vuelta
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-light tracking-wide">
            {name ? `Hola, ${name}` : "Hola"}
          </h1>
          {lastVisit && (
            <p className="text-[11px] text-stone-400 dark:text-stone-600 tracking-wide">
              Ultima visita: {lastVisit}
            </p>
          )}
          {memberSince && (
            <p className="text-[11px] text-stone-400 dark:text-stone-600 tracking-wide">
              Miembro desde {memberSince}
            </p>
          )}
          {totalVisits > 0 && (
            <p className="text-[11px] text-stone-400 dark:text-stone-600 tracking-wide">
              {totalVisits} visitas totales
            </p>
          )}
        </motion.div>

        {/* Promos activas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="w-full max-w-xs"
        >
          <PromoBannerInline />
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-100/50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 text-[11px] uppercase tracking-[0.3em] hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-400 dark:hover:border-amber-600 transition-colors duration-300"
              >
                Canjear bebida gratis →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-full max-w-xs space-y-3 pt-4"
        >
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowPhoneUpdate((v) => !v)}
              className="text-[10px] uppercase tracking-[0.25em] text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
            >
              Cambiar telefono
            </button>
            <span className="w-px h-3 bg-stone-300 dark:bg-stone-700" />
            <button
              onClick={handleLogout}
              className="text-[10px] uppercase tracking-[0.25em] text-stone-400 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Cerrar sesion
            </button>
          </div>

          <AnimatePresence>
            {showPhoneUpdate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-3 pt-2"
              >
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Nuevo telefono (10 digitos)"
                  value={newPhone}
                  onChange={(e) =>
                    setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className="text-sm text-center tracking-widest bg-white dark:bg-neutral-900 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600"
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Tu PIN de 4 digitos"
                  value={phonePin}
                  maxLength={4}
                  onChange={(e) =>
                    setPhonePin(
                      e.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  className="text-sm text-center tracking-[0.5em] bg-white dark:bg-neutral-900 border-stone-300 dark:border-stone-700 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600"
                />
                {phoneUpdateMsg && (
                  <p
                    className={`text-[11px] text-center ${
                      phoneUpdateMsg.type === "ok"
                        ? "text-emerald-500"
                        : "text-red-500 dark:text-red-400"
                    }`}
                  >
                    {phoneUpdateMsg.text}
                  </p>
                )}
                <Button
                  onClick={handlePhoneUpdate}
                  disabled={
                    newPhone.length !== 10 ||
                    phonePin.length !== 4 ||
                    phoneUpdateLoading
                  }
                  className="w-full rounded-full bg-stone-800 text-white dark:bg-white dark:text-neutral-900 py-2 text-[11px] tracking-wide disabled:opacity-30"
                >
                  {phoneUpdateLoading ? "Actualizando..." : "Actualizar telefono"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-stone-200 dark:border-stone-800 px-6 py-3 text-center text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500"
          >
            Sin conexión — tu QR sigue disponible
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
