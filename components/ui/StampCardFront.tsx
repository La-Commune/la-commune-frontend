"use client";

import { Card, TarjetaRow, mapTarjetaToCard } from "@/models/card.model";
import { Reward, RecompensaRow, mapRecompensaToReward } from "@/models/reward.model";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";

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

/** Milestone types for progress psychology */
type MilestoneType = "welcome" | "first" | "halfway" | "almost" | "complete" | null;

function getMilestoneType(stamps: number, maxStamps: number): MilestoneType {
  if (stamps >= maxStamps) return "complete";
  if (stamps === maxStamps - 1) return "almost";
  if (stamps === Math.floor(maxStamps / 2)) return "halfway";
  if (stamps === 1) return "first";
  if (stamps === 0) return "welcome";
  return null;
}

export function StampCardFront({
  cardId,
  onComplete,
  onStampAdded,
}: {
  cardId: string;
  onComplete: () => void;
  onStampAdded: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [card, setCard] = useState<Card | undefined>(undefined);
  const [reward, setReward] = useState<Reward | undefined>(undefined);

  // Realtime + fetch inicial de la tarjeta
  useEffect(() => {
    const sb = getSupabase();
    const channel = sb
      .channel(`card-front-${cardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tarjetas", filter: `id=eq.${cardId}` },
        (payload) => {
          setCard(mapTarjetaToCard(payload.new as TarjetaRow));
        }
      )
      .subscribe();

    sb.from("tarjetas")
      .select("*")
      .eq("id", cardId)
      .single()
      .then(({ data }) => {
        if (data) setCard(mapTarjetaToCard(data as TarjetaRow));
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [cardId]);

  // Realtime + fetch de la recompensa asociada a la tarjeta
  const rewardId = card?.rewardId;
  useEffect(() => {
    if (!rewardId) return;

    const sb = getSupabase();
    const channel = sb
      .channel(`reward-${rewardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recompensas", filter: `id=eq.${rewardId}` },
        (payload) => {
          setReward(mapRecompensaToReward(payload.new as RecompensaRow));
        }
      )
      .subscribe();

    sb.from("recompensas")
      .select("*")
      .eq("id", rewardId)
      .single()
      .then(({ data }) => {
        if (data) setReward(mapRecompensaToReward(data as RecompensaRow));
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [rewardId]);

  const rewardName = reward?.name ?? "Bebida de cortesía";

  // Último evento de sello — para mensajes personalizados con nombre de bebida
  const [lastDrink, setLastDrink] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) return;

    const sb = getSupabase();

    // Fetch inicial del último evento
    sb.from("eventos_sello")
      .select("tipo_bebida")
      .eq("negocio_id", NEGOCIO_ID)
      .eq("tarjeta_id", cardId)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.tipo_bebida) setLastDrink(data.tipo_bebida);
      });

    // Realtime: actualizar cuando se agrega un nuevo sello
    const channel = sb
      .channel(`stamps-${cardId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "eventos_sello",
          filter: `tarjeta_id=eq.${cardId}`,
        },
        (payload) => {
          const drink = (payload.new as Record<string, unknown>).tipo_bebida as string | null;
          if (drink) setLastDrink(drink);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [cardId]);

  const hasCompletedRef = useRef(false);
  const prevStampsRef = useRef<number | undefined>(undefined);
  const [isNewStamp, setIsNewStamp] = useState(false);

  // Track milestone celebrations
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState<MilestoneType>(null);

  const stamps = card?.stamps ?? 0;
  const maxStamps = card?.maxStamps ?? 5;
  const animatedStamps = useCountUp(stamps);
  const isComplete = card ? stamps >= maxStamps : false;
  const remaining = card ? maxStamps - stamps : 0;
  const milestone = card ? getMilestoneType(stamps, maxStamps) : null;

  // Fill radius: maps 0..maxStamps to 0..58 (cup inner radius)
  const CUP_RADIUS = 58;
  const fillRadius = card ? (stamps / maxStamps) * CUP_RADIUS : 0;

  // Mensajes personalizados con nombre de bebida
  const drinkLabel = lastDrink ? `¡Tu ${lastDrink} sumó!` : null;

  const progressMessage = card
    ? stamps >= maxStamps
      ? `¡${rewardName} lista!`
      : stamps === maxStamps - 1
        ? drinkLabel
          ? `${drinkLabel} ¡Solo falta uno!`
          : "¡Solo falta uno!"
        : stamps === Math.floor(maxStamps / 2)
          ? drinkLabel
            ? `${drinkLabel} ¡Ya vas a la mitad!`
            : "¡Ya vas a la mitad!"
          : stamps === 1
            ? drinkLabel
              ? `${drinkLabel} ¡Primer sello!`
              : "¡Primer sello!"
            : stamps > 1
              ? drinkLabel
                ? `${drinkLabel} Te faltan ${remaining}`
                : "¡Vas avanzando!"
              : "Pide tu primer café"
    : null;

  // Emoji for milestone celebration
  const milestoneEmoji = milestone === "complete"
    ? "🎉"
    : milestone === "almost"
      ? "🔥"
      : milestone === "halfway"
        ? "⚡"
        : milestone === "first"
          ? "☕"
          : null;

  // Detectar sello nuevo y trigger celebración
  useEffect(() => {
    if (!card) return;
    const prev = prevStampsRef.current;
    prevStampsRef.current = card.stamps;

    if (prev !== undefined && card.stamps > prev) {
      setIsNewStamp(true);
      onStampAdded();

      // Trigger milestone celebration
      const newMilestone = getMilestoneType(card.stamps, card.maxStamps);
      if (newMilestone && newMilestone !== "welcome") {
        setShowMilestoneCelebration(newMilestone);
        const celebTimer = setTimeout(() => setShowMilestoneCelebration(null), 2800);
        const stampTimer = setTimeout(() => setIsNewStamp(false), 1200);
        return () => {
          clearTimeout(celebTimer);
          clearTimeout(stampTimer);
        };
      }

      const t = setTimeout(() => setIsNewStamp(false), 1200);
      return () => clearTimeout(t);
    }
  }, [card?.stamps, onStampAdded]);

  // Detectar tarjeta completada
  useEffect(() => {
    if (isComplete && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete();
    }
  }, [isComplete, onComplete]);

  if (!card) return null;

  // Colors
  const cupStroke = isDark ? "#4a4240" : "#c7b7a3";
  const plateStroke = isDark ? "#3a3630" : "#d8d0c8";
  const handleStroke = isDark ? "#4a4240" : "#c7b7a3";
  const emptyFill = isDark ? "#1a1412" : "#f0e9e0";
  const labelColor = isDark ? "#7A706A" : "#A89E97";
  const textColor = isDark ? "#E8DDD5" : "#2B2B2B";
  const brandColor = isDark ? "#D4C8BE" : "#2B2B2B";
  const accentColor = isDark ? "#C4954A" : "#8b6b3d";

  return (
    <div
      className="absolute inset-0 backface-hidden rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.14)] flex flex-col"
      style={{
        background: isDark
          ? "linear-gradient(145deg, #1A1412 0%, #2A2220 100%)"
          : "linear-gradient(145deg, #FAF7F4 0%, #F0E9E0 100%)",
        color: textColor,
      }}
    >
      {/* Header con marca */}
      <div
        className="flex items-center justify-between px-5 pt-4 pb-3"
        style={{ borderBottom: `1px solid ${isDark ? "#2a2722" : "#E8E0D8"}` }}
      >
        <p
          className="text-[12px] font-light tracking-[0.3em] uppercase"
          style={{ fontFamily: "var(--font-display)", color: brandColor }}
        >
          La Commune
        </p>
        <p className="text-[9px] tracking-widest uppercase" style={{ color: labelColor }}>
          {isComplete ? "Completada" : "Fidelidad"}
        </p>
      </div>

      {/* Taza cenital — vista desde arriba */}
      <div className="flex-1 flex items-center justify-center relative">
        <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
          <defs>
            {/* Gradiente radial del café */}
            <radialGradient id="coffeeFill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isDark ? "#5a3f20" : "#8b6b3d"} />
              <stop offset="55%" stopColor={isDark ? "#8b6b3d" : "#a07850"} />
              <stop offset="85%" stopColor={isDark ? "#c8956c" : "#c8956c"} />
              <stop offset="100%" stopColor={isDark ? "#a07850" : "#b08860"} />
            </radialGradient>
            {/* Clip para el líquido dentro de la taza */}
            <clipPath id="cupClip">
              <circle cx="90" cy="90" r="58" />
            </clipPath>
            {/* Glow para completado */}
            <filter id="completeGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Platito */}
          <circle cx="90" cy="90" r="78" fill="none" stroke={plateStroke} strokeWidth="1.5" />

          {/* Borde de la taza */}
          <circle
            cx="90" cy="90" r="62"
            fill="none"
            stroke={cupStroke}
            strokeWidth="2.5"
            filter={isComplete ? "url(#completeGlow)" : undefined}
          />

          {/* Interior vacío */}
          <circle cx="90" cy="90" r="58" fill={emptyFill} />

          {/* Asa — vista superior */}
          <path
            d="M148 78 Q170 78 170 90 Q170 102 148 102"
            fill="none"
            stroke={handleStroke}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Líquido — círculo que crece con cada sello */}
          <motion.circle
            cx={90}
            cy={90}
            fill="url(#coffeeFill)"
            clipPath="url(#cupClip)"
            initial={{ r: 0 }}
            animate={{ r: fillRadius }}
            transition={{
              duration: isNewStamp ? 0.8 : 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
          />

          {/* Ripple cuando se agrega un sello nuevo */}
          <AnimatePresence>
            {isNewStamp && (
              <motion.circle
                cx={90}
                cy={90}
                r={fillRadius}
                fill="none"
                stroke={isDark ? "#c8956c" : "#8b6b3d"}
                strokeWidth={1.5}
                clipPath="url(#cupClip)"
                initial={{ r: fillRadius * 0.5, opacity: 0.8 }}
                animate={{ r: fillRadius + 8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* Latte art rosetta — solo cuando completa */}
          {isComplete && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <path
                d="M90 65 Q78 76 90 82 Q102 76 90 65Z"
                fill="none"
                stroke={isDark ? "#e8ddd5" : "#f5f0ea"}
                strokeWidth="0.8"
                opacity="0.5"
              />
              <path
                d="M90 74 Q80 83 90 88 Q100 83 90 74Z"
                fill="none"
                stroke={isDark ? "#e8ddd5" : "#f5f0ea"}
                strokeWidth="0.7"
                opacity="0.4"
              />
              <path
                d="M90 83 Q83 90 90 95 Q97 90 90 83Z"
                fill="none"
                stroke={isDark ? "#e8ddd5" : "#f5f0ea"}
                strokeWidth="0.6"
                opacity="0.35"
              />
              <line
                x1="90" y1="95" x2="90" y2="112"
                stroke={isDark ? "#e8ddd5" : "#f5f0ea"}
                strokeWidth="0.6"
                opacity="0.3"
              />
            </motion.g>
          )}

          {/* Conteo central — cuando está vacía o pocos sellos */}
          {!isComplete && stamps < maxStamps && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: stamps === 0 ? 0.6 : 0.9 }}
              transition={{ duration: 0.4 }}
            >
              <text
                x="90" y="85"
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: stamps === 0 ? "28px" : "34px",
                  fill: stamps === 0
                    ? (isDark ? "#3a3630" : "#c7b7a3")
                    : (isDark ? "#1a1412" : "#f5f0ea"),
                  fontWeight: 300,
                }}
              >
                {animatedStamps}
              </text>
              <text
                x="90" y="106"
                textAnchor="middle"
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "5.5px",
                  fill: stamps === 0
                    ? (isDark ? "#2a2722" : "#d8d0c8")
                    : (isDark ? "#1a1412" : "#f5f0ea"),
                  letterSpacing: "2.5px",
                  textTransform: "uppercase" as const,
                  opacity: 0.7,
                }}
              >
                de {maxStamps}
              </text>
            </motion.g>
          )}

          {/* Check cuando completa */}
          {isComplete && (
            <motion.text
              x="90" y="87"
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                fill: isDark ? "#1a1412" : "#f5f0ea",
                fontWeight: 300,
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.7, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              ✓
            </motion.text>
          )}
        </svg>
      </div>

      {/* Progress message + conteo */}
      <div className="px-5 pb-4 space-y-1.5">
        {/* Message */}
        <div className="relative min-h-[16px]">
          <AnimatePresence mode="wait">
            {showMilestoneCelebration ? (
              <motion.div
                key={`celebration-${showMilestoneCelebration}`}
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-1.5"
              >
                {milestoneEmoji && (
                  <motion.span
                    className="text-sm"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {milestoneEmoji}
                  </motion.span>
                )}
                <p
                  className="text-[10px] tracking-widest uppercase font-medium"
                  style={{ color: accentColor }}
                >
                  {progressMessage}
                </p>
              </motion.div>
            ) : progressMessage ? (
              <motion.p
                key="progress-msg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[10px] tracking-widest uppercase"
                style={{ color: labelColor }}
              >
                {progressMessage}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Counter */}
        <div className="flex justify-between">
          <p className="text-[9px] tracking-widest uppercase" style={{ color: labelColor }}>
            {isComplete
              ? `¡${rewardName}!`
              : `${remaining} restante${remaining !== 1 ? "s" : ""}`}
          </p>
          <p className="text-[9px] tracking-wide" style={{ color: accentColor }}>
            {isComplete ? "Preséntala en barra" : `${stamps} / ${maxStamps}`}
          </p>
        </div>
      </div>
    </div>
  );
}
