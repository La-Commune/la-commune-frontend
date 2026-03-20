"use client";

import { Card, TarjetaRow, mapTarjetaToCard } from "@/models/card.model";
import { Reward, RecompensaRow, mapRecompensaToReward } from "@/models/reward.model";
import { CoffeeBean } from "./CoffeeBean";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
      .channel(`card-${cardId}`)
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
  const [newStampIdx, setNewStampIdx] = useState<number | null>(null);

  // Endowed Progress Effect: +1 sello visual de bienvenida
  // Backend: 0/5 real → Frontend: 1/6 visual (primer slot = regalo)
  const visualStamps = (card?.stamps ?? 0) + 1;
  const visualMax = (card?.maxStamps ?? 5) + 1;

  const animatedStamps = useCountUp(visualStamps);
  const isComplete = card ? card.stamps >= card.maxStamps : false;
  const remaining = card ? card.maxStamps - card.stamps : 0;
  const progress = card ? (visualStamps / visualMax) * 100 : 0;

  // Mensajes personalizados con nombre de bebida
  const drinkLabel = lastDrink ? `¡Tu ${lastDrink} sumó!` : null;

  const progressMessage = card
    ? card.stamps >= card.maxStamps
      ? `¡${rewardName} lista!`
      : card.stamps === card.maxStamps - 1
        ? drinkLabel
          ? `${drinkLabel} ¡Solo falta uno!`
          : "¡Solo falta uno!"
        : card.stamps === Math.floor(card.maxStamps / 2)
          ? drinkLabel
            ? `${drinkLabel} ¡Ya vas a la mitad!`
            : "¡Ya vas a la mitad!"
          : card.stamps === 1
            ? drinkLabel
              ? `${drinkLabel} ¡Primer sello!`
              : "¡Primer sello!"
            : card.stamps > 1
              ? drinkLabel
                ? `${drinkLabel} Te faltan ${remaining}`
                : "¡Vas avanzando!"
              : "¡Bienvenido! Pide tu primer café"
    : null;

  // Detectar sello nuevo (el índice visual es +1 por el sello de bienvenida)
  useEffect(() => {
    if (!card) return;
    const prev = prevStampsRef.current;
    prevStampsRef.current = card.stamps;

    if (prev !== undefined && card.stamps > prev) {
      setNewStampIdx(card.stamps); // +1 offset visual (slot 0 = bienvenida)
      onStampAdded();
      const t = setTimeout(() => setNewStampIdx(null), 1200);
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

  return (
    <div
      className="absolute inset-0 backface-hidden rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.14)] flex flex-col"
      style={{
        background: isDark
          ? "linear-gradient(145deg, #1A1412 0%, #2A2220 100%)"
          : "linear-gradient(145deg, #FAF7F4 0%, #F0E9E0 100%)",
        color: isDark ? "#E8DDD5" : "#2B2B2B",
      }}
    >
      {/* Header con marca */}
      <div
        className="flex items-center justify-between px-5 pt-4 pb-3"
        style={{ borderBottom: `1px solid ${isDark ? "#3A3230" : "#E8E0D8"}` }}
      >
        <p
          className="text-[13px] font-light tracking-[0.35em] uppercase"
          style={{ fontFamily: "var(--font-display)", color: isDark ? "#D4C8BE" : "#2B2B2B" }}
        >
          La Commune
        </p>
        <p className="text-[10px] tracking-widest uppercase" style={{ color: isDark ? "#7A706A" : "#A89E97" }}>
          {isComplete ? "Completada" : "Fidelidad"}
        </p>
      </div>

      {/* Título + granos */}
      <div className="flex-1 flex flex-col justify-center px-5 py-3 gap-3">
        <div>
          <h2
            className="text-[17px] font-light leading-tight"
            style={{ fontFamily: "var(--font-display)", color: isDark ? "#E8DDD5" : "#2B2B2B" }}
          >
            {isComplete ? `¡${rewardName}!` : "Café de la casa"}
          </h2>
          <p className="text-[10px] tracking-wide mt-0.5" style={{ color: isDark ? "#7A706A" : "#8A817A" }}>
            {isComplete ? "Preséntala en barra" : "Cliente frecuente"}
          </p>
        </div>

        <div className="flex justify-between">
          {Array.from({ length: visualMax }).map((_, i) => (
            <CoffeeBean
              key={i}
              active={i < visualStamps}
              isNew={i === newStampIdx}
              isGift={i === 0}
            />
          ))}
        </div>

        {progressMessage && (
          <p className="text-[10px] tracking-widest uppercase" style={{ color: isDark ? "#7A706A" : "#A89E97" }}>
            {progressMessage}
          </p>
        )}
      </div>

      {/* Barra de progreso + conteo */}
      <div className="px-5 pb-4 space-y-2">
        <div className="h-[2px] rounded-full overflow-hidden" style={{ background: isDark ? "#3A3230" : "#E8E0D8" }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: isComplete
                ? "linear-gradient(90deg, #8A6A3A, #C4954A)"
                : isDark ? "#C4954A" : "#3A2F2A",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="flex justify-between">
          <p className="text-[10px] tracking-widest uppercase" style={{ color: isDark ? "#7A706A" : "#A89E97" }}>
            {animatedStamps} de {visualMax} visitas
          </p>
          <p className="text-[10px]" style={{ color: isDark ? "#7A706A" : "#A89E97" }}>
            {isComplete
              ? "✓ Lista"
              : `${remaining} restante${remaining !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>
    </div>
  );
}
