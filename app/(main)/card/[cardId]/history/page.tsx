"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useFirestore } from "reactfire";
import { StampEvent } from "@/models/stamp-event.model";
import { getStampEventsByCard } from "@/services/card.service";
import { timeAgo } from "@/lib/utils";
import { getCustomerSession } from "@/app/actions/customerSession";

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
  if (source === "redemption") return "Canje de cortesía";
  if (source === "promo") return "Visita promo";
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
    const date = event.createdAt?.toDate?.() ?? new Date();
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

export default function HistoryPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const router = useRouter();
  const firestore = useFirestore();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const storedCardId = localStorage.getItem("cardId");
      let authorized = storedCardId === cardId;

      if (!authorized) {
        try {
          const session = await getCustomerSession();
          if (session?.cardId === cardId) {
            localStorage.setItem("cardId", session.cardId);
            localStorage.setItem("customerId", session.customerId);
            authorized = true;
          }
        } catch { /* fall through */ }
      }

      if (!authorized) {
        router.replace("/recover");
        return;
      }

      getStampEventsByCard(firestore, cardId)
        .then(setEvents)
        .catch(() => setError("No se pudo cargar el historial"))
        .finally(() => setLoading(false));
    }
    init();
  }, [cardId, firestore, router]);

  const groups = groupEventsByDate(events);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href={`/card/${cardId}`}
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-white transition-colors duration-300 group"
        >
          <span className="w-4 h-px bg-stone-500 group-hover:w-7 group-hover:bg-white transition-all duration-500" />
          Mi tarjeta
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-500">
          La Commune
        </span>
        <div className="w-16" />
      </nav>

      <div className="flex-1 w-full max-w-lg mx-auto px-6 sm:px-10 pb-20 pt-4">

        {/* Header */}
        <div className="mb-10 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">Mi tarjeta</p>
          <h1 className="font-display text-4xl font-light tracking-wide text-stone-200">
            Mis visitas
          </h1>
          {!loading && !error && events.length > 0 && (
            <p className="text-[11px] text-stone-600 tracking-wide pt-1">
              {events.filter(e => e.source !== "redemption").length} visitas · {events.filter(e => e.source === "redemption").length} canjes
            </p>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-stone-900 animate-pulse" style={{ opacity: 1 - (i - 1) * 0.2 }} />
            ))}
          </div>
        )}

        {error && (
          <p className="text-[11px] uppercase tracking-widest text-red-500 text-center mt-8">{error}</p>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center mt-20 space-y-3">
            <p className="text-stone-500 text-sm leading-relaxed">
              Aún no hay visitas registradas.
            </p>
            <p className="text-[10px] uppercase tracking-widest text-stone-800">
              Cada café cuenta — te esperamos
            </p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.dateLabel}>
                {/* Encabezado de grupo */}
                <div className="flex items-center gap-3 mb-4 pl-6">
                  <span className="text-[10px] uppercase tracking-widest text-stone-500 shrink-0">
                    {group.dateLabel}
                  </span>
                  <div className="flex-1 h-px bg-stone-800/60" />
                </div>

                {/* Eventos del grupo */}
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-800" />
                  <ul className="space-y-4 pl-6">
                    {group.events.map((event) => {
                      const date = event.createdAt?.toDate?.() ?? new Date();
                      const isRedemption = event.source === "redemption";

                      return (
                        <li key={event.id} className="relative">
                          <span
                            className={`absolute -left-[22px] top-4 w-3 h-3 rounded-full border-2 ${
                              isRedemption
                                ? "border-amber-500 bg-amber-900/40"
                                : "border-stone-600 bg-neutral-950"
                            }`}
                          />

                          <div className={`rounded-2xl border px-5 py-4 space-y-1.5 ${
                            isRedemption
                              ? "border-amber-800/40 bg-amber-900/10"
                              : "border-stone-800 bg-neutral-900"
                          }`}>
                            <div className="flex items-start justify-between gap-3">
                              <p className={`text-sm font-medium ${isRedemption ? "text-amber-300" : "text-stone-200"}`}>
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
                              <p className={`text-[11px] ${isRedemption ? "text-amber-700/70" : "text-stone-500"}`}>
                                {event.drinkType}
                                {event.size ? ` · ${event.size}` : ""}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
