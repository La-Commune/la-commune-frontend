"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/* ================================================
   Fade-in helper — reutilizado en toda la página
================================================= */
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ================================================
   Pilares de marca
================================================= */
const pillars = [
  {
    label: "El proceso",
    text: "Cada variable importa. La temperatura, la molienda, el tiempo de extracción. No hay atajos porque el café lo detecta. La técnica no es un fin; es respeto hacia la materia.",
  },
  {
    label: "La comunidad",
    text: "El nombre lo dice todo. Este espacio existe porque hay personas que eligen lo hecho con intención — y ese acto, repetido, construye algo más grande que una taza.",
  },
];

/* ================================================
   NOSOTROS — Opción 2: layout editorial sin video
================================================= */
export default function Nosotros() {
  return (
    <main className="min-h-screen bg-neutral-950 text-stone-200 selection:bg-stone-700">

      {/* Nav — back link fijo */}
      <nav className="fixed top-0 left-0 z-50 px-8 py-7">
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-stone-600 hover:text-stone-300 transition-colors duration-300 group"
        >
          <span className="w-6 h-px bg-stone-700 group-hover:w-10 group-hover:bg-stone-400 transition-all duration-500" />
          Inicio
        </Link>
      </nav>

      {/* ── HERO — tipografía grande, respiración vertical ── */}
      <section className="min-h-[90dvh] flex flex-col justify-end px-8 sm:px-16 pb-20 pt-36 max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-[10px] uppercase tracking-[0.45em] text-stone-600 mb-10"
        >
          La Commune · Quiénes somos
        </motion.p>

        <div className="overflow-hidden">
          <motion.h1
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1.1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[clamp(3rem,10vw,7rem)] font-light leading-[1.02] tracking-wide text-stone-100"
          >
            Trabajo<br />honesto.<br />
            <span className="text-stone-500">Taza honesta.</span>
          </motion.h1>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-10 text-sm text-stone-600 font-light tracking-wide max-w-xs leading-relaxed"
        >
          Una cafetería de especialidad en Pachuca construida sobre trabajo colectivo, técnica y respeto al origen.
        </motion.p>
      </section>

      {/* Línea divisora */}
      <div className="px-8 sm:px-16">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ originX: 0 }}
          className="h-px bg-stone-800 max-w-6xl mx-auto"
        />
      </div>

      {/* ── BRAND STORY — texto expandido ── */}
      <section className="px-8 sm:px-16 py-28 max-w-3xl mx-auto">
        <Reveal delay={0.15} className="mt-8">
          <p className="text-xl sm:text-2xl text-stone-400 font-light leading-relaxed">
            La Commune es el nombre que le ponemos a ese esfuerzo compartido. El café es el resultado visible de todo lo invisible.
          </p>
        </Reveal>

        <Reveal delay={0.3} className="mt-8">
          <p className="text-base text-stone-600 font-light leading-relaxed">
            El nombre no es casualidad. <em>Commune</em> — comunidad, lo que se tiene en común, lo que se construye entre varios. Aquí, eso se traduce en cadenas cortas de suministro, relación directa con tostadores mexicanos y un espacio donde cada visita alimenta algo más grande que la cafeína.
          </p>
        </Reveal>
      </section>

      {/* Línea divisora */}
      <div className="px-8 sm:px-16">
        <div className="h-px bg-stone-900 max-w-6xl mx-auto" />
      </div>

      {/* ── PILARES ── */}
      <section className="px-8 sm:px-16 py-24 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.45em] text-stone-600 mb-16">
            En lo que creemos
          </p>
        </Reveal>

        <div className={`grid grid-cols-1 gap-14 sm:gap-8 ${{ 1: "sm:grid-cols-1 max-w-lg", 2: "sm:grid-cols-2 max-w-3xl", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[pillars.length] ?? "sm:grid-cols-3"}`}>
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.label} delay={i * 0.12}>
              <p className="text-[10px] uppercase tracking-[0.4em] text-stone-500 mb-4">
                {pillar.label}
              </p>
              <div className="w-5 h-px bg-stone-800 mb-6" />
              <p className="text-sm text-stone-500 leading-relaxed font-light">
                {pillar.text}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── MANIFESTO — cierre ── */}
      <section className="px-8 sm:px-16 py-32 max-w-6xl mx-auto">
        <Reveal>
          <blockquote className="border-l border-stone-700 pl-8 sm:pl-12">
            <p className="font-display text-[clamp(1.8rem,5vw,3.5rem)] font-light italic text-stone-600 leading-[1.2] tracking-wide">
              &ldquo;El café es el pretexto.<br />La comunidad, el punto.&rdquo;
            </p>
            <footer className="mt-6 text-[10px] uppercase tracking-[0.4em] text-stone-700">
              — La Commune, Pachuca
            </footer>
          </blockquote>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-8 sm:px-16 py-12 border-t border-stone-900 max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-stone-700">
          © {new Date().getFullYear()} · La Commune
        </p>
        <div className="flex items-center gap-8">
          <Link
            href="/menu"
            className="text-[10px] tracking-[0.3em] uppercase text-stone-600 hover:text-stone-300 transition-colors duration-300"
          >
            Menú
          </Link>
          <span className="w-px h-3 bg-stone-800" />
          <Link
            href="/onboarding"
            className="text-[10px] tracking-[0.3em] uppercase text-stone-600 hover:text-stone-300 transition-colors duration-300"
          >
            Mi tarjeta
          </Link>
          <span className="w-px h-3 bg-stone-800" />
          <Link
            href="/"
            className="text-[10px] tracking-[0.3em] uppercase text-stone-600 hover:text-stone-300 transition-colors duration-300"
          >
            Inicio
          </Link>
        </div>
      </footer>

    </main>
  );
}
