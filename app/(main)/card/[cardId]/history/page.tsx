"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { StampEvent } from "@/models/stamp-event.model";
import { getStampEventsByCard, getCustomerStats, CustomerStats } from "@/services/card.service";
import { timeAgo } from "@/lib/utils";
import { getCustomerSession } from "@/app/actions/customerSession";
import { EmptyState, StatsSkeleton, ChartSkeleton, TimelineSkeleton } from "@/components/ui/EmptyState";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";

type EventRow = StampEvent & { id: string };

function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sourceLabel(source: string): string {
  if (source === "redemption" || source === "canje") return "Canje de cortesía";
  if (source === "promo") return "Visita promo";
  if (source === "referral_bonus") return "Bono por referido";
  return "Visita";
}

interface EventGroup {
  dateLabel: string;
  events: EventRow[];
}

function groupEventsByDate(events: EventRow[]): EventGroup[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = new Map<string, EventGroup>();

  for (const event of events) {
    const date = event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt);
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    let dateLabel: string;
    if (day.getTime() === today.getTime()) {
      dateLabel = "Hoy";
    } else if (day.getTime() === yesterday.getTime()) {
      dateLabel = "Ayer";
    } else {
      dateLabel = new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
    }

    const key = day.toISOString();
    if (!groups.has(key)) {
      groups.set(key, { dateLabel, events: [] });
    }
    groups.get(key)!.events.push(event);
  }

  return Array.from(groups.values());
}

