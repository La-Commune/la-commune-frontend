"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ReactCanvasConfetti from "react-canvas-confetti";
import { QRCodeCanvas } from "qrcode.react";
import { Card } from "@/models/card.model";
import { Reward } from "@/models/reward.model";
import { getCardByCustomer } from "@/services/card.service";
import { getDefaultReward } from "@/services/reward.service";
import { setCustomerSession } from "@/app/actions/customerSession";
import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { Skeleton } from "@/components/ui/EmptyState";
import { LoadingButton } from "@/components/ui/LoadingButton";

type ConfettiInstance = (opts: any) => void;

export default function RedeemPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const router = useRouter();

  const confettiRef = useRef<ConfettiInstance | null>(null);
  const firedRef = useRef(false);

  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [cardDoc, setCardDoc] = useState<Card | null>(null);
  const [rewardDoc, setRewardDoc] = useState<Reward | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load reward once
  useEffect(() => {
    getDefaultReward().then((reward) => {
      if (reward) {
        setRewardDoc(reward);
      }
    });
  }, []);

  // Fetch inicial + realtime subscription for card
  useEffect(() => {
    if (!cardId) return;

    const supabase = getSupabase();

    // Fetch inicial — cubre refresh de página y cuando realtime aún no entrega
    Promise.resolve(
      supabase
        .from("tarjetas")
        .select("*")
        .eq("id", cardId)
        .single()
    )
      .then(({ data }) => {
        if (data) {
          setCardDoc({
            id: data.id,
            stamps: data.sellos,
            maxStamps: data.sellos_maximos,
            status: data.estado as Card["status"],
            createdAt: new Date(data.creado_en),
          });
        }
      })
      .finally(() => setInitialLoading(false));

    const channel = supabase
      .channel(`card-redeem-${cardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tarjetas",
          filter: `id=eq.${cardId}`,
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
  }, [cardId]);

  const cardStatus = cardDoc?.status as string | undefined;
  const rewardDescription: string =
    rewardDoc?.description ?? "Una bebida de cortesía";

  // Access control: verificar que esta tarjeta pertenece al cliente
  useEffect(() => {
    const storedCardId =
      typeof window !== "undefined" ? localStorage.getItem("cardId") : null;
    if (storedCardId && storedCardId !== cardId) {
      router.replace(`/onboarding?cardId=${cardId}`);
    }
  }, [cardId, router]);

  // Guard: si la tarjeta no esta completed ni redeemed, regresar con feedback
  useEffect(() => {
    if (!cardDoc) return;
    if (cardStatus !== "completada" && cardStatus !== "canjeada") {
      setToast("Tu tarjeta aun no esta completa");
      setTimeout(() => router.replace(`/card/${cardId}`), 1500);
    }
  }, [cardStatus, cardDoc, cardId, router]);

  // Si la tarjeta fue canjeada (barista confirmo), redirigir al nuevo card
  const redirectingRef = useRef(false);
  useEffect(() => {
    if (cardStatus !== "canjeada") return;
    if (redirectingRef.current) return;
    redirectingRef.current = true;

    const customerId =
      typeof window !== "undefined"
        ? localStorage.getItem("customerId")
        : null;
    if (!customerId) {
      logger.warn("redeem", "No customerId in localStorage, redirecting to home");
      router.replace("/");
      return;
    }

    // Retry logic: la nueva tarjeta puede tardar un instante en ser visible
    // por replicación, así que reintentamos hasta 3 veces con delay
    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 800; // ms

    const tryRedirect = async () => {
      attempts++;
      try {
        const newCard = await getCardByCustomer(customerId);
        if (newCard) {
          localStorage.setItem("cardId", newCard.id);
          await setCustomerSession(customerId, newCard.id);
          router.replace(`/card/${newCard.id}`);
          return;
        }

        // No new card found yet — retry or fallback
        if (attempts < maxAttempts) {
          setTimeout(tryRedirect, retryDelay);
        } else {
          // Fallback: buscar directamente cualquier tarjeta activa del cliente
          const supabase = getSupabase();
          const { data } = await supabase
            .from("tarjetas")
            .select("id")
            .eq("negocio_id", NEGOCIO_ID)
            .eq("cliente_id", customerId)
            .eq("estado", "activa")
            .order("creado_en", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data) {
            localStorage.setItem("cardId", data.id);
            await setCustomerSession(customerId, data.id);
            router.replace(`/card/${data.id}`);
          } else {
            // Último recurso: la RPC debió crear la tarjeta, algo salió mal
            logger.error("redeem", "No active card found after redeem", { customerId, cardId });
            setToast("Tu bebida fue canjeada. Abriendo nueva tarjeta...");
            setTimeout(() => router.replace("/"), 2000);
          }
        }
      } catch (err) {
        logger.error("redeem", "Error finding new card", err);
        if (attempts < maxAttempts) {
          setTimeout(tryRedirect, retryDelay);
        } else {
          setToast("Hubo un error. Redirigiendo...");
          setTimeout(() => router.replace("/"), 2000);
        }
      }
    };

    tryRedirect();
  }, [cardStatus, cardId, router]);

  const fireConfetti = useCallback(() => {
    confettiRef.current?.({
      particleCount: 120,
      spread: 70,
      startVelocity: 30,
      origin: { y: 0.5 },
      colors: ["#2B2B2B", "#8A817A", "#C7B7A3", "#D4A853", "#F5E6C8"],
      scalar: 0.95,
    });
  }, []);

  // Disparar confetti + haptic al montar (una sola vez)
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if ("vibrate" in navigator) navigator.vibrate(80);
    const t = setTimeout(fireConfetti, 300);
    return () => clearTimeout(t);
  }, [fireConfetti]);

  const handleShare = async () => {
    setSharing(true);
    const shareUrl = typeof window !== "undefined" ? window.location.origin + `/card/${cardId}` : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: "La Commune · ¡Tarjeta completada!",
            text: "¡Completé mi tarjeta de fidelidad en La Commune! Cada visita suma — y ya gané mi bebida de cortesía.",
            url: shareUrl,
          });
          return;
        } catch {
          // User cancelled or share failed — fall through to clipboard
        }
      }
      // Fallback: copy link
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard not available
      }
    } finally {
      setSharing(false);
    }
  };

  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/card/${cardId}`
      : `https://lacommunecafe.mx/card/${cardId}`;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-stone-800 border border-stone-700 text-stone-200 text-[11px] uppercase tracking-widest px-6 py-3 rounded-2xl shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti canvas */}
      <ReactCanvasConfetti
        onInit={({ confetti }) => {
          confettiRef.current = confetti;
        }}
        style={{
          position: "fixed",
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          zIndex: 50,
        }}
      />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 relative z-10">
        <Link
          href={`/card/${cardId}`}
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-white transition-colors duration-300 group"
        >
          <span aria-hidden="true" className="w-4 h-px bg-stone-500 group-hover:w-7 group-hover:bg-white transition-all duration-500" />
          Mi tarjeta
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-500">
          La Commune
        </span>
        <span className="w-16" />
      </nav>

      {/* Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-4 pb-16 relative z-10">

        {/* Skeleton mientras carga la tarjeta */}
        {initialLoading && (
          <div className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="text-center space-y-4 w-full">
              <Skeleton className="h-3 w-24 mx-auto" />
              <Skeleton className="h-12 w-48 mx-auto" />
              <Skeleton className="h-3 w-40 mx-auto" />
            </div>
            <Skeleton className="h-px w-24" />
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-3 w-44" />
              <Skeleton className="h-[200px] w-[200px] rounded-2xl" />
            </div>
          </div>
        )}

        {/* Contenido real — una vez cargada la tarjeta */}
        {!initialLoading && (
          <>
            {/* Encabezado celebratorio */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center space-y-3"
            >
              <p className="text-[10px] uppercase tracking-[0.45em] text-amber-600">
                Tarjeta completa
              </p>
              <h1 className="font-display text-5xl sm:text-6xl font-light tracking-wide">
                Lo lograste!
              </h1>
              <p className="text-stone-400 text-sm tracking-wide max-w-xs mx-auto">
                {rewardDescription}
              </p>
            </motion.div>

            {/* Separador */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              aria-hidden="true" className="w-24 h-px bg-stone-700"
            />

            {/* Instruccion + QR */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col items-center gap-5"
            >
              <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500">
                Muestrale este codigo al barista
              </p>
              <div className="p-4 bg-white rounded-2xl shadow-xl max-w-[60vw] sm:max-w-none">
                <QRCodeCanvas
                  value={qrUrl}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                  level="M"
                  className="w-full h-auto max-w-[200px]"
                />
              </div>
            </motion.div>

            {/* Separador */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              aria-hidden="true" className="w-24 h-px bg-stone-700"
            />

            {/* Boton compartir — con loading state */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <LoadingButton
                onClick={handleShare}
                loading={sharing}
                loadingText="Compartiendo"
                variant="outline"
                size="lg"
              >
                {copied ? "Enlace copiado!" : "Compartir logro"}
              </LoadingButton>
            </motion.div>
          </>
        )}

      </div>
    </div>
  );
}
