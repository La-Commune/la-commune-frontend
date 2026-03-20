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
import { SplashScreen } from "@/components/ui/SplashScreen";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
  const loopOverlayRef = useRef<HTMLDivElement>(null);
  const loopFadingOut = useRef(false);
  const rafRef = useRef<number | null>(null);
  const FADE_SECS = 1.8;
  const prefersReduced = useReducedMotion();

  // rAF a 60 fps — lee currentTime cada frame para opacidad perfectamente continua
  useEffect(() => {
    const tick = () => {
      const video = videoRef.current;
      const overlay = loopOverlayRef.current;
      if (video && overlay && !loopFadingOut.current && video.duration) {
        const timeLeft = video.duration - video.currentTime;
        if (timeLeft <= FADE_SECS) {
          overlay.style.opacity = String(Math.min(1, 1 - timeLeft / FADE_SECS));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
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
          preload={lazy ? "none" : "auto"}
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
        aria-live="polite"
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

        {manifesto && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.75 }}
            className={`mt-10 ${align === "center" ? "mx-auto" : ""} max-w-sm`}
          >
            <div aria-hidden="true" className="w-6 h-px bg-stone-700 mb-4" />
            <p className="text-[13px] italic font-light text-stone-500 leading-relaxed tracking-wide">
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
              className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-stone-200 hover:text-white transition-colors duration-300 group"
            >
              <span aria-hidden="true" className="w-6 h-px bg-stone-400 group-hover:w-10 group-hover:bg-white transition-all duration-500" />
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

      {/* Scroll indicator */}
      {scrollIndicator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-stone-400">
            Scroll
          </span>
          <motion.div
            animate={prefersReduced ? {} : { y: [0, 6, 0] }}
            transition={prefersReduced ? {} : { duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-6 bg-gradient-to-b from-stone-400 to-transparent"
          />
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
   MAIN
================================= */
export default function Home() {
  const router = useRouter();
  const [cardId, setCardId] = useState<string | null>(null);
  const [openStatus, setOpenStatus] = useState<{ open: boolean; label: string } | null>(null);

  useEffect(() => {
    setCardId(localStorage.getItem("cardId"));
    setOpenStatus(getOpenStatus());
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
    <main id="main-content" className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory bg-neutral-950">
      <SplashScreen />

      {/* Hero — centrado, marca como eyebrow */}
      <PremiumSection
        eyebrow="La Commune"
        title={`Café\nen común`}
        subtitle="Un espacio que pertenece a los que están."
        videoSrc="/videos/coffee-free.mp4"
        videoPoster="/images/poster-hero.jpg"
        ctaText="Ver menú"
        ctaLink="/menu"
        scrollIndicator
      />
    

      {/* Segunda sección — fidelidad, alineada a la izquierda */}
      <PremiumSection
        eyebrow="Para los que construyen"
        title={`Lo que se da\nvuelve`}
        subtitle="Cada visita es un ladrillo. A la quinta, la casa te devuelve algo."
        videoSrc="/videos/coffee-slow.mp4"
        videoPoster="/images/poster-loyalty.jpg"
        ctaText={loyaltyCta.text}
        ctaLink={loyaltyCta.link}
        secondaryCtaText={cardId ? "No es mi tarjeta" : "Ya tengo cuenta"}
        secondaryCtaLink={cardId ? undefined : "/recover"}
        onSecondaryCtaClick={cardId ? handleClearSession : undefined}
        align="left"
        lazy
      />

      {/* Storytelling — identidad de marca. Opción 1: todo en sección */}
      {/* TODO: Reactivar cuando se tenga el contenido en instagram y algo consolidado */}
      {/* <PremiumSection
        eyebrow="La Commune"
        title={`Sin trucos.\nSolo oficio.`}
        subtitle="La Commune es el nombre que le ponemos al esfuerzo compartido detrás de cada taza."
        manifesto="El café es el pretexto. La comunidad, el punto."
        videoSrc="/videos/coffee-black-white.mp4"
        videoPoster="/images/poster-storytelling.jpg"
        ctaText="Nuestra historia"
        ctaLink="/nosotros"
        align="center"
        lazy
      /> */}

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
            <div aria-hidden="true" className="w-6 h-px bg-stone-700 mx-auto mt-5" />
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
                  <p className="text-sm text-stone-200 mt-0.5">10:00 – 20:00</p>
                </div>
                <div>
                  <p className="text-[11px] text-stone-500 uppercase tracking-wider">Sáb – Dom</p>
                  <p className="text-sm text-stone-200 mt-0.5">10:00 – 20:00</p>
                </div>
              </div>
              {openStatus && (
                <div className="flex items-center gap-2 mt-5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      openStatus.open ? "bg-emerald-400" : "bg-red-500"
                    }`}
                  />
                  <p className="text-[10px] tracking-wide text-stone-500">
                    {openStatus.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500 mb-5">
                Encuéntranos
              </p>
              <a
                href="https://maps.google.com/?q=Santa+Natividad+135,+La+Providencia,+Mineral+de+la+Reforma,+Hidalgo"
                target="_blank"
                rel="noopener noreferrer"
                className="group block space-y-1"
              >
                <p className="text-sm text-stone-200 group-hover:text-white transition-colors duration-300">
                  Santa Natividad 135
                </p>
                <p className="text-[11px] text-stone-500">Col. La Providencia</p>
                <p className="text-[11px] text-stone-500">Mineral de la Reforma, Hidalgo</p>
                <p className="text-[10px] uppercase tracking-[0.25em] text-stone-600 group-hover:text-stone-400 transition-colors duration-300 mt-2">
                  Cómo llegar →
                </p>
              </a>
            </div>
          </div>

          {/* Métodos de pago */}
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.35em] text-stone-500 mb-5">
              Pagos
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                <span className="text-sm text-stone-200">Efectivo</span>
              </div>
              <span className="w-px h-3 bg-stone-800" />
              <div className="flex items-center gap-2">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                <span className="text-sm text-stone-200">Tarjeta</span>
                <span className="text-[10px] uppercase tracking-wider text-stone-500">vía Mercado Pago</span>
              </div>
            </div>
          </div>

          {/* Divisor + copyright + links */}
          <div className="border-t border-stone-800 pt-6 flex flex-col items-center gap-3">
            <p className="text-[10px] tracking-[0.3em] uppercase text-stone-600 text-center" suppressHydrationWarning>
              © {new Date().getFullYear()} · La Commune · En construcción permanente
            </p>
            <nav aria-label="Enlaces del pie de página" className="flex items-center justify-center gap-0">
              <Link href="/menu" className="text-[10px] tracking-[0.25em] uppercase text-stone-700 hover:text-stone-400 transition-colors duration-300">
                Menú
              </Link>
              <span className="w-px h-3 bg-stone-800 mx-5" />
              <Link href="/card/preview" className="text-[10px] tracking-[0.25em] uppercase text-stone-700 hover:text-stone-400 transition-colors duration-300">
                Simulador de tarjeta
              </Link>
              <span className="hidden sm:block w-px h-3 bg-stone-800 mx-5" />
              <Link href="/onboarding" className="hidden sm:block text-[10px] tracking-[0.25em] uppercase text-stone-700 hover:text-stone-400 transition-colors duration-300">
                Registrarse
              </Link>
              <span className="hidden sm:block w-px h-3 bg-stone-800 mx-5" />
              <Link href="/recover" className="hidden sm:block text-[10px] tracking-[0.25em] uppercase text-stone-700 hover:text-stone-400 transition-colors duration-300">
                Recuperar tarjeta
              </Link>
              <span className="hidden sm:block w-px h-3 bg-stone-800 mx-5" />
              <a
                href="https://wa.me/527711006533"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir WhatsApp de La Commune"
                className="hidden sm:block text-[10px] tracking-[0.25em] uppercase text-stone-700 hover:text-stone-400 transition-colors duration-300"
              >
                WhatsApp
              </a>
            </nav>
            {/* Acceso discreto para personal */}
            <Link
              href="/admin"
              className="mt-2 text-[10px] tracking-[0.3em] uppercase text-stone-800 hover:text-stone-600 transition-colors duration-300"
            >
              Personal
            </Link>
          </div>
        </motion.div>
      </footer>
    </main>
  );
}
