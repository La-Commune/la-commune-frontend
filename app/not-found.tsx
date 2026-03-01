"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-8">
      {/* Film grain */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center space-y-6 max-w-sm relative"
      >
        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">
          Error 404
        </p>
        <h1
          className="text-5xl sm:text-6xl font-light tracking-wide text-stone-200"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Nada aquí
        </h1>
        <div className="w-6 h-px bg-stone-700 mx-auto" />
        <p className="text-sm text-stone-500 leading-relaxed">
          La página que buscas no existe<br />o fue movida.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-stone-500 hover:text-white transition-colors duration-300 group"
        >
          <span className="w-5 h-px bg-stone-600 group-hover:w-8 group-hover:bg-white transition-all duration-500" />
          Volver al inicio
        </Link>
      </motion.div>
    </div>
  );
}
