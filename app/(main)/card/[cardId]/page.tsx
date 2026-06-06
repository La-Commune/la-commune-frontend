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
import { getCardByCustomer } from "@/services/card.service";
import { getDefaultReward, getRewardById } from "@/services/reward.service";
import { logger } from "@/lib/logger";
import { PromoBannerInline, useActivePromos } from "@/components/ui/promos/PromoBanner";
import {
  getCustomerSession,
  setCustomerSession,
  clearCustomerSession,
} from "@/app/actions/customerSession";
import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { PushPrompt } from "@/components/ui/PushPrompt";
import { getReferralCount } from "@/services/customer.service";
import { fireCelebration } from "@/lib/confetti";
import { hapticCelebration } from "@/lib/haptics";
import { useRealtimeToasts } from "@/hooks/useRealtimeToasts";
import { useInAppToast, InAppToastContainer } from "@/components/ui/InAppToast";


// Pantalla cuando el cliente o tarjeta ya no existe
function GoneScreen() {
  const router = useRouter();

  const messages = [
    {
      title: "Tus granos se fueron con el viento",
      subtitle: "Parece que tu cuenta fue eliminada. Pero hey, siempre puedes empezar de nuevo.",
    },
    {
      title: "Alguien derramó tu café",
      subtitle: "Tu cuenta ya no existe en nuestro sistema. Crea una nueva y vuelve a sumar sellos.",
    },
    {
      title: "Tu taza está vacía",
      subtitle: "No encontramos tu cuenta. Puede que haya sido eliminada, pero una nueva aventura cafetera te espera.",
    },
  ];

  const [msg] = useState(() => messages[Math.floor(Math.random() * messages.length)]);

  const handleGoHome = async () => {
    localStorage.removeItem("cardId");
    localStorage.removeItem("customerId");
    await clearCustomerSession();
    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-white flex flex-col">
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link href="/" className="font-mono text-xs font-medium tracking-[0.25em] uppercase text-stone-900 dark:text-stone-200 hover:text-amber-700 dark:hover:text-amber-500 transition-colors duration-300">
          La Commune
        </Link>
        <ThemeToggle />
      </nav>
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-sm space-y-8"
        >
          {/* Icono taza rota */}
          <motion.div
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-6xl"
          >
            ☕️
          </motion.div>

          <div className="space-y-3">
            <h1 className="font-display text-2xl sm:text-3xl font-light tracking-wide">
              {msg.title}
            </h1>
            <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
              {msg.subtitle}
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleGoHome}
              className="w-full rounded-full bg-stone-800 text-white dark:bg-white dark:text-neutral-900 py-3 text-sm tracking-wide transition hover:bg-stone-900 dark:hover:bg-stone-100"
            >
              Volver al inicio
            </button>
            <Link
              href="/onboarding"
              onClick={() => {
                localStorage.removeItem("cardId");
                localStorage.removeItem("customerId");
              }}
              className="block text-[11px] text-stone-400 dark:text-stone-600 underline underline-offset-2 hover:text-stone-600 dark:hover:text-stone-300 transition-colors tracking-wide"
            >
              Crear nueva cuenta
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


export default function CardEntry() {
  const { cardId: cardIdParam } = useParams<{ cardId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [gone, setGone] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cardDoc, setCardDoc] = useState<Card | null>(null);

  // Realtime + fetch inicial de datos del cliente
  useEffect(() => {
    if (!resolvedCustomerId) return;

    const supabase = getSupabase();

    // OJO: este mapper también recibe payloads de REALTIME, que traen la fila
    // completa (el select acotado solo protege el fetch inicial). Por eso aquí
    // NUNCA se mapean pin_hmac/notas — si se mapearan, cada sello (UPDATE de
    // clientes) los filtraría al navegador vía el canal realtime.
    function mapClienteRow(row: Record<string, unknown>): Customer {
      return {
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
        referrerCustomerId: row.id_referidor as string | undefined,
        referralBonusGiven: row.bono_referido_entregado as boolean | undefined,
        schemaVersion: 1,
      };
    }

    // Fetch inicial
    // Select explicito: pin_hmac y notas NUNCA viajan al cliente
    // (la UI no los usa; el cardId de la URL no debe dar acceso a ellos)
    supabase
      .from("clientes")
      .select(
        "nombre, telefono, email, activo, total_visitas, total_sellos, creado_en, ultima_visita, consentimiento_whatsapp, consentimiento_email, id_referidor, bono_referido_entregado"
      )
      .eq("id", resolvedCustomerId)
      .eq("negocio_id", NEGOCIO_ID)
      .single()
      .then(({ data }) => {
        if (!data || !(data as Record<string, unknown>).activo) {
          setGone(true);
          return;
        }
        setCustomer(mapClienteRow(data as Record<string, unknown>));
      });

    // Suscripción realtime para cambios futuros
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
          if (payload.eventType === "DELETE") {
            setGone(true);
            return;
          }
          const row = payload.new as Record<string, unknown>;
          if (row.activo === false) {
            setGone(true);
            return;
          }
          setCustomer(mapClienteRow(row));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedCustomerId]);

  // Setup realtime subscription for card data + initial fetch with validation
  useEffect(() => {
    if (!cardIdParam) return;

    const supabase = getSupabase();

    // Fetch inicial — valida que la tarjeta exista y su estado actual
    supabase
      .from("tarjetas")
      .select("*")
      .eq("id", cardIdParam)
      .single()
      .then(({ data: row, error }) => {
        if (!row || error) {
          setGone(true);
          return;
        }
        setCardDoc({
          id: row.id as string,
          rewardId: row.recompensa_id as string,
          stamps: row.sellos as number,
          maxStamps: row.sellos_maximos as number,
          status: row.estado as Card["status"],
          createdAt: new Date(row.creado_en as string),
        });
      });

    const channel = supabase
      .channel(`card-page-${cardIdParam}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tarjetas",
          filter: `id=eq.${cardIdParam}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setGone(true);
            return;
          }
          const row = payload.new as Record<string, unknown>;
          setCardDoc({
            id: row.id as string,
            rewardId: row.recompensa_id as string,
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

  // Si la tarjeta fue canjeada, buscar la nueva tarjeta activa y redirigir
  const canjeRedirectRef = useRef(false);

  const findAndRedirectToActiveCard = async (customerId: string) => {
    if (canjeRedirectRef.current) return;
    canjeRedirectRef.current = true;

    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 800;

    const tryRedirect = async () => {
      attempts++;
      try {
        const newCard = await getCardByCustomer(customerId);
        if (newCard) {
          localStorage.setItem("cardId", newCard.id);
          setCustomerSession(customerId, newCard.id);
          router.replace(`/card/${newCard.id}`);
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(tryRedirect, retryDelay);
        } else {
          logger.error("card-page", "No active card found after redeem", { customerId });
          router.replace("/");
        }
      } catch (err) {
        logger.error("card-page", "Error finding new card after redeem", err);
        if (attempts < maxAttempts) {
          setTimeout(tryRedirect, retryDelay);
        } else {
          router.replace("/");
        }
      }
    };

    tryRedirect();
  };

  useEffect(() => {
    if (!cardDoc || cardDoc.status !== "canjeada") return;
    if (!resolvedCustomerId) return;
    findAndRedirectToActiveCard(resolvedCustomerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDoc?.status, resolvedCustomerId, router]);

  // Revalidar al volver a la app (tab/app switch) — detecta cambios de otro dispositivo
  useEffect(() => {
    if (!cardIdParam) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      const supabase = getSupabase();
      supabase
        .from("tarjetas")
        .select("id, recompensa_id, sellos, sellos_maximos, estado, creado_en")
        .eq("id", cardIdParam)
        .single()
        .then(({ data: row, error }) => {
          if (!row || error) {
            setGone(true);
            return;
          }
          setCardDoc({
            id: row.id as string,
            rewardId: row.recompensa_id as string,
            stamps: row.sellos as number,
            maxStamps: row.sellos_maximos as number,
            status: row.estado as Card["status"],
            createdAt: new Date(row.creado_en as string),
          });
        });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [cardIdParam]);

  // Session resolution: localStorage first, then cookie fallback.
  // Also handles stale cardId (e.g. from another device or old URL).
  useEffect(() => {
    async function resolveSession() {
      let customerId: string | null = null;

      // 1. Try localStorage
      const storedCardId = localStorage.getItem("cardId");
      const storedCustomerId = localStorage.getItem("customerId");

      if (storedCardId && storedCardId === cardIdParam && storedCustomerId) {
        setCardId(storedCardId);
        setResolvedCustomerId(storedCustomerId);
        setLoading(false);
        return;
      }

      // Si tenemos customerId pero el cardId no coincide (otra tarjeta en la URL),
      // verificar si la tarjeta activa del cliente es otra
      if (storedCustomerId) {
        customerId = storedCustomerId;
      }

      // 2. Cookie fallback
      if (!customerId) {
        try {
          const cookieSession = await getCustomerSession();
          if (cookieSession) {
            customerId = cookieSession.customerId;
            if (cookieSession.cardId === cardIdParam) {
              localStorage.setItem("cardId", cookieSession.cardId);
              localStorage.setItem("customerId", cookieSession.customerId);
              setCardId(cookieSession.cardId);
              setResolvedCustomerId(cookieSession.customerId);
              setLoading(false);
              return;
            }
          }
        } catch {
          // Cookie check failed, fall through
        }
      }

      // 3. Si tenemos customerId pero el cardId de la URL no coincide,
      // buscar la tarjeta activa real del cliente y redirigir
      if (customerId) {
        try {
          const activeCard = await getCardByCustomer(customerId);
          if (activeCard && activeCard.id !== cardIdParam) {
            // El cliente tiene otra tarjeta activa — redirigir
            localStorage.setItem("cardId", activeCard.id);
            setCustomerSession(customerId, activeCard.id);
            router.replace(`/card/${activeCard.id}`);
            return;
          }
          if (activeCard && activeCard.id === cardIdParam) {
            // La tarjeta de la URL es la activa, actualizar sesión
            localStorage.setItem("cardId", activeCard.id);
            localStorage.setItem("customerId", customerId);
            setCustomerSession(customerId, activeCard.id);
            setCardId(activeCard.id);
            setResolvedCustomerId(customerId);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to recover
        }
      }

      // No valid session — redirect to recovery
      router.replace(`/recover`);
    }

    resolveSession();
   
  }, [cardIdParam, router]);

if (gone) {
    return <GoneScreen />;
  }

  if (loading || !cardId) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-stone-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-10 px-4"
      >
        {/* Skeleton saludo */}
        <div className="text-center space-y-2">
          <div className="h-2 w-24 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse mx-auto" />
          <div className="h-8 w-40 bg-stone-200 dark:bg-stone-900 rounded-xl animate-pulse mx-auto" />
        </div>
        {/* Skeleton tarjeta */}
        <div className="w-[300px] h-[380px] bg-stone-200 dark:bg-stone-900 rounded-[24px] animate-pulse" />
      </motion.div>
    );
  }

  const isCompleted = cardDoc?.status === "completada";

  return <Card cardId={cardId} customerId={resolvedCustomerId!} customer={customer as Customer} isCompleted={isCompleted} rewardId={cardDoc?.rewardId} />;
}


function Card({
  cardId,
  customerId,
  customer,
  isCompleted,
  rewardId,
}: {
  cardId: string;
  customerId: string;
  customer?: Customer;
  isCompleted?: boolean;
  rewardId?: string;
}) {
  const router = useRouter();
  const name = customer?.name?.trim();

  // In-app realtime toasts
  const { toasts, showToast, dismiss } = useInAppToast();
  useRealtimeToasts(customerId, showToast);

  // Reward info — usa el rewardId de la tarjeta, fallback a default
  const [rewardDoc, setRewardDoc] = useState<Reward | null>(null);

  useEffect(() => {
    if (rewardId) {
      // La recompensa DE ESTA tarjeta — conserva su diseño original
      // aunque el default haya cambiado (DAV-67)
      getRewardById(rewardId).then((reward) => {
        if (reward) {
          setRewardDoc(reward);
        } else {
          // Reward borrada/desactivada — usar la default actual
          getDefaultReward().then((fallback) => {
            if (fallback) setRewardDoc(fallback);
          });
        }
      });
    } else {
      // Fallback si la tarjeta no tiene rewardId (tarjetas legacy)
      getDefaultReward().then((reward) => {
        if (reward) setRewardDoc(reward);
      });
    }
  }, [rewardId]);

  const rewardName: string = rewardDoc?.name ?? "Bebida gratis";

  // Promos
  const { promos } = useActivePromos();
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

  // Confetti + haptic cuando la tarjeta está completa
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (isCompleted && !celebratedRef.current) {
      celebratedRef.current = true;
      // Solo celebrar si no se ha celebrado esta tarjeta antes
      const key = `celebrated-${cardId}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        setTimeout(() => {
          fireCelebration();
          hapticCelebration();
        }, 600);
      }
    }
  }, [isCompleted, cardId]);

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
  const [referralCount, setReferralCount] = useState(0);

  // Cargar conteo de referidos
  useEffect(() => {
    getReferralCount(customerId)
      .then(setReferralCount)
      .catch(() => {}); // silencioso
  }, [customerId]);

  // Link de referido: usa el customerId como param estable
  const referralUrl = typeof window !== "undefined"
    ? `${window.location.origin}/onboarding?ref=${customerId}`
    : "";

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "La Commune · Tarjeta de fidelidad",
          text: name
            ? `${name} te invita a La Commune. Registrate y ambos reciben un sello extra en su tarjeta de fidelidad.`
            : "Te invito a La Commune. Registrate y ambos recibimos un sello extra en nuestra tarjeta de fidelidad.",
          url: referralUrl,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };


  return (
    <div id="main-content" className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-white flex flex-col">

      {/* In-app toasts */}
      <InAppToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href="/"
          className="font-mono text-xs font-medium tracking-[0.25em] uppercase text-stone-900 dark:text-stone-200 hover:text-amber-700 dark:hover:text-amber-500 transition-colors duration-300"
        >
          La Commune
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex gap-8">
            <Link
              href="/menu"
              className="font-mono text-xs tracking-[0.12em] uppercase text-stone-400 dark:text-stone-500 hover:text-amber-700 dark:hover:text-amber-500 transition-colors duration-300 relative group"
            >
              Menu
              <span className="absolute bottom-[-2px] left-0 w-0 h-px bg-amber-700 dark:bg-amber-500 group-hover:w-full transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]" />
            </Link>
          </div>
          <ThemeToggle />
          <Link
            href="/menu"
            className="sm:hidden inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300 group"
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
            <span className="text-xs uppercase tracking-[0.4em] text-stone-400 dark:text-stone-500">
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
            <span className="text-xs uppercase tracking-[0.4em] text-stone-400 dark:text-stone-500">
              Desliza para actualizar
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 lg:gap-10 px-5 pb-12">

        {/* Saludo + subtitulo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-2"
        >
          <h1 className="font-display text-3xl sm:text-4xl font-light tracking-wide">
            {name ? `Hola, ${name}` : "Hola"}
          </h1>
          {/* En desktop el eyebrow "Programa de fidelidad" ya cumple esta función */}
          <p className="text-xs tracking-[0.3em] uppercase text-stone-400 dark:text-stone-500 lg:hidden">
            Tu tarjeta de fidelidad
          </p>
        </motion.div>

        {/* Promo inline */}
        {hasPromos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="w-full max-w-xs lg:max-w-md"
          >
            <PromoBannerInline />
          </motion.div>
        )}

        {/* Tarjeta — en desktop: layout expandido, en mobile: flip card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <StampCardView cardId={cardId} />
        </motion.div>

        {/* CTA de canje cuando tarjeta completa */}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              key="redeem-cta"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                href={`/card/${cardId}/redeem`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-100/50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-300 text-xs uppercase tracking-[0.3em] hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-400 dark:hover:border-amber-600 transition-colors duration-300"
              >
                Canjear {rewardName.toLowerCase()} &rarr;
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions: Historial + Descargar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex items-center justify-center gap-10 lg:gap-12"
        >
          <Link
            href={`/card/${cardId}/history`}
            className="flex flex-col items-center gap-2 group"
          >
            <span className="w-11 h-11 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center group-hover:border-stone-500 dark:group-hover:border-stone-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-stone-400 dark:text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">
              Historial
            </span>
          </Link>

          <DownloadCardButton cardId={cardId} customerName={name} />
        </motion.div>

        {/* Push notification prompt */}
        <PushPrompt clienteId={customerId} />

        {/* Sección referidos — más ancha en desktop */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="w-full max-w-xs lg:max-w-sm"
        >
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-neutral-900 px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  Invita a un amigo
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-500 leading-snug">
                  Ambos reciben un sello extra
                </p>
              </div>
              {referralCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {referralCount}
                  </span>
                  <span className="text-[10px] text-emerald-500 dark:text-emerald-500">
                    {referralCount === 1 ? "invitado" : "invitados"}
                  </span>
                </span>
              )}
            </div>

            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-stone-800 dark:bg-white text-white dark:text-neutral-900 py-3 text-xs uppercase tracking-[0.2em] hover:bg-stone-900 dark:hover:bg-stone-100 transition-colors"
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Link copiado
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                  Compartir invitación
                </>
              )}
            </button>
          </div>
        </motion.div>

      </div>

      {/* Footer discreto */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="w-full border-t border-stone-200/50 dark:border-stone-800/50 py-6 px-5"
      >
        <div className="flex items-center justify-center">
          <Link
            href="/profile"
            className="text-[10px] uppercase tracking-[0.2em] text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors"
          >
            Mi perfil
          </Link>
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
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-stone-200 dark:border-stone-800 px-6 py-4 text-center text-xs uppercase tracking-widest text-stone-400 dark:text-stone-500"
          >
            Sin conexión — tu QR sigue disponible
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
