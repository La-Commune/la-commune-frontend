"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import React, { useRef, useState, useEffect } from "react";
import { preload } from "react-dom";
import { SplashScreen } from "@/components/ui/SplashScreen";
import { HowItWorksAnimation } from "@/components/ui/HowItWorksAnimation";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getDefaultReward } from "@/services/reward.service";
import type { IllustrationId } from "@/components/ui/stamp-illustrations";

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
          <h2 className="font-display text-5xl sm:text-7xl md:text-8xl font-light leading-[1.05] tracking-wide">
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
  manifesto?: string;
  videoSrc: string;
  videoPoster?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  onSecondaryCtaClick?: () => void;
  align?: "center" | "left";
  lazy?: boolean;
  scrollIndicator?: boolean;
}

const PremiumSection: React.FC<SectionProps> = ({
  eyebrow,
  title,
  subtitle,
  manifesto,
  videoSrc,
  videoPoster,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
  onSecondaryCtaClick,
  align = "center",
  lazy = false,
  scrollIndicator = false,
}) => {
  const router = useRouter();
  const ref = useRef(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const stalledTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // El poster del hero ES el LCP — precargarlo con prioridad alta.
  // SIN guard de window: react-dom preload está diseñado para correr también
  // durante el render de SSR y emitir <link rel="preload" fetchpriority="high">
  // en el <head> del HTML — ahí está el beneficio real (el navegador lo
  // descubre antes de parsear el <video poster>). Client-side es idempotente.
  if (!lazy && videoPoster) {
    preload(videoPoster, { as: "image", fetchPriority: "high" });
  }
  const loopOverlayRef = useRef<HTMLDivElement>(null);
  const loopFadingOut = useRef(false);
  const rafRef = useRef<number | null>(null);
  const FADE_SECS = 1.8;
  const prefersReduced = useReducedMotion();

  // rAF a 60 fps — lee currentTime cada frame para opacidad perfectamente continua.
  // Solo corre MIENTRAS el video reproduce y la pestaña es visible: antes corría
  // desde el montaje, por sección, para siempre (CPU/batería en móvil).
  useEffect(() => {
    let running = false;

    const tick = () => {
      const video = videoRef.current;
      const overlay = loopOverlayRef.current;
      if (video && overlay && !loopFadingOut.current && video.duration) {
        const timeLeft = video.duration - video.currentTime;
        if (timeLeft <= FADE_SECS) {
          overlay.style.opacity = String(Math.min(1, 1 - timeLeft / FADE_SECS));
        }
      }
      if (running) rafRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      rafRef.current = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const video = videoRef.current;
    video?.addEventListener("playing", start);
    video?.addEventListener("pause", stop);
    video?.addEventListener("ended", stop);

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else if (videoRef.current && !videoRef.current.paused) {
        start();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Si el video ya está reproduciendo al montar el efecto
    if (video && !video.paused && !video.ended) start();

    return () => {
      stop();
      video?.removeEventListener("playing", start);
      video?.removeEventListener("pause", stop);
      video?.removeEventListener("ended", stop);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVideoEnded = () => {
    const video = videoRef.current;
    const overlay = loopOverlayRef.current;
    if (!video || !overlay) return;
    loopFadingOut.current = true;
    overlay.style.transition = "none";
    overlay.style.opacity = "1";
    setTimeout(() => {
      video.currentTime = 0;
      video.play().catch(() => {});
      overlay.style.transition = "opacity 1.1s cubic-bezier(0.4, 0, 0.2, 1)";
      overlay.style.opacity = "0";
      setTimeout(() => { loopFadingOut.current = false; }, 1200);
    }, 80);
  };

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Parallax suave — reducido para no saturar
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const smoothY = useSpring(y, { stiffness: 60, damping: 25 });

  // Mostrar fallback inmediatamente si no hay red al montar o si se pierde
  useEffect(() => {
    if (!navigator.onLine) setVideoFailed(true);
    const handleOffline = () => setVideoFailed(true);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      if (stalledTimer.current) clearTimeout(stalledTimer.current);
    };
  }, []);

  // Slow motion — 0.4x de velocidad para efecto cinematográfico
  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = 1;
  }, []);

  // Lazy-load: carga y reproduce el video solo cuando entra al viewport
  useEffect(() => {
    if (!lazy || !videoRef.current) return;
    const video = videoRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.load();
          video.play().catch(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [lazy]);

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
          ref={videoRef}
          autoPlay={!lazy && !prefersReduced}
          muted
          playsInline
          // metadata: el poster pinta el LCP de inmediato y el MP4 (5.9 MB)
          // se streamea al reproducir, en vez de bufferearse completo upfront
          preload={lazy ? "none" : "metadata"}
          poster={videoPoster}
          onError={() => setVideoFailed(true)}
          onStalled={() => {
            stalledTimer.current = setTimeout(() => setVideoFailed(true), 3000);
          }}
          onCanPlay={() => {
            if (stalledTimer.current) clearTimeout(stalledTimer.current);
          }}
          onEnded={handleVideoEnded}
          className="absolute inset-0 w-full h-[116%] object-cover"
          style={{ y: prefersReduced ? 0 : smoothY, filter: "saturate(0.6) hue-rotate(-15deg) contrast(1.15)" }}
        >
          <source src={videoSrc} type="video/mp4" />
        </motion.video>
      ) : (
        <motion.div
          style={{ y: prefersReduced ? 0 : smoothY }}
          className="absolute inset-0 w-full h-[116%]"
        >
          {videoPoster && (
            <Image
              src={videoPoster}
              alt=""
              fill
              unoptimized
              className="object-cover"
              style={{ filter: "saturate(0.6) hue-rotate(-15deg) contrast(1.15)" }}
            />
          )}
          {/* Gradiente cálido como base o cuando no hay poster */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_80%,#2d1507_0%,#111111_65%)] opacity-60" />
        </motion.div>
      )}

      {/* Loop fade — negro suave a 60fps vía rAF, invisible durante reproducción normal */}
      <div
        ref={loopOverlayRef}
        className="absolute inset-0 z-[4] bg-black pointer-events-none"
        style={{ opacity: 0 }}
      />

      {/* Film grain — siempre sobre el video, efecto película 35mm */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
          opacity: 0.22,
          mixBlendMode: "overlay",
        }}
      />

      {/* Overlay gradiente — más profundidad que el flat bg-black/40 */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-black/50 to-black/20" />

      {/* Overlay radial — oscurece selectivamente la zona central del texto */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 60%, rgba(0,0,0,0.5) 0%, transparent 100%)",
        }}
      />

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
            className="mb-6 text-xs uppercase tracking-[0.35em] text-[#a89f90]"
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
            className="mt-8 text-lg sm:text-xl text-[#a89f90] max-w-xl leading-relaxed font-light"
          >
            {subtitle}
          </motion.p>
        )}

        {manifesto && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.75 }}
            className={`mt-10 ${align === "center" ? "mx-auto" : ""} max-w-sm`}
          >
            <div aria-hidden="true" className="w-6 h-px bg-[#2a2722] mb-4" />
            <p className="text-sm italic font-light text-[#a89f90] leading-relaxed tracking-wide">
              &ldquo;{manifesto}&rdquo;
            </p>
          </motion.div>
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
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-[#e8e0d2] hover:text-[#e8e0d2] transition-colors duration-300 group"
            >
              <span aria-hidden="true" className="w-6 h-px bg-[#8a7f72] group-hover:w-10 group-hover:bg-white transition-all duration-500" />
              {ctaText}
            </button>

            {secondaryCtaText && (
              onSecondaryCtaClick ? (
                <button
                  onClick={onSecondaryCtaClick}
                  className="text-[10px] uppercase tracking-[0.3em] text-[#8a7f72] hover:text-[#a89f90] transition-colors duration-300"
                >
                  {secondaryCtaText}
                </button>
              ) : secondaryCtaLink ? (
                <Link
                  href={secondaryCtaLink}
                  className="text-[10px] uppercase tracking-[0.3em] text-[#8a7f72] hover:text-[#a89f90] transition-colors duration-300"
                >
                  {secondaryCtaText}
                </Link>
              ) : null
            )}
          </motion.div>
        )}
      </div>

      {/* Scroll indicator — Mouse Outline */}
      {scrollIndicator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3"
        >
          <div className="w-[22px] h-[36px] rounded-[11px] border-[1.5px] border-[#8a7f72] flex justify-center">
            <motion.div
              animate={prefersReduced ? {} : { y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={prefersReduced ? {} : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-[2px] h-[6px] bg-[#c8956c] rounded-sm mt-2"
            />
          </div>
          <span className="text-xs uppercase tracking-[0.35em] text-[#8a7f72]">
            Scroll
          </span>
        </motion.div>
      )}
    </section>
  );
};

/* ===============================
   Helpers
================================= */
function getOpenStatus(): { open: boolean; label: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  const total = h * 60 + m;
  const open = total >= 600 && total < 1200;
  return {
    open,
    label: open
      ? "Abierto · cierra a las 20:00"
      : total < 600
      ? "Cerrado · abre a las 10:00"
      : "Cerrado · abre mañana a las 10:00",
  };
}

/* ===============================
   Loyalty Section (usuario nuevo)
   — Componente separado para evitar bug de hidratacion
   donde React/Framer Motion elimina wrapper divs
================================= */
const LoyaltySection = ({
  rewardStamps,
  rewardIllustration,
}: {
  rewardStamps: number;
  rewardIllustration: IllustrationId;
}) => {
  const steps = [
    {
      step: "01",
      title: "Regístrate",
      desc: "Solo necesitas tu WhatsApp. Tu tarjeta digital se crea al instante.",
    },
    {
      step: "02",
      title: "Acumula",
      desc: "Con cada compra, el barista agrega un sello a tu tarjeta.",
    },
    {
      step: "03",
      title: "Disfruta",
      desc: `Al juntar ${rewardStamps} sellos, tu siguiente bebida va por la casa.`,
    },
  ];

  return (
    <section className="snap-start min-h-[100dvh] flex flex-col items-center justify-center bg-[#0c0b09] px-6 sm:px-10 py-16 sm:py-20 relative overflow-hidden">
      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row lg:items-center lg:gap-16 xl:gap-24">
        {/* Columna izquierda: texto + pasos */}
        <div className="flex flex-col items-center lg:items-start lg:flex-1">
          {/* Linea decorativa */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-12 h-px bg-[#c8956c] mb-8 sm:mb-10 origin-center lg:origin-left"
          />

          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-xs uppercase tracking-[0.45em] text-[#a89f90] mb-4 sm:mb-5"
          >
            Programa de fidelidad
          </motion.p>

          {/* Titulo */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-light text-[#e8e0d2] text-center lg:text-left tracking-wide mb-3 sm:mb-4"
          >
            Lo que se da, vuelve
          </motion.h2>

          {/* Subtitulo */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-sm sm:text-base text-[#a89f90] text-center lg:text-left max-w-md leading-relaxed mb-8 sm:mb-10"
          >
            {`Junta ${rewardStamps} sellos y tu siguiente bebida va por la casa.`}
          </motion.p>

          {/* Animacion -- solo mobile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 sm:mb-10 lg:hidden"
          >
            <HowItWorksAnimation maxStamps={rewardStamps} illustrationId={rewardIllustration} />
          </motion.div>

          {/* 3 pasos */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-4 sm:gap-8 lg:gap-5 max-w-2xl lg:max-w-md w-full mb-8 sm:mb-10">
            {steps.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-2 lg:gap-4"
              >
                <span className="w-7 h-7 rounded-full border border-[#c8956c]/30 flex items-center justify-center text-xs font-mono tracking-wider text-[#c8956c]/70 shrink-0 leading-none">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-light text-[#e8e0d2] tracking-wide">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#a89f90] leading-relaxed max-w-[180px] mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col items-center lg:items-start gap-3"
          >
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full border border-[#c8956c]/30 text-xs uppercase tracking-[0.3em] text-[#c8956c] hover:bg-[#c8956c]/10 hover:border-[#c8956c]/50 transition-all duration-500"
            >
              Registrar mi tarjeta
              <span aria-hidden="true" className="w-4 h-px bg-[#c8956c]" />
            </Link>
            <Link
              href="/recover"
              className="text-xs uppercase tracking-[0.3em] text-[#8a7f72] hover:text-[#a89f90] transition-colors duration-300"
            >
              Ya tengo cuenta
            </Link>
          </motion.div>
        </div>

        {/* Columna derecha: animacion grande -- solo desktop */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-1 items-center justify-center"
        >
          <div className="scale-[1.6] xl:scale-[1.8]">
            <HowItWorksAnimation maxStamps={rewardStamps} illustrationId={rewardIllustration} />
          </div>
        </motion.div>
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
  const [openStatus, setOpenStatus] = useState<{ open: boolean; label: string } | null>(null);
  const [rewardIllustration, setRewardIllustration] = useState<IllustrationId>("flat-white-cenital");
  const [rewardStamps, setRewardStamps] = useState(5);

  useEffect(() => {
    setCardId(localStorage.getItem("cardId"));
    setOpenStatus(getOpenStatus());

    // Traer ilustración y sellos de la recompensa activa
    getDefaultReward()
      .then((reward) => {
        if (reward) {
          setRewardIllustration(reward.illustration);
          setRewardStamps(reward.requiredStamps);
        }
      })
      .catch(() => {/* fallback a flat-white-cenital / 5 sellos */});
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
    <main id="main-content" className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory bg-[#0c0b09]">
      <SplashScreen />

      {/* Nav editorial — fijo arriba */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-5">
        <span className="font-mono text-xs font-medium tracking-[0.25em] uppercase text-[#e8e0d2]">
          La Commune
        </span>
        <div className="hidden sm:flex gap-8">
          {[
            { label: "Menú", href: "/menu" },
            { label: "Fidelidad", href: loyaltyCta.link },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono text-xs tracking-[0.12em] uppercase text-[#a89f90] hover:text-[#c8956c] transition-colors duration-300 relative group"
            >
              {item.label}
              <span className="absolute bottom-[-2px] left-0 w-0 h-px bg-[#c8956c] group-hover:w-full transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]" />
            </Link>
          ))}
        </div>
      </nav>

      {/* Hero — centrado, marca como eyebrow */}
      <PremiumSection
        eyebrow="Hidalgo, MX"
        title={`Café\nen común`}
        subtitle="Un espacio que pertenece a los que están."
        videoSrc="/videos/coffee-free.mp4"
        videoPoster="/images/poster-hero.jpg"
        ctaText="Ver menú"
        ctaLink="/menu"
        scrollIndicator
      />
    

      {/* Sección fidelidad — condicional según estado del usuario */}
      {cardId ? (
        /* Usuario registrado → video cinematográfico + CTA directo */
        <PremiumSection
          eyebrow="Programa de fidelidad"
          title={`Lo que se da\nvuelve`}
          subtitle={`Junta ${rewardStamps} sellos y tu siguiente bebida va por la casa.`}
          videoSrc="/videos/coffee-slow.mp4"
          videoPoster="/images/poster-loyalty.jpg"
          ctaText="Ver mi tarjeta"
          ctaLink={`/card/${cardId}`}
          secondaryCtaText="No es mi tarjeta"
          onSecondaryCtaClick={handleClearSession}
          align="left"
          lazy
        />
      ) : (
        <LoyaltySection rewardStamps={rewardStamps} rewardIllustration={rewardIllustration} />
      )}

      {/* Footer — limpio, editorial */}
      <footer className="snap-start min-h-[100dvh] flex flex-col items-center justify-center bg-[#0c0b09] px-8 relative">
        {/* Grano decorativo */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative z-10 w-full max-w-5xl"
        >
          {/* Mobile: columna centrada / Desktop: 3 columnas */}
          <div className="flex flex-col items-center text-center desktop-footer">

            {/* Columna 1: Marca */}
            <div className="desktop-footer-col">
              <p className="font-display text-3xl sm:text-4xl font-light tracking-[0.25em] text-[#e8e0d2]">
                La Commune
              </p>
              <p className="text-xs uppercase tracking-[0.4em] text-[#8a7f72] mt-2">
                Café · Comunidad · Hidalgo
              </p>
              <div aria-hidden="true" className="w-8 h-px bg-[#c8956c] mt-6 mb-8 mx-auto" />
            </div>

            {/* Columna 2: Horario + ubicacion */}
            <div className="desktop-footer-col">
              <p className="text-sm text-[#a89f90] tracking-wide">
                Todos los días · 10:00 - 20:00
              </p>
              {openStatus && (
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      openStatus.open ? "bg-emerald-400" : "bg-red-500"
                    }`}
                  />
                  <p className="text-xs tracking-wide text-[#a89f90]">
                    {openStatus.label}
                  </p>
                </div>
              )}

              {/* <a
                href="https://maps.google.com/?q=La+Commune+Cafe,+Mineral+de+la+Reforma,+Hidalgo"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 group block"
              >
                <p className="text-sm text-[#a89f90] group-hover:text-[#e8e0d2] transition-colors duration-300">
                  Mineral de la Reforma, Hidalgo
                </p>
                <p className="text-xs uppercase tracking-[0.25em] text-[#8a7f72] group-hover:text-[#a89f90] transition-colors duration-300 mt-2">
                  Cómo llegar &rarr;
                </p>
              </a> */}
            </div>

            {/* Columna 3: Links */}
            <div className="mt-10 flex flex-col items-center gap-4 desktop-footer-links">
              <Link
                href="/menu"
                className="text-xs uppercase tracking-[0.25em] text-[#a89f90] hover:text-[#c8956c] transition-colors duration-300"
              >
                Menú
              </Link>
              <Link
                href={loyaltyCta.link}
                className="text-xs uppercase tracking-[0.25em] text-[#a89f90] hover:text-[#c8956c] transition-colors duration-300"
              >
                Fidelidad
              </Link>
              <Link
                href="/admin"
                className="text-xs uppercase tracking-[0.25em] text-[#8a7f72] hover:text-[#a89f90] transition-colors duration-300"
              >
                Personal
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-16 flex justify-center desktop-footer-copy">
            <p className="text-xs tracking-[0.3em] uppercase text-[#8a7f72]" suppressHydrationWarning>
              &copy; {new Date().getFullYear()} La Commune
            </p>
          </div>
        </motion.div>
      </footer>
    </main>
  );
}
