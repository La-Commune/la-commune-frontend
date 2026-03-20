"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { StampCardView } from "@/components/ui/stamp-card";
import { DownloadCardButton } from "@/components/ui/DownloadCardButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Customer } from "@/models/customer.model";
import type { Card } from "@/models/card.model";
import { Reward } from "@/models/reward.model";
import { formatDate } from "@/lib/utils";
import { getCardByCustomer } from "@/services/card.service";
import { getDefaultReward } from "@/services/reward.service";
import { PromoBannerInline, useActivePromos } from "@/components/ui/promos/PromoBanner";
import {
  getCustomerSession,
  setCustomerSession,
  clearCustomerSession,
  updateCustomerPhone,
} from "@/app/actions/customerSession";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";


export default function CardEntry() {
  const { cardId: cardIdParam } = useParams<{ cardId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [cardId, setCardId] = useState<string | null>(null);
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cardDoc, setCardDoc] = useState<Card | null>(null);

  // Setup realtime subscription for customer data
  useEffect(() => {
    if (!resolvedCustomerId) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`customer-${resolvedCustomerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clientes",
          filter: `id=eq.${resolvedCustomerId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setCustomer({
            name: row.nombre as string,
            phone: row.telefono as string,
            email: row.email as string | undefined,
            active: row.activo as boolean,
            totalVisits: row.total_visitas as number,
            totalStamps: row.total_sellos as number,
            createdAt: new Date(row.creado_en as string),
            lastVisitAt: row.ultima_visita ? new Date(row.ultima_visita as string) : undefined,
            consentWhatsApp: row.consentimiento_whatsapp as boolean | undefined,
            consentEmail: row.consentimiento_email as boolean | undefined,
            pinHmac: row.pin_hmac as string | undefined,
            notes: row.notas as string | undefined,
            referrerCustomerId: row.id_referidor as string | undefined,
            referralBonusGiven: row.bono_referido_entregado as boolean | undefined,
            schemaVersion: 1,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedCustomerId]);

  // Setup realtime subscription for card data
  useEffect(() => {
    if (!cardIdParam) return;

    const supabase = getSupabase();
    const channel = supabase
      .channel(`card-${cardIdParam}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tarjetas",
          filter: `id=eq.${cardIdParam}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setCardDoc({
            id: row.id as string,
            stamps: row.sellos as number,
            maxStamps: row.sellos_maximos as number,
            status: row.estado as Card["status"],
            createdAt: new Date(row.creado_en as string),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cardIdParam]);

  // Auto-redirect a la página de canje cuando la tarjeta se completa
  useEffect(() => {
    if (!cardId) return;
    if (cardDoc?.status !== "completada") return;
    router.replace(`/card/${cardIdParam}/redeem`);
  }, [cardDoc?.status, cardId, cardIdParam, router]);

  // Si la tarjeta fue canjeada, buscar la nueva tarjeta activa y redirigir
  useEffect(() => {
    if (!cardDoc || cardDoc.status !== "canjeada") return;
    if (!resolvedCustomerId) return;

    getCardByCustomer(resolvedCustomerId).then((newCard) => {
      if (newCard) {
        localStorage.setItem("cardId", newCard.id);
        setCustomerSession(resolvedCustomerId, newCard.id);
        router.replace(`/card/${newCard.id}`);
      }
    });
  }, [cardDoc?.status, resolvedCustomerId, router]);

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
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-stone-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-10 px-4"
      >
        {/* Skeleton saludo */}
        <div className="text-center space-y-3">
          <div className="h-2.5 w-28 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse mx-auto" />
          <div className="h-9 w-48 bg-stone-200 dark:bg-stone-900 rounded-xl animate-pulse mx-auto" />
          <div className="h-2.5 w-36 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse mx-auto" />
        </div>
        {/* Skeleton tarjeta */}
        <div className="w-[320px] h-[210px] bg-stone-200 dark:bg-stone-900 rounded-[24px] animate-pulse" />
        {/* Skeleton boton */}
        <div className="h-10 w-44 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse" />
      </motion.div>
    );
  }

  const isCompleted = cardDoc?.status === "completada" || cardDoc?.status === "completed";

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

  // Reward info
  const [rewardDoc, setRewardDoc] = useState<Reward | null>(null);

  useEffect(() => {
    getDefaultReward().then((reward) => {
      if (reward) {
        setRewardDoc(reward);
      }
    });
  }, []);

  const rewardName: string = rewardDoc?.name ?? "Bebida gratis";
  const requiredStamps: number = rewardDoc?.requiredStamps ?? 5;

  // Promos
  const { promos, loaded: promosLoaded } = useActivePromos();
  const hasPromos = promos.length > 0;

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showPullHint, setShowPullHint] = useState(false);
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

  // Pull-to-refresh hint (show once)
  useEffect(() => {
    const hintKey = "pull-refresh-hint-shown";
    if (!localStorage.getItem(hintKey)) {
      const t = setTimeout(() => {
        setShowPullHint(true);
        localStorage.setItem(hintKey, "1");
        setTimeout(() => setShowPullHint(false), 4000);
      }, 3000);
      return () => clearTimeout(t);
    }
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

  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "La Commune · Tarjeta de fidelidad",
          text: name
            ? `${name} ya tiene su tarjeta de fidelidad en La Commune. Cada visita suma — a las 5 te invitan una bebida.`
            : "Ya tengo mi tarjeta de fidelidad en La Commune. Cada visita suma — a las 5 te invitan una bebida.",
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
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
          <span aria-hidden="true" className="w-4 h-px bg-stone-400 dark:bg-stone-500 group-hover:w-7 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500" />
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
            <span aria-hidden="true" className="w-4 h-px bg-stone-400 dark:bg-stone-500 group-hover:w-7 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500" />
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
        {showPullHint && !refreshing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center py-2"
          >
            <span className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">
              Desliza hacia abajo para actualizar
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

        {/* Promos activas — si no hay promos, muestra el reward goal aquí */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="w-full max-w-xs"
        >
          {hasPromos ? (
            <div className="space-y-4">
              <PromoBannerInline />
              {!isCompleted && rewardDoc && (
                <p className="text-[11px] text-stone-400 dark:text-stone-500 tracking-wide text-center">
                  Completa {requiredStamps} sellos y gana: <span className="text-stone-600 dark:text-stone-300">{rewardName}</span>
                </p>
              )}
            </div>
          ) : promosLoaded && !isCompleted && rewardDoc ? (
            <div className="text-center space-y-1.5">
              <div className="flex items-center justify-center gap-3">
                <span aria-hidden="true" className="w-5 h-px bg-stone-300/40 dark:bg-stone-700/40" />
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400/80 dark:text-stone-500/70">
                  Recompensa
                </p>
                <span aria-hidden="true" className="w-5 h-px bg-stone-300/40 dark:bg-stone-700/40" />
              </div>
              <p className="font-display text-lg sm:text-xl font-light tracking-wide text-stone-700 dark:text-stone-200">
                {rewardName}
              </p>
              <p className="text-[11px] text-stone-400 dark:text-stone-600 leading-snug">
                Completa {requiredStamps} sellos para obtenerla
              </p>
            </div>
          ) : null}
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
                Canjear {rewardName.toLowerCase()} →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions: Historial + Descargar + Invitar (movil) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex items-center justify-center gap-6"
        >
          <Link
            href={`/card/${cardId}/history`}
            className="flex flex-col items-center gap-1.5 group"
          >
            <span className="w-10 h-10 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center group-hover:border-stone-500 dark:group-hover:border-stone-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-stone-400 dark:text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-stone-400 dark:text-stone-600 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">
              Historial
            </span>
          </Link>

          <DownloadCardButton cardId={cardId} customerName={name} />

          {/* Invitar: solo movil */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1.5 group sm:hidden"
          >
            <span className="w-10 h-10 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center group-hover:border-stone-500 dark:group-hover:border-stone-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-stone-400 dark:text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-stone-400 dark:text-stone-600 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">
              {copied ? "Copiado!" : "Invitar"}
            </span>
          </button>
        </motion.div>

      </div>

      {/* Footer discreto: ajustes de cuenta */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="w-full border-t border-stone-200/50 dark:border-stone-800/50 py-6 px-4"
      >
        <div className="max-w-xs mx-auto space-y-3">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setShowPhoneUpdate((v) => !v)}
              className="text-[9px] uppercase tracking-[0.2em] text-stone-300 dark:text-stone-700 hover:text-stone-500 dark:hover:text-stone-500 transition-colors"
            >
              Cambiar telefono
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="text-[9px] uppercase tracking-[0.2em] text-stone-300 dark:text-stone-700 hover:text-red-400 dark:hover:text-red-500 transition-colors"
                >
                  Cerrar sesion
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-white dark:bg-neutral-900 border-stone-200 dark:border-stone-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-stone-900 dark:text-stone-100">
                    Cerrar sesion
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-stone-500 dark:text-stone-400">
                    Necesitaras tu PIN de 4 digitos para volver a entrar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Cerrar sesion
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
        </div>
      </motion.footer>

      {/* Banner sin conexion */}
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
