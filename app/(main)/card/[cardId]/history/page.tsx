"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useFirestore } from "reactfire";
import { StampEvent } from "@/models/stamp-event.model";
import { getStampEventsByCard } from "@/services/card.service";
import { timeAgo } from "@/lib/utils";

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

export default function HistoryPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const router = useRouter();
  const firestore = useFirestore();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Verificar acceso: solo el dueño de la tarjeta puede ver el historial
    const storedCardId = localStorage.getItem("cardId");
    if (!storedCardId || storedCardId !== cardId) {
      router.replace(`/onboarding?cardId=${cardId}`);
      return;
    }

    getStampEventsByCard(firestore, cardId)
      .then(setEvents)
      .catch(() => setError("No se pudo cargar el historial"))
      .finally(() => setLoading(false));
  }, [cardId, firestore, router]);

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
          <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">Tarjeta</p>
          <h1 className="font-display text-4xl font-light tracking-wide text-stone-200">
            Historial
          </h1>
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
          <div className="text-center mt-16 space-y-2">
            <p className="text-stone-600 text-sm">Sin visitas registradas todavía</p>
            <p className="text-[10px] uppercase tracking-widest text-stone-800">Vuelve pronto</p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-800" />

            <ul className="space-y-4 pl-6">
              {events.map((event) => {
                const date = event.createdAt?.toDate?.() ?? new Date();
                const isRedemption = event.source === "redemption";

                return (
                  <li key={event.id} className="relative">
                    {/* Dot en la línea */}
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
                        <p className="text-[11px] text-stone-500">
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
        )}
      </div>
    </div>
  );
}
