"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { CoffeeBean } from "@/components/ui/CoffeeBean";

const MOCK_MAX = 5;

function MockCardFront({ stamps }: { stamps: number }) {
  const isComplete = stamps >= MOCK_MAX;
  const remaining = MOCK_MAX - stamps;
  const progress = (stamps / MOCK_MAX) * 100;

  return (
    <div
      className="absolute inset-0 backface-hidden rounded-[24px] overflow-hidden text-[#2B2B2B] shadow-[0_12px_40px_rgba(0,0,0,0.14)] flex flex-col"
      style={{ background: "linear-gradient(145deg, #FAF7F4 0%, #F0E9E0 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E8E0D8]">
        <p
          className="text-[13px] font-light tracking-[0.35em] uppercase text-[#2B2B2B]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          La Commune
        </p>
        <p className="text-[9px] tracking-widest uppercase text-[#A89E97]">
          {isComplete ? "Completada" : "Fidelidad"}
        </p>
      </div>

      {/* Título + granos */}
      <div className="flex-1 flex flex-col justify-center px-5 py-3 gap-3">
        <div>
          <h2
            className="text-[17px] font-light leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {isComplete ? "¡Bebida de cortesía!" : "Café de la casa"}
          </h2>
          <p className="text-[10px] tracking-wide text-[#8A817A] mt-0.5">
            {isComplete ? "Preséntala en barra" : "Cliente frecuente"}
          </p>
        </div>

        <div className="flex justify-between">
          {Array.from({ length: MOCK_MAX }).map((_, i) => (
            <CoffeeBean key={i} active={i < stamps} />
          ))}
        </div>
      </div>

      {/* Progreso */}
      <div className="px-5 pb-4 space-y-2">
        <div className="h-[2px] bg-[#E8E0D8] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: isComplete
                ? "linear-gradient(90deg, #8A6A3A, #C4954A)"
                : "#3A2F2A",
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="flex justify-between">
          <p className="text-[9px] tracking-widest uppercase text-[#A89E97]">
            {stamps} de {MOCK_MAX} visitas
          </p>
          <p className="text-[9px] text-[#A89E97]">
            {isComplete ? "✓ Lista" : `${remaining} restante${remaining !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
    </div>
  );
}

function MockCardBack() {
  return (
    <div
      className="absolute inset-0 backface-hidden rotate-y-180 rounded-[24px] overflow-hidden text-[#2B2B2B] shadow-[0_12px_40px_rgba(0,0,0,0.14)] flex flex-col items-center justify-between px-5 py-4"
      style={{ background: "linear-gradient(145deg, #FAF7F4 0%, #F0E9E0 100%)" }}
    >
      <div className="text-center space-y-1.5">
        <p
          className="text-[15px] font-light tracking-[0.45em] uppercase text-[#2B2B2B]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          La Commune
        </p>
        <div className="w-5 h-px bg-[#C7B7A3] mx-auto" />
      </div>

      {/* QR decorativo */}
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-2xl bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
            <rect x="4" y="4" width="28" height="28" rx="3" fill="#2B2B2B" />
            <rect x="8" y="8" width="20" height="20" rx="2" fill="#FAF7F4" />
            <rect x="12" y="12" width="12" height="12" rx="1" fill="#2B2B2B" />
            <rect x="64" y="4" width="28" height="28" rx="3" fill="#2B2B2B" />
            <rect x="68" y="8" width="20" height="20" rx="2" fill="#FAF7F4" />
            <rect x="72" y="12" width="12" height="12" rx="1" fill="#2B2B2B" />
            <rect x="4" y="64" width="28" height="28" rx="3" fill="#2B2B2B" />
            <rect x="8" y="68" width="20" height="20" rx="2" fill="#FAF7F4" />
            <rect x="12" y="72" width="12" height="12" rx="1" fill="#2B2B2B" />
            <rect x="40" y="4" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="50" y="4" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="40" y="14" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="50" y="14" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="40" y="40" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="50" y="40" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="40" y="50" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="64" y="40" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="74" y="40" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="84" y="50" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="64" y="64" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="74" y="74" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="84" y="64" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="4" y="40" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="14" y="40" width="6" height="6" rx="1" fill="#2B2B2B" />
            <rect x="24" y="50" width="6" height="6" rx="1" fill="#2B2B2B" />
          </svg>
        </div>
        <p className="text-[9px] tracking-[0.2em] uppercase text-[#A89E97]">
          Escanea en barra
        </p>
      </div>

      <p
        className="text-[11px] tracking-wide text-[#8A817A]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Gracias por volver
      </p>
    </div>
  );
}

function MockStampCard() {
  const [flipped, setFlipped] = useState(false);
  const [stamps, setStamps] = useState(3);
  const [hintDismissed, setHintDismissed] = useState(false);

  const handleFlip = () => {
    setFlipped((f) => !f);
    setHintDismissed(true);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Tarjeta */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          className="w-[320px] h-[210px] mx-auto perspective cursor-pointer"
          whileTap={{ scale: 0.97 }}
          onClick={handleFlip}
        >
          <motion.div
            className="relative w-full h-full"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <MockCardFront stamps={stamps} />
            <MockCardBack />
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {!hintDismissed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 1 }}
              className="text-[10px] uppercase tracking-[0.3em] text-stone-600"
            >
              Toca para ver tu QR
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Controles interactivos */}
      <div className="flex flex-col items-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">
          Simula sellos
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setStamps((s) => Math.max(0, s - 1))}
            disabled={stamps === 0}
            className="w-8 h-8 rounded-full border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-white transition-colors duration-200 disabled:opacity-20 text-sm"
          >
            −
          </button>
          <span className="text-sm text-stone-400 tabular-nums w-12 text-center">
            {stamps} / {MOCK_MAX}
          </span>
          <button
            onClick={() => setStamps((s) => Math.min(MOCK_MAX, s + 1))}
            disabled={stamps === MOCK_MAX}
            className="w-8 h-8 rounded-full border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-white transition-colors duration-200 disabled:opacity-20 text-sm"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================
   Página de preview
================================= */
export default function CardPreviewPage() {
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
        <div className="w-16" />
      </nav>

      {/* Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-4 pb-16">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-3"
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">
            Vista previa
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-light tracking-wide">
            Tu tarjeta digital
          </h1>
          <p className="text-sm text-stone-400 max-w-xs mx-auto leading-relaxed">
            Acumula visitas y desbloquea tu bebida de cortesía.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <MockStampCard />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-center space-y-3"
        >
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-stone-200 hover:text-white transition-colors duration-300 group"
          >
            <span className="w-6 h-px bg-stone-400 group-hover:w-10 group-hover:bg-white transition-all duration-500" />
            Crear mi tarjeta real
          </Link>
          <p className="text-[10px] text-stone-600 tracking-wide">
            Sin contraseñas · Sin spam
          </p>
        </motion.div>

      </div>
    </div>
  );
}
