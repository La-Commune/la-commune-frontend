"use client";

import { useRouter } from "next/navigation";
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
  align?: "center" | "left";
}

const PremiumSection: React.FC<SectionProps> = ({
  eyebrow,
  title,
  subtitle,
  videoSrc,
  ctaText,
  ctaLink,
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
          <motion.button
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.7 }}
            onClick={() => router.push(ctaLink)}
            className="mt-10 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-stone-200 hover:text-white transition-colors duration-300 group"
          >
            <span className="w-6 h-px bg-stone-400 group-hover:w-10 group-hover:bg-white transition-all duration-500" />
            {ctaText}
          </motion.button>
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

      {/* Segunda sección — alineada a la izquierda, título más breve */}
      <PremiumSection
        eyebrow="Programa de fidelidad"
        title={`Cada visita\ncuenta`}
        subtitle="Después de cinco bebidas, la siguiente es cortesía de la casa."
        videoSrc="/videos/coffee-hero.mp4"
        align="left"
      />

      {/* Footer compacto — no ocupa pantalla completa */}
      <footer className="snap-start h-[100dvh] flex flex-col items-center justify-end pb-16 bg-neutral-950">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="text-center space-y-4"
        >
          <p className="text-stone-200 tracking-[0.5em] text-xs uppercase">
            La Commune
          </p>
          <div className="w-6 h-px bg-stone-700 mx-auto" />
          <p className="text-stone-600 text-[10px] tracking-[0.3em] uppercase">
            © {new Date().getFullYear()} · Hecho con amor
          </p>
        </motion.div>
      </footer>
    </main>
  );
}
