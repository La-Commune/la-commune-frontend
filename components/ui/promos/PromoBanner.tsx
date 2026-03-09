"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Promotion } from "@/models/promotion.model";
import { getActivePromotions } from "@/services/promotion.service";

function formatRange(start: string | Date, end: string | Date): string {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString("es-MX", opts)} — ${e.toLocaleDateString("es-MX", opts)}`;
}

export function useActivePromos() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getActivePromotions()
      .then(setPromos)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return { promos, loaded };
}

/**
 * Inline variant — subtle, integrates into the page flow.
 * Used in the card page below the greeting.
 */
export function PromoBannerInline() {
  const { promos, loaded } = useActivePromos();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (promos.length <= 1 || paused) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % promos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [promos.length, paused]);

  if (!loaded) {
    return (
      <div className="w-full space-y-2 animate-pulse print:hidden">
        <div className="h-2 w-16 bg-stone-200 dark:bg-stone-800 rounded-full mx-auto" />
        <div className="h-5 w-40 bg-stone-200 dark:bg-stone-800 rounded mx-auto" />
        <div className="h-3 w-32 bg-stone-200 dark:bg-stone-800 rounded mx-auto" />
      </div>
    );
  }

  if (promos.length === 0) return null;

  const promo = promos[current];

  return (
    <div
      className="w-full space-y-3 print:hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="text-center space-y-1.5">
        <div className="flex items-center justify-center gap-3">
          <span className="w-5 h-px bg-amber-400/40 dark:bg-amber-600/30" />
          <p className="text-[10px] uppercase tracking-[0.35em] text-amber-600/80 dark:text-amber-400/70">
            Promo
          </p>
          <span className="w-5 h-px bg-amber-400/40 dark:bg-amber-600/30" />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={promo.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="space-y-1.5"
          >
            <p className="font-display text-lg sm:text-xl font-light tracking-wide text-stone-700 dark:text-stone-200">
              {promo.title}
            </p>
            {promo.description && (
              <p className="text-[11px] text-stone-400 dark:text-stone-600 leading-snug max-w-[28ch] mx-auto">
                {promo.description}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 pt-0.5">
              <span className="text-[10px] uppercase tracking-[0.3em] text-stone-300 dark:text-stone-700">
                {formatRange(promo.startsAt, promo.endsAt)}
              </span>
              {promo.appliesTo && (
                <>
                  <span className="w-px h-2.5 bg-stone-200 dark:bg-stone-800" />
                  <span className="text-[10px] uppercase tracking-[0.3em] text-stone-300 dark:text-stone-700">
                    {promo.appliesTo}
                  </span>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pagination dots */}
        {promos.length > 1 && (
          <div className="flex justify-center gap-1.5 pt-2">
            {promos.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? "bg-amber-500/70 scale-125"
                    : "bg-stone-300 dark:bg-stone-700 hover:bg-stone-400 dark:hover:bg-stone-600"
                }`}
                aria-label={`Ver promo ${i + 1} de ${promos.length}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Sticky bottom bar variant — persistent while scrolling the menu.
 * Shows the first active promo as a compact one-liner.
 */
export function PromoBannerSticky() {
  const { promos } = useActivePromos();
  const [dismissed, setDismissed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // Rotate promos every 5s if multiple
  useEffect(() => {
    if (promos.length <= 1 || paused) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % promos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [promos.length, paused]);

  if (promos.length === 0 || dismissed) return null;

  const promo = promos[current];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 1 }}
        className="fixed bottom-0 left-0 right-0 z-40 print:hidden"
      >
        <div
          className="bg-stone-50/90 dark:bg-neutral-950/90 backdrop-blur-md border-t border-stone-200/60 dark:border-stone-800/60"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="shrink-0 text-[9px] uppercase tracking-[0.3em] text-amber-600/80 dark:text-amber-400/60 border border-amber-300/50 dark:border-amber-700/30 rounded-full px-2 py-0.5">
                Promo
              </span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="min-w-0 flex items-baseline gap-2"
                >
                  <span className="text-[12px] sm:text-[13px] font-medium text-stone-700 dark:text-stone-200 truncate">
                    {promo.title}
                  </span>
                  {promo.description && (
                    <span className="hidden sm:inline text-[11px] text-stone-400 dark:text-stone-600 truncate">
                      {promo.description}
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 text-stone-300 dark:text-stone-700 hover:text-stone-500 dark:hover:text-stone-500 transition-colors p-1"
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Progress dots for multiple promos */}
          {promos.length > 1 && (
            <div className="flex justify-center gap-1.5 pb-2">
              {promos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? "bg-amber-500/70 scale-110" : "bg-stone-300 dark:bg-stone-800 hover:bg-stone-400 dark:hover:bg-stone-600"
                  }`}
                  aria-label={`Ver promo ${i + 1} de ${promos.length}`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
