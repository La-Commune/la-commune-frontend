"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import React, { useRef } from "react";

/* ===============================
   Animated Text (línea por línea)
================================= */
const AnimatedLines = ({
  text,
  align = "center",
}: {
  text: string;
  align?: "center" | "left";
}) => {
  const lines = text.split("\n");

  return (
    <div className={align === "left" ? "text-left" : "text-center"}>
      {lines.map((line, index) => (
        <motion.div
          key={index}
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.8,
            delay: index * 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-light leading-[1.1] tracking-wide">
            {line}
          </h2>
        </motion.div>
      ))}
    </div>
  );
};

/* ===============================
   Premium Section
================================= */
interface SectionProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  videoSrc: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  align?: "center" | "left";
}

const PremiumSection: React.FC<SectionProps> = ({
  eyebrow,
  title,
  subtitle,
  videoSrc,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  align = "center",
}) => {
  const router = useRouter();
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Parallax suave — reducido para no saturar
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const smoothY = useSpring(y, { stiffness: 60, damping: 25 });

  return (
    <section
      ref={ref}
      className={`relative h-[100dvh] w-full snap-start overflow-hidden flex items-center ${
        align === "left" ? "justify-start" : "justify-center"
      }`}
    >
      {/* Background Video con parallax suave */}
      <motion.video
        style={{ y: smoothY }}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-[116%] object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </motion.video>

      {/* Overlay limpio — sin blur para que el video respire */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div
        className={`relative z-10 px-8 sm:px-16 max-w-3xl text-white ${
          align === "left" ? "text-left" : "text-center mx-auto"
        }`}
      >
        {eyebrow && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-6 text-[10px] uppercase tracking-[0.35em] text-stone-300"
          >
            {eyebrow}
          </motion.p>
        )}

        <AnimatedLines text={title} align={align} />

        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.45 }}
            className="mt-6 text-base sm:text-lg text-stone-300 max-w-xl leading-relaxed font-light"
          >
            {subtitle}
          </motion.p>
        )}

        {ctaText && ctaLink && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.7 }}
            className="mt-10 flex flex-col items-start gap-4"
            style={align === "center" ? { alignItems: "center" } : {}}
          >
            <button
              onClick={() => router.push(ctaLink)}
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-stone-200 hover:text-white transition-colors duration-300 group"
            >
              <span className="w-6 h-px bg-stone-400 group-hover:w-10 group-hover:bg-white transition-all duration-500" />
              {ctaText}
            </button>

            {secondaryCtaText && secondaryCtaLink && (
              <Link
                href={secondaryCtaLink}
                className="text-[10px] uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300 transition-colors duration-300"
              >
                {secondaryCtaText}
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

/* ===============================
   MAIN
================================= */
export default function Home() {
  return (
    <main className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory bg-neutral-950">

      {/* Hero — centrado, marca como eyebrow */}
      <PremiumSection
        eyebrow="La Commune"
        title={`Café\nque despierta`}
        subtitle="Explora nuestro menú y descubre sabores que cuentan historias."
        videoSrc="/videos/coffee-slow.mp4"
        ctaText="Ver menú"
        ctaLink="/menu"
      />

      {/* Segunda sección — fidelidad, alineada a la izquierda */}
      <PremiumSection
        eyebrow="Programa de fidelidad"
        title={`Cada visita\ncuenta`}
        subtitle="Después de cinco bebidas, la siguiente es cortesía de la casa."
        videoSrc="/videos/coffee-hero.mp4"
        ctaText="Registrar mi tarjeta"
        ctaLink="/onboarding"
        secondaryCtaText="Ver cómo funciona"
        secondaryCtaLink="/card/preview"
        align="left"
      />

      {/* Footer con horarios y ubicación */}
      <footer className="snap-start h-[100dvh] flex flex-col items-center justify-center bg-neutral-950 px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="w-full max-w-md"
        >
          {/* Wordmark */}
          <div className="text-center mb-12">
            <p className="font-display text-3xl font-light tracking-[0.45em] uppercase text-stone-200">
              La Commune
            </p>
            <div className="w-6 h-px bg-stone-700 mx-auto mt-5" />
          </div>

          {/* Horarios + Ubicación */}
          <div className="grid grid-cols-2 gap-10 mb-12">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500 mb-5">
                Horarios
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] text-stone-500 uppercase tracking-wider">Lun – Vie</p>
                  <p className="text-sm text-stone-200 mt-0.5">7:00 – 20:00</p>
                </div>
                <div>
                  <p className="text-[11px] text-stone-500 uppercase tracking-wider">Sáb – Dom</p>
                  <p className="text-sm text-stone-200 mt-0.5">8:00 – 20:00</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500 mb-5">
                Encuéntranos
              </p>
              <div className="space-y-1">
                <p className="text-sm text-stone-200">Santa Natividad 135</p>
                <p className="text-[11px] text-stone-500">Col. Mineral de la Reforma</p>
                <p className="text-[11px] text-stone-500">Pachuca</p>
              </div>
            </div>
          </div>

          {/* Divisor + copyright + links */}
          <div className="border-t border-stone-800 pt-6 flex flex-col items-center gap-3">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-600">
              © {new Date().getFullYear()} · La Commune · Hecho con amor
            </p>
            <div className="flex items-center gap-6">
              <Link href="/menu" className="text-[10px] tracking-[0.25em] uppercase text-stone-700 hover:text-stone-400 transition-colors duration-300">
                Menú
              </Link>
              <span className="w-px h-3 bg-stone-800" />
              <Link href="/card/preview" className="text-[10px] tracking-[0.25em] uppercase text-stone-700 hover:text-stone-400 transition-colors duration-300">
                Mi tarjeta
              </Link>
              <span className="w-px h-3 bg-stone-800" />
              <Link href="/onboarding" className="text-[10px] tracking-[0.25em] uppercase text-stone-700 hover:text-stone-400 transition-colors duration-300">
                Registrarse
              </Link>
            </div>
          </div>
        </motion.div>
      </footer>
    </main>
  );
}
