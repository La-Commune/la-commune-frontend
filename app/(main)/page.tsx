"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import React, { useRef, useState, useEffect } from "react";

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
  onSecondaryCtaClick?: () => void;
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
  onSecondaryCtaClick,
  align = "center",
}) => {
  const router = useRouter();
  const ref = useRef(null);
  const [videoFailed, setVideoFailed] = useState(false);

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
      {!videoFailed ? (
        <motion.video
          style={{ y: smoothY }}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 w-full h-[116%] object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
        </motion.video>
      ) : (
        <motion.div
          style={{ y: smoothY }}
          className="absolute inset-0 w-full h-[116%]"
        >
          {/* Gradiente cálido — evoca café sin necesitar imagen */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_80%,#2d1507_0%,#111111_65%)]" />
          {/* Grano sutil para textura — sin assets externos */}
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "128px 128px",
            }}
          />
        </motion.div>
      )}

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

            {secondaryCtaText && (
              onSecondaryCtaClick ? (
                <button
                  onClick={onSecondaryCtaClick}
                  className="text-[10px] uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300 transition-colors duration-300"
                >
                  {secondaryCtaText}
                </button>
              ) : secondaryCtaLink ? (
                <Link
                  href={secondaryCtaLink}
                  className="text-[10px] uppercase tracking-[0.3em] text-stone-500 hover:text-stone-300 transition-colors duration-300"
                >
                  {secondaryCtaText}
                </Link>
              ) : null
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
  const router = useRouter();
  const [cardId, setCardId] = useState<string | null>(null);
  console.log("Card ID from localStorage:", cardId);
  

  useEffect(() => {
    setCardId(localStorage.getItem("cardId"));
  }, []);

  const handleClearSession = () => {
    localStorage.removeItem("cardId");
    localStorage.removeItem("customerId");
    router.push("/onboarding");
  };

  const loyaltyCta = cardId
    ? { text: "Ver mi tarjeta", link: `/card/${cardId}` }
    : { text: "Registrar mi tarjeta", link: "/onboarding" };

  return (
    <main className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory bg-neutral-950">

      {/* Hero — centrado, marca como eyebrow */}
      <PremiumSection
        eyebrow="La Commune"
        title={`Café\nen común`}
        subtitle="No es solo café. Es el espacio que elegiste para estar."
        videoSrc="/videos/coffee-slow.mp4"
        ctaText="Ver menú"
        ctaLink="/menu"
      />

      {/* Segunda sección — fidelidad, alineada a la izquierda */}
      <PremiumSection
        eyebrow="Para los que vuelven"
        title={`Lo que se da\nvuelve`}
        subtitle="Cada visita es un ladrillo. Después de cinco, la casa responde."
        videoSrc="/videos/coffee-hero.mp4"
        ctaText={loyaltyCta.text}
        ctaLink={loyaltyCta.link}
        secondaryCtaText={cardId ? "No es mi tarjeta" : "Ver cómo funciona"}
        secondaryCtaLink={cardId ? undefined : "/card/preview"}
        onSecondaryCtaClick={cardId ? handleClearSession : undefined}
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
              © {new Date().getFullYear()} · La Commune · En construcción permanente
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
            {/* Acceso discreto para personal */}
            <Link
              href="/admin"
              className="mt-2 text-[9px] tracking-[0.3em] uppercase text-stone-800 hover:text-stone-600 transition-colors duration-300"
            >
              Personal
            </Link>
          </div>
        </motion.div>
      </footer>
    </main>
  );
}
