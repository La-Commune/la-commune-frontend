"use client";

import { motion } from "framer-motion";
import type { CustomerStats } from "@/services/card.service";

/** Achievement definition */
interface Achievement {
  id: string;
  title: string;
  subtitle: string;
  check: (stats: CustomerStats, referralCount: number) => boolean;
}

/** All achievements — ordered by difficulty */
const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-visit",
    title: "Primera visita",
    subtitle: "1 visita",
    check: (stats) => stats.totalVisits >= 1,
  },
  {
    id: "streak-3",
    title: "Racha",
    subtitle: "3 semanas seguidas",
    check: (stats) => stats.currentStreak >= 3 || stats.bestStreak >= 3,
  },
  {
    id: "regular",
    title: "Habitual",
    subtitle: "10 visitas",
    check: (stats) => stats.totalVisits >= 10,
  },
  {
    id: "first-redeem",
    title: "Primera cortesía",
    subtitle: "1 canje",
    check: (stats) => stats.totalRedemptions >= 1,
  },
  {
    id: "ambassador",
    title: "Embajador",
    subtitle: "1 referido",
    check: (_stats, referralCount) => referralCount >= 1,
  },
  {
    id: "loyal",
    title: "Leal",
    subtitle: "25 visitas",
    check: (stats) => stats.totalVisits >= 25,
  },
  {
    id: "streak-7",
    title: "Constancia",
    subtitle: "7 semanas seguidas",
    check: (stats) => stats.currentStreak >= 7 || stats.bestStreak >= 7,
  },
  {
    id: "collector",
    title: "Coleccionista",
    subtitle: "5 canjes",
    check: (stats) => stats.totalRedemptions >= 5,
  },
  {
    id: "influencer",
    title: "Influencer",
    subtitle: "5 referidos",
    check: (_stats, referralCount) => referralCount >= 5,
  },
  {
    id: "legend",
    title: "Leyenda",
    subtitle: "50 visitas",
    check: (stats) => stats.totalVisits >= 50,
  },
];

interface AchievementsProps {
  stats: CustomerStats;
  referralCount: number;
}

export function Achievements({ stats, referralCount }: AchievementsProps) {
  const earned = ACHIEVEMENTS.filter((a) => a.check(stats, referralCount));
  const total = ACHIEVEMENTS.length;
  const earnedCount = earned.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400">
          Logros
        </p>
        <p className="text-xs text-stone-400 dark:text-stone-600 tabular-nums">
          {earnedCount} de {total}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-px bg-stone-200 dark:bg-stone-800 relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(earnedCount / total) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 bg-amber-600 dark:bg-amber-500"
        />
      </div>

      {/* Grid de logros — todos visibles */}
      <div className="grid grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((achievement) => {
          const isEarned = earned.some((a) => a.id === achievement.id);

          return (
            <div
              key={achievement.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                isEarned
                  ? "border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10"
                  : "border-stone-100 dark:border-stone-800/50 bg-stone-50/50 dark:bg-neutral-950/50"
              }`}
            >
              {/* Dot indicator */}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isEarned
                    ? "bg-amber-500 dark:bg-amber-400"
                    : "bg-stone-200 dark:bg-stone-700"
                }`}
              />
              <div className="min-w-0">
                <p
                  className={`text-xs font-medium truncate ${
                    isEarned
                      ? "text-stone-800 dark:text-stone-200"
                      : "text-stone-300 dark:text-stone-600"
                  }`}
                >
                  {achievement.title}
                </p>
                <p
                  className={`text-[10px] truncate ${
                    isEarned
                      ? "text-stone-400 dark:text-stone-500"
                      : "text-stone-200 dark:text-stone-700"
                  }`}
                >
                  {achievement.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
