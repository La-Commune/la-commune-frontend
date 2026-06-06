"use client";

import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactCanvasConfetti from "react-canvas-confetti";
import { QRCodeCanvas } from "qrcode.react";
import { useTheme } from "next-themes";
import { StampCardFront } from "./StampCardFront";
import { StampCardBack } from "./StampCardBack";
import { StampIllustration, type IllustrationId } from "./stamp-illustrations";
import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import { Card, TarjetaRow, mapTarjetaToCard } from "@/models/card.model";
import { Reward, RecompensaRow, mapRecompensaToReward } from "@/models/reward.model";

type ConfettiInstance = (opts: any) => void;

function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isDesktop;
}

function useCountUp(target: number, duration = 500) {
  const [count, setCount] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    if (prevRef.current === target) return;
    const start = prevRef.current;
    prevRef.current = target;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(start + (target - start) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
}

export function StampCardView({ cardId }: { cardId: string }) {
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stampNotification, setStampNotification] = useState(false);
  const [frontReady, setFrontReady] = useState(true);
  const isDesktop = useIsDesktop();

  const confettiRef = useRef<ConfettiInstance | null>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, []);

  const fireConfetti = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    confettiRef.current?.({
      particleCount: 80,
      spread: 60,
      startVelocity: 25,
      origin: { y: 0.65 },
      colors: ["#2B2B2B", "#8A817A", "#C7B7A3"],
      scalar: 0.9,
    });
  }, []);

  const handleComplete = useCallback(() => {
    if (completed) return;
    setCompleted(true);
    if ("vibrate" in navigator) navigator.vibrate([50, 30, 100]);
    fireConfetti();
  }, [completed, fireConfetti]);

  const handleStampAdded = useCallback(() => {
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    if (animTimerRef.current) clearTimeout(animTimerRef.current);

    if ("vibrate" in navigator) navigator.vibrate(80);
    setStampNotification(true);

    if (isDesktop) {
      setFrontReady(false);
      animTimerRef.current = setTimeout(() => setFrontReady(true), 300);
    } else {
      setFrontReady(false);
      flipTimerRef.current = setTimeout(() => {
        setFlipped(false);
        animTimerRef.current = setTimeout(() => setFrontReady(true), 650);
      }, 300);
    }

    notifTimerRef.current = setTimeout(() => setStampNotification(false), 2500);
  }, [isDesktop]);

  const handleFlip = () => {
    if (!isDesktop) setFlipped((f) => !f);
  };

  // Swipe horizontal para voltear
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swipeThreshold = 40;
    if (Math.abs(info.offset.x) > swipeThreshold && Math.abs(info.velocity.x) > 100) {
      handleFlip();
    }
  };

  if (isDesktop) {
    return (
      <DesktopCinematicView
        cardId={cardId}
        completed={completed}
        stampNotification={stampNotification}
        frontReady={frontReady}
        onComplete={handleComplete}
        onStampAdded={handleStampAdded}
        confettiRef={confettiRef}
      />
    );
  }

  // Mobile: card con flip 3D
  return (
    <div className="relative flex flex-col items-center gap-3">
      <ReactCanvasConfetti
        onInit={({ confetti }) => { confettiRef.current = confetti; }}
        style={{ position: "fixed", pointerEvents: "none", width: "100%", height: "100%", top: 0, left: 0, zIndex: 50 }}
      />
      <motion.div
        className="w-[300px] h-[380px] mx-auto perspective cursor-pointer touch-pan-y"
        whileTap={{ scale: 0.97 }}
        animate={completed ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 0.4 }}
        onClick={handleFlip}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformStyle: "preserve-3d" }}
        >
          <StampCardFront cardId={cardId} onComplete={handleComplete} onStampAdded={handleStampAdded} frontReady={frontReady} />
          <StampCardBack cardId={cardId} />
        </motion.div>
      </motion.div>
      <AnimatePresence mode="wait">
        {stampNotification ? (
          <motion.p key="stamp-notif" role="status" aria-live="polite" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3 }} className="text-xs uppercase tracking-[0.3em] text-stone-600 dark:text-stone-300">Sello anadido</motion.p>
        ) : !flipped ? (
          <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, delay: 0.6 }} className="text-xs uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">Desliza o toca para ver tu QR</motion.p>
        ) : (
          <motion.p key="hint-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="text-xs uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">Desliza o toca para volver</motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Desktop Cinematic View — Awwwards-level experience

   La ilustracion SVG de la taza llenandose es el HERO visual.
   Tipografia editorial gigante muestra el progreso.
   QR integrado como elemento secundario elegante.
═══════════════════════════════════════════════════════════════ */
function DesktopCinematicView({
  cardId,
  completed,
  stampNotification,
  frontReady,
  onComplete,
  onStampAdded,
  confettiRef,
}: {
  cardId: string;
  completed: boolean;
  stampNotification: boolean;
  frontReady: boolean;
  onComplete: () => void;
  onStampAdded: () => void;
  confettiRef: React.MutableRefObject<ConfettiInstance | null>;
}) {
  const [origin, setOrigin] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Card + reward data (same realtime logic as StampCardFront)
  const [card, setCard] = useState<Card | undefined>(undefined);
  const [reward, setReward] = useState<Reward | undefined>(undefined);
  const [lastDrink, setLastDrink] = useState<string | null>(null);
  const hasCompletedRef = useRef(false);
  const prevStampsRef = useRef<number | undefined>(undefined);
  const [isNewStamp, setIsNewStamp] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => { window.removeEventListener("offline", goOffline); window.removeEventListener("online", goOnline); };
  }, []);

  // Fetch card realtime
  useEffect(() => {
    const sb = getSupabase();
    const channel = sb.channel(`desktop-card-${cardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tarjetas", filter: `id=eq.${cardId}` },
        (payload) => setCard(mapTarjetaToCard(payload.new as TarjetaRow)))
      .subscribe();
    sb.from("tarjetas").select("*").eq("id", cardId).single().then(({ data }) => { if (data) setCard(mapTarjetaToCard(data as TarjetaRow)); });
    return () => { sb.removeChannel(channel); };
  }, [cardId]);

  // Fetch reward realtime
  const rewardId = card?.rewardId;
  useEffect(() => {
    if (!rewardId) return;
    const sb = getSupabase();
    const channel = sb.channel(`desktop-reward-${rewardId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "recompensas", filter: `id=eq.${rewardId}` },
        (payload) => setReward(mapRecompensaToReward(payload.new as RecompensaRow)))
      .subscribe();
    sb.from("recompensas").select("*").eq("id", rewardId).single().then(({ data }) => { if (data) setReward(mapRecompensaToReward(data as RecompensaRow)); });
    return () => { sb.removeChannel(channel); };
  }, [rewardId]);

  // Last drink
  useEffect(() => {
    if (!cardId) return;
    const sb = getSupabase();
    sb.from("eventos_sello").select("tipo_bebida").eq("negocio_id", NEGOCIO_ID).eq("tarjeta_id", cardId).order("creado_en", { ascending: false }).limit(1).maybeSingle().then(({ data }) => { if (data?.tipo_bebida) setLastDrink(data.tipo_bebida); });
    const channel = sb.channel(`desktop-stamps-${cardId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "eventos_sello", filter: `tarjeta_id=eq.${cardId}` },
        (payload) => { const drink = (payload.new as Record<string, unknown>).tipo_bebida as string | null; if (drink) setLastDrink(drink); })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [cardId]);

  const rewardName = reward?.name ?? "Bebida de cortesía";
  const illustrationId: IllustrationId = reward?.illustration ?? "flat-white-cenital";
  const stamps = card?.stamps ?? 0;
  const maxStamps = card?.maxStamps ?? 5;
  const isComplete = card ? stamps >= maxStamps : false;
  const remaining = card ? maxStamps - stamps : 0;

  // Endowed progress
  const BONUS = 1;
  const visualStamps = stamps + BONUS;
  const visualMax = maxStamps + BONUS;
  const [displayedStamps, setDisplayedStamps] = useState(visualStamps);
  const pendingStampsRef = useRef(visualStamps);

  useEffect(() => { pendingStampsRef.current = visualStamps; }, [visualStamps]);
  useEffect(() => { if (frontReady && pendingStampsRef.current !== displayedStamps) setDisplayedStamps(pendingStampsRef.current); }, [frontReady, displayedStamps]);
  useEffect(() => { if (frontReady) setDisplayedStamps(visualStamps); }, [visualStamps, frontReady]);

  const animatedStamps = useCountUp(displayedStamps);
  const CUP_RADIUS = 58;
  const fillRadius = card ? (displayedStamps / visualMax) * CUP_RADIUS : 0;

  // New stamp detection
  useEffect(() => {
    if (prevStampsRef.current !== undefined && stamps > prevStampsRef.current) {
      setIsNewStamp(true);
      onStampAdded();
      setTimeout(() => setIsNewStamp(false), 1200);
    }
    if (!hasCompletedRef.current && isComplete && stamps > 0) {
      hasCompletedRef.current = true;
      onComplete();
    }
    prevStampsRef.current = stamps;
  }, [stamps, isComplete, onStampAdded, onComplete]);

  // Progress message
  const drinkLabel = lastDrink ? `Tu ${lastDrink} sumo` : null;
  const progressMessage = card
    ? isComplete ? `${rewardName} lista` : stamps === maxStamps - 1
      ? "Solo falta uno" : stamps === Math.floor(maxStamps / 2)
        ? "Ya vas a la mitad" : stamps === 1
          ? "Primer sello" : stamps > 1
            ? `Te faltan ${remaining}` : "Pide tu primer cafe"
    : "";

  const accentColor = isDark ? "#C4954A" : "#8b6b3d";

  return (
    <div className="relative w-full max-w-[960px] mx-auto">
      <ReactCanvasConfetti
        onInit={({ confetti }) => { confettiRef.current = confetti; }}
        style={{ position: "fixed", pointerEvents: "none", width: "100%", height: "100%", top: 0, left: 0, zIndex: 50 }}
      />

      <div className="flex flex-row items-center gap-12 lg:gap-16 xl:gap-20">

        {/* ── LEFT: Ilustracion hero ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex items-center justify-center flex-shrink-0 w-[380px] h-[380px]"
        >
          {/* Glow ambiental */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 500,
              height: 500,
              background: isDark
                ? "radial-gradient(circle, rgba(200, 149, 108, 0.04) 0%, rgba(200, 149, 108, 0.02) 40%, transparent 70%)"
                : "radial-gradient(circle, rgba(200, 149, 108, 0.06) 0%, rgba(200, 149, 108, 0.03) 40%, transparent 70%)",
            }}
          />

          {/* Anillo de progreso sutil */}
          <svg className="absolute" width="380" height="380" viewBox="0 0 380 380" style={{ opacity: 0.15 }}>
            <circle cx="190" cy="190" r="175" fill="none" stroke={isDark ? "#2a2722" : "#d8d0c8"} strokeWidth="0.5" />
            <motion.circle
              cx="190" cy="190" r="175"
              fill="none"
              stroke={accentColor}
              strokeWidth="1"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 175}
              initial={{ strokeDashoffset: 2 * Math.PI * 175 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 175 * (1 - (stamps / maxStamps)) }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </svg>

          {/* SVG Ilustracion — escala hero (2x) */}
          <motion.div
            animate={completed ? { scale: [1, 1.04, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="relative z-10"
            style={{ transform: "scale(2)", transformOrigin: "center" }}
          >
            <StampIllustration
              id={illustrationId}
              stamps={visualStamps}
              maxStamps={visualMax}
              displayedStamps={displayedStamps}
              animatedStamps={animatedStamps}
              isComplete={isComplete}
              isNewStamp={isNewStamp}
              isDark={isDark}
              fillRadius={fillRadius}
              realStamps={stamps}
              realMaxStamps={maxStamps}
            />
          </motion.div>
        </motion.div>

        {/* ── RIGHT: Info editorial ── */}
        <div className="flex flex-col items-start flex-1 min-w-0">

          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-xs uppercase tracking-[0.4em] mb-4"
            style={{ color: isDark ? "#6b6458" : "#a89f90" }}
          >
            Programa de fidelidad
          </motion.p>

          {/* Stamp count — tipografia editorial gigante */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex items-baseline gap-3 mb-2"
          >
            <span
              className="font-display leading-none"
              style={{ fontSize: "clamp(4rem, 8vw, 7rem)", color: accentColor }}
            >
              {animatedStamps - BONUS}
            </span>
            <span
              className="text-2xl font-light tracking-wide"
              style={{ fontFamily: "var(--font-display)", color: isDark ? "#4a4240" : "#c7b7a3" }}
            >
              de {maxStamps}
            </span>
          </motion.div>

          {/* Progress message / Sello añadido — mismo espacio, se intercalan */}
          <div className="mb-8 min-h-[28px] flex items-center">
            <AnimatePresence mode="wait">
              {stampNotification ? (
                <motion.div
                  key="stamp-added"
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400"
                >
                  <motion.span
                    className="w-2 h-2 rounded-full bg-emerald-500"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.4, 1] }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  />
                  <span className="text-lg font-light tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                    Sello añadido
                  </span>
                </motion.div>
              ) : (
                <motion.p
                  key={`progress-${progressMessage}`}
                  initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="text-lg font-light tracking-wide"
                  style={{ fontFamily: "var(--font-display)", color: isDark ? "#a89f90" : "#6b6458" }}
                >
                  {progressMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Separador */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="w-12 h-px mb-6 origin-left"
            style={{ background: accentColor, opacity: 0.3 }}
          />

          {/* Reward name */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-xs uppercase tracking-[0.3em] mb-8"
            style={{ color: isDark ? "#6b6458" : "#a89f90" }}
          >
            {isComplete ? "Lista para canjear" : `Recompensa: ${rewardName}`}
          </motion.p>

          {/* QR — expandible al click, se cierra al agregar sello */}
          <ExpandableQR
            origin={origin}
            cardId={cardId}
            isDark={isDark}
            isOffline={isOffline}
            stampAdded={stampNotification}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   QR expandible — click para ampliar
═══════════════════════════════════════════ */
function ExpandableQR({
  origin,
  cardId,
  isDark,
  isOffline,
  stampAdded,
}: {
  origin: string | null;
  cardId: string;
  isDark: boolean;
  isOffline: boolean;
  stampAdded?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Cerrar el modal automáticamente cuando se agrega un sello
  useEffect(() => {
    if (stampAdded && expanded) {
      setExpanded(false);
    }
  }, [stampAdded, expanded]);

  // Cerrar con Escape cuando el QR está expandido
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  if (!origin) return null;

  return (
    <>
      {/* QR compacto — clickeable */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        role="button"
        tabIndex={0}
        aria-label="Ampliar código QR"
        className="flex items-center gap-5 cursor-pointer group"
        onClick={() => setExpanded(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(true);
          }
        }}
      >
        <div
          className="rounded-xl p-2.5 transition-all duration-300 group-hover:shadow-lg"
          style={{
            background: isDark ? "rgba(26, 20, 18, 0.6)" : "rgba(250, 247, 244, 0.8)",
            border: `1px solid ${isDark ? "rgba(74, 63, 58, 0.3)" : "rgba(199, 183, 163, 0.4)"}`,
          }}
        >
          <div className="rounded-lg bg-white p-2">
            <QRCodeCanvas
              value={`${origin}/card/${cardId}`}
              size={80}
              bgColor="#FFFFFF"
              fgColor="#2B2B2B"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm tracking-wide" style={{ color: isDark ? "#a89f90" : "#6b6458" }}>
            {isOffline ? "Sin conexion" : "Presenta en barra"}
          </p>
          <p className="text-xs tracking-wide" style={{ color: isDark ? "#3a3630" : "#c7b7a3" }}>
            Click para ampliar
          </p>
        </div>
      </motion.div>

      {/* Overlay expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="qr-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Código QR"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            style={{ background: isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* QR grande */}
              <div
                className="rounded-2xl p-6 shadow-2xl"
                style={{
                  background: isDark
                    ? "linear-gradient(145deg, #1A1412 0%, #2A2220 100%)"
                    : "linear-gradient(145deg, #FAF7F4 0%, #F0E9E0 100%)",
                  border: `1px solid ${isDark ? "rgba(74, 63, 58, 0.5)" : "rgba(199, 183, 163, 0.5)"}`,
                }}
              >
                <div className="rounded-xl bg-white p-4">
                  <QRCodeCanvas
                    value={`${origin}/card/${cardId}`}
                    size={240}
                    bgColor="#FFFFFF"
                    fgColor="#2B2B2B"
                  />
                </div>
              </div>

              {/* Label */}
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                {isOffline ? "Sin conexion" : "Escanea en barra"}
              </p>

              {/* Cerrar */}
              <button
                onClick={() => setExpanded(false)}
                className="text-xs uppercase tracking-[0.3em] text-white/40 hover:text-white/70 transition-colors mt-2"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