/* ─── Stats Cards ─── */
function StatsSection({ stats }: { stats: CustomerStats }) {
  const cards = [
    {
      label: "Racha actual",
      value: stats.currentStreak,
      suffix: stats.currentStreak === 1 ? " día" : " días",
      sub: stats.bestStreak > stats.currentStreak ? `Mejor: ${stats.bestStreak}` : "Tu mejor racha",
      accent: stats.currentStreak >= 3,
    },
    {
      label: "Frecuencia",
      value: stats.avgDaysBetween !== null ? `Cada ${stats.avgDaysBetween}` : "—",
      suffix: stats.avgDaysBetween !== null ? (stats.avgDaysBetween === 1 ? " día" : " días") : "",
      sub: stats.favoriteDay ? `Sueles venir en ${stats.favoriteDay}` : null,
      accent: false,
    },
    {
      label: "Favorita",
      value: stats.favDrink || "—",
      suffix: stats.favDrinkCount > 1 ? ` ×${stats.favDrinkCount}` : "",
      sub: null,
      accent: false,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.08 }}
          className={`rounded-2xl border px-3.5 py-4 text-center space-y-1 ${
            card.accent
              ? "border-amber-800/40 bg-amber-900/10"
              : "border-stone-800 bg-neutral-900"
          }`}
        >
          <p className="text-[9px] uppercase tracking-[0.3em] text-stone-600">{card.label}</p>
          <p className={`text-lg font-light tracking-wide ${
            card.accent ? "text-amber-300" : "text-stone-200"
          }`}>
            {typeof card.value === "number" ? card.value : card.value}
            {card.suffix && <span className="text-xs text-stone-500">{card.suffix}</span>}
          </p>
          {card.sub && (
            <p className="text-[10px] text-stone-600 leading-tight">{card.sub}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ─── Activity Chart (últimas 12 semanas) ─── */
function ActivityChart({ data }: { data: CustomerStats["weeklyActivity"] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mb-10 rounded-2xl border border-stone-800 bg-neutral-900 px-4 py-5"
    >
      <p className="text-[9px] uppercase tracking-[0.3em] text-stone-600 mb-4">
        Actividad · últimas 12 semanas
      </p>
      <div className="flex items-end gap-1.5 h-20">
        {data.map((week, i) => {
          const height = week.count > 0 ? Math.max((week.count / maxCount) * 100, 8) : 0;
          const isRecent = i >= data.length - 2;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full flex items-end justify-center" style={{ height: 80 }}>
                {week.count > 0 ? (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.4, delay: i * 0.03 }}
                    className={`w-full max-w-[14px] rounded-sm ${
                      isRecent ? "bg-amber-600/80" : "bg-stone-700"
                    }`}
                  />
                ) : (
                  <div className="w-full max-w-[14px] h-[2px] rounded-full bg-stone-800" />
                )}
              </div>
              {/* Labels: solo primera, mitad y última */}
              {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) ? (
                <span className="text-[8px] text-stone-700 whitespace-nowrap">
                  {week.weekLabel}
                </span>
              ) : (
                <span className="text-[8px] text-transparent">·</span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── Resumen rápido ─── */
function QuickSummary({ stats }: { stats: CustomerStats }) {
  if (!stats.memberSince) return null;

  const months = Math.max(
    1,
    Math.round((Date.now() - stats.memberSince.getTime()) / (30 * 86400000))
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="mb-8 flex items-center gap-3 px-1"
    >
      <div className="w-px h-8 bg-stone-800" />
      <p className="text-[11px] text-stone-500 leading-relaxed">
        Cliente desde{" "}
        <span className="text-stone-400">
          {new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(stats.memberSince)}
        </span>
        {" · "}
        <span className="text-stone-400">{stats.totalVisits}</span> visitas en{" "}
        <span className="text-stone-400">{months}</span> {months === 1 ? "mes" : "meses"}
        {stats.totalRedemptions > 0 && (
          <>
            {" · "}
            <span className="text-amber-600">{stats.totalRedemptions}</span>{" "}
            {stats.totalRedemptions === 1 ? "cortesía canjeada" : "cortesías canjeadas"}
          </>
        )}
      </p>
    </motion.div>
  );
}

/* ─── Page ─── */
export default function HistoryPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const router = useRouter();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const storedCardId = localStorage.getItem("cardId");
      let authorized = storedCardId === cardId;
      let customerId = localStorage.getItem("customerId");

      if (!authorized) {
        try {
          const session = await getCustomerSession();
          if (session?.cardId === cardId) {
            localStorage.setItem("cardId", session.cardId);
            localStorage.setItem("customerId", session.customerId);
            authorized = true;
            customerId = session.customerId;
          }
        } catch { /* fall through */ }
      }

      if (!authorized) {
        router.replace("/recover");
        return;
      }

      try {
        const eventsData = await getStampEventsByCard(cardId);
        setEvents(eventsData);

        // Calcular stats si tenemos customerId
        if (customerId) {
          const statsData = await getCustomerStats(customerId);
          setStats(statsData);
        }
      } catch {
        setError("No se pudo cargar el historial");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [cardId, router]);

  const groups = useMemo(() => groupEventsByDate(events), [events]);

  const { pullDistance, refreshing: pullRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: async () => {
      const eventsData = await getStampEventsByCard(cardId);
      setEvents(eventsData);
      const customerId = localStorage.getItem("customerId");
      if (customerId) {
        const statsData = await getCustomerStats(customerId);
        setStats(statsData);
      }
    },
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col" {...pullHandlers}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href={`/card/${cardId}`}
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-white transition-colors duration-300 group"
        >
          <span aria-hidden="true" className="w-4 h-px bg-stone-500 group-hover:w-7 group-hover:bg-white transition-all duration-500" />
          Mi tarjeta
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-500">
          La Commune
        </span>
        <div className="w-16" />
      </nav>

      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={pullRefreshing} />

      <div className="flex-1 w-full max-w-lg mx-auto px-6 sm:px-10 pb-20 pt-4">

        {/* Header */}
        <div className="mb-8 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">Mi tarjeta</p>
          <h1 className="font-display text-4xl font-light tracking-wide text-stone-200">
            Mis visitas
          </h1>
        </div>

        {/* Loading skeleton — premium staggered */}
        {loading && (
          <div className="space-y-6">
            <StatsSkeleton />
            <ChartSkeleton />
            <TimelineSkeleton count={3} />
          </div>
        )}

        {/* Error — premium con ilustración */}
        {error && !loading && (
          <EmptyState
            illustration="error"
            title={error}
            description="Revisa tu conexión e intenta de nuevo."
            actionLabel="Reintentar"
            onAction={() => window.location.reload()}
          />
        )}

        {/* Empty state — premium con ilustración animada */}
        {!loading && !error && events.length === 0 && (
          <EmptyState
            illustration="history"
            title="Aún no hay visitas"
            description="Tu historial aparecerá aquí cuando hagas tu primera visita. Pide un café en la barra y el barista escaneará tu QR."
            actionLabel="Ver mi tarjeta"
            href={`/card/${cardId}`}
          />
        )}

        {/* Content */}
        {!loading && !error && events.length > 0 && (
          <>
            {/* Stats cards */}
            {stats && <StatsSection stats={stats} />}

            {/* Activity chart */}
            {stats && stats.weeklyActivity.some((w) => w.count > 0) && (
              <ActivityChart data={stats.weeklyActivity} />
            )}

            {/* Quick summary */}
            {stats && <QuickSummary stats={stats} />}

            {/* Separator */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[9px] uppercase tracking-[0.3em] text-stone-600">
                Historial detallado
              </span>
              <div className="flex-1 h-px bg-stone-800/60" />
            </div>

            {/* Timeline */}
            <div className="space-y-8">
              {groups.map((group, gIdx) => (
                <motion.div
                  key={group.dateLabel}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: gIdx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Encabezado de grupo */}
                  <div className="flex items-center gap-3 mb-4 pl-6">
                    <span className="text-[10px] uppercase tracking-widest text-stone-500 shrink-0">
                      {group.dateLabel}
                    </span>
                    <div aria-hidden="true" className="flex-1 h-px bg-stone-800/60" />
                  </div>

                  {/* Eventos del grupo */}
                  <div className="relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-800" />
                    <ul className="space-y-4 pl-6">
                      {group.events.map((event, eIdx) => {
                        const date = event.createdAt instanceof Date ? event.createdAt : new Date(event.createdAt);
                        const isRedemption = event.source === "redemption" || event.source === "canje";
                        const isBonus = event.source === "referral_bonus";

                        return (
                          <motion.li
                            key={event.id}
                            className="relative"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: gIdx * 0.1 + eIdx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <span
                              className={`absolute -left-[22px] top-4 w-3 h-3 rounded-full border-2 ${
                                isRedemption
                                  ? "border-amber-500 bg-amber-900/40"
                                  : isBonus
                                    ? "border-emerald-500 bg-emerald-900/40"
                                    : "border-stone-600 bg-neutral-950"
                              }`}
                            />

                            <div className={`rounded-2xl border px-5 py-4 space-y-1.5 ${
                              isRedemption
                                ? "border-amber-800/40 bg-amber-900/10"
                                : isBonus
                                  ? "border-emerald-800/40 bg-emerald-900/10"
                                  : "border-stone-800 bg-neutral-900"
                            }`}>
                              <div className="flex items-start justify-between gap-3">
                                <p className={`text-sm font-medium ${
                                  isRedemption
                                    ? "text-amber-300"
                                    : isBonus
                                      ? "text-emerald-300"
                                      : "text-stone-200"
                                }`}>
                                  {sourceLabel(event.source)}
                                </p>
                                <span className="text-[10px] uppercase tracking-widest text-stone-700 shrink-0 pt-0.5">
                                  {timeAgo(date)}
                                </span>
                              </div>

                              <p className="text-[11px] text-stone-600">
                                {formatFullDate(date)}
                              </p>

                              {event.drinkType && (
                                <p className={`text-[11px] ${
                                  isRedemption ? "text-amber-700/70" : "text-stone-500"
                                }`}>
                                  {event.drinkType}
                                  {event.size ? ` · ${event.size}` : ""}
                                </p>
                              )}
                            </div>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
