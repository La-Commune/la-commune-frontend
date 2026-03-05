"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ReactCanvasConfetti from "react-canvas-confetti";
import { QRCodeCanvas } from "qrcode.react";
import { doc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { getCardByCustomer } from "@/services/card.service";
import { setCustomerSession } from "@/app/actions/customerSession";

type ConfettiInstance = (opts: any) => void;

export default function RedeemPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const router = useRouter();
  const firestore = useFirestore();

  const confettiRef = useRef<ConfettiInstance | null>(null);
  const firedRef = useRef(false);

  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Firestore listeners
  const cardRef = doc(firestore, "cards", cardId);
  const rewardRef = doc(firestore, "rewards", "default");

  const { data: cardDoc } = useFirestoreDocData(cardRef, { suspense: false });
  const { data: rewardDoc } = useFirestoreDocData(rewardRef, { suspense: false });

  const cardStatus = (cardDoc as any)?.status as string | undefined;
  const rewardDescription: string =
    (rewardDoc as any)?.description ?? "Una bebida de cortesia";

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
    if (cardStatus !== "completed" && cardStatus !== "redeemed") {
      setToast("Tu tarjeta aun no esta completa");
      setTimeout(() => router.replace(`/card/${cardId}`), 1500);
    }
  }, [cardStatus, cardDoc, cardId, router]);

  // Si la tarjeta fue canjeada (barista confirmo), redirigir al nuevo card
  useEffect(() => {
    if (cardStatus !== "redeemed") return;
    const customerId =
      typeof window !== "undefined"
        ? localStorage.getItem("customerId")
        : null;
    if (!customerId) return;

    const customerRef = doc(firestore, "customers", customerId);
    getCardByCustomer(firestore, customerRef).then((newCard) => {
      if (newCard) {
        localStorage.setItem("cardId", newCard.id);
        setCustomerSession(customerId!, newCard.id);
        router.replace(`/card/${newCard.id}`);
      }
    });
  }, [cardStatus, firestore, router]);

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
    const shareUrl = typeof window !== "undefined" ? window.location.origin + `/card/${cardId}` : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "La Commune · Tarjeta completada!",
          text: "Complete mi tarjeta de fidelidad en La Commune! Cada visita suma — y ya gane mi bebida de cortesia.",
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
          <span className="w-4 h-px bg-stone-500 group-hover:w-7 group-hover:bg-white transition-all duration-500" />
          Mi tarjeta
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-500">
          La Commune
        </span>
        <span className="w-16" />
      </nav>

      {/* Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-4 pb-16 relative z-10">

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
          className="w-24 h-px bg-stone-700"
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
          className="w-24 h-px bg-stone-700"
        />

        {/* Boton compartir — siempre visible con fallback a clipboard */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          onClick={handleShare}
          className="px-8 py-3 rounded-2xl border border-stone-700 text-[11px] uppercase tracking-[0.3em] text-stone-400 hover:border-stone-500 hover:text-stone-200 transition-colors duration-300"
        >
          {copied ? "Enlace copiado!" : "Compartir logro"}
        </motion.button>

      </div>
    </div>
  );
}
