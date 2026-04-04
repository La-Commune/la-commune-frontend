"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════
 * EmptyState — Componente premium reutilizable
 * Dirección estética: Cinematic Dark + editorial warm copper
 * ═══════════════════════════════════════════════════════════ */

interface EmptyStateProps {
  /** Ilustración SVG inline o icono */
  icon?: ReactNode;
  /** Preset de ilustración integrada */
  illustration?: "coffee" | "history" | "search" | "offline" | "error";
  /** Título principal */
  title: string;
  /** Descripción secundaria */
  description?: string;
  /** Texto del botón de acción */
  actionLabel?: string;
  /** Callback del botón */
  onAction?: () => void;
  /** Enlace alternativo al botón */
  href?: string;
  /** Variante de estilo */
  variant?: "dark" | "light";
  /** Tamaño compacto para espacios pequeños */
  compact?: boolean;
}

/* ─── Ilustraciones SVG integradas ─── */

function CoffeeIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Taza de café con vapor">
      {/* Steam lines */}
      <motion.path
        d="M30 28C30 28 32 22 30 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={0.3}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.3 }}
        transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, repeatType: "reverse" }}
      />
      <motion.path
        d="M40 26C40 26 42 18 40 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={0.4}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.4 }}
        transition={{ duration: 1.8, delay: 0.8, repeat: Infinity, repeatType: "reverse" }}
      />
      <motion.path
        d="M50 28C50 28 52 22 50 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity={0.3}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.3 }}
        transition={{ duration: 1.6, delay: 1.1, repeat: Infinity, repeatType: "reverse" }}
      />
      {/* Cup body */}
      <path
        d="M20 36H56L52 64C51.5 67 49 70 46 70H30C27 70 24.5 67 24 64L20 36Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity={0.5}
      />
      {/* Handle */}
      <path
        d="M56 42C60 42 64 44 64 50C64 56 60 58 56 58"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity={0.3}
      />
      {/* Saucer */}
      <ellipse cx="38" cy="72" rx="24" ry="3" stroke="currentColor" strokeWidth="1" opacity={0.2} />
    </svg>
  );
}

function HistoryIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reloj de historial">
      {/* Clock circle */}
      <circle cx="40" cy="40" r="24" stroke="currentColor" strokeWidth="1.5" opacity={0.3} />
      <circle cx="40" cy="40" r="2" fill="currentColor" opacity={0.4} />
      {/* Hour hand */}
      <motion.line
        x1="40" y1="40" x2="40" y2="26"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={0.5}
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "40px 40px" }}
      />
      {/* Minute hand */}
      <motion.line
        x1="40" y1="40" x2="40" y2="22"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity={0.3}
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "40px 40px" }}
      />
      {/* Hour marks */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
        <line
          key={angle}
          x1="40"
          y1="18"
          x2="40"
          y2="20"
          stroke="currentColor"
          strokeWidth="1"
          opacity={0.2}
          transform={`rotate(${angle} 40 40)`}
        />
      ))}
    </svg>
  );
}

function SearchIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lupa de búsqueda">
      <circle cx="35" cy="35" r="16" stroke="currentColor" strokeWidth="1.5" opacity={0.4} />
      <line x1="47" y1="47" x2="62" y2="62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={0.3} />
      {/* Sparkles */}
      <motion.circle
        cx="55" cy="20" r="1.5" fill="currentColor" opacity={0.2}
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.3, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.circle
        cx="20" cy="55" r="1" fill="currentColor" opacity={0.15}
        animate={{ opacity: [0.15, 0.4, 0.15], scale: [1, 1.4, 1] }}
        transition={{ duration: 2.5, delay: 0.5, repeat: Infinity }}
      />
    </svg>
  );
}

function OfflineIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sin conexión a internet">
      {/* Cloud */}
      <path
        d="M24 50C18 50 14 46 14 40C14 34 18 30 24 30C24 24 28 18 36 18C44 18 48 24 48 28C54 28 60 32 60 38C60 44 56 50 48 50"
        stroke="currentColor" strokeWidth="1.5" opacity={0.3} fill="none"
      />
      {/* Diagonal slash */}
      <line x1="20" y1="60" x2="60" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity={0.4} />
      {/* Dots below */}
      <motion.circle cx="30" cy="60" r="1.5" fill="currentColor" opacity={0.2}
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle cx="40" cy="64" r="1.5" fill="currentColor" opacity={0.15}
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 1.5, delay: 0.3, repeat: Infinity }}
      />
      <motion.circle cx="50" cy="60" r="1.5" fill="currentColor" opacity={0.2}
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 1.5, delay: 0.6, repeat: Infinity }}
      />
    </svg>
  );
}

function ErrorIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Error o advertencia">
      {/* Triangle */}
      <path d="M40 16L68 64H12L40 16Z" stroke="currentColor" strokeWidth="1.5" opacity={0.3} fill="none" />
      {/* Exclamation */}
      <line x1="40" y1="32" x2="40" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity={0.5} />
      <motion.circle
        cx="40" cy="56" r="1.5" fill="currentColor" opacity={0.5}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  );
}

const illustrations = {
  coffee: CoffeeIllustration,
  history: HistoryIllustration,
  search: SearchIllustration,
  offline: OfflineIllustration,
  error: ErrorIllustration,
};

export function EmptyState({
  icon,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  href,
  variant = "dark",
  compact = false,
}: EmptyStateProps) {
  const isDark = variant === "dark";
  const Illustration = illustration ? illustrations[illustration] : null;

  const containerClasses = compact
    ? "flex flex-col items-center gap-4 py-10 px-4"
    : "flex flex-col items-center gap-5 py-20 px-6";

  return (
    <div className={containerClasses}>
      {/* Ilustración o icono */}
      {(Illustration || icon) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={isDark ? "text-stone-500" : "text-stone-400"}
        >
          {Illustration ? <Illustration /> : icon}
        </motion.div>
      )}

      {/* Separador decorativo */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        aria-hidden="true"
        className={`w-8 h-px ${isDark ? "bg-stone-800" : "bg-stone-200"}`}
      />

      {/* Texto */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-center space-y-2 max-w-xs"
      >
        <h3 className={`text-sm font-medium tracking-wide ${
          isDark ? "text-stone-300" : "text-stone-600"
        }`}>
          {title}
        </h3>
        {description && (
          <p className={`text-xs leading-relaxed ${
            isDark ? "text-stone-600" : "text-stone-400"
          }`}>
            {description}
          </p>
        )}
      </motion.div>

      {/* Acción */}
      {(actionLabel && (onAction || href)) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          {href ? (
            <a
              href={href}
              className={`inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] transition-colors duration-300 group ${
                isDark
                  ? "text-stone-500 hover:text-white"
                  : "text-stone-400 hover:text-stone-900"
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-4 h-px group-hover:w-7 transition-all duration-500 ${
                  isDark
                    ? "bg-stone-700 group-hover:bg-white"
                    : "bg-stone-300 group-hover:bg-stone-900"
                }`}
              />
              {actionLabel}
            </a>
          ) : (
            <button
              onClick={onAction}
              className={`inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] transition-colors duration-300 group ${
                isDark
                  ? "text-stone-500 hover:text-white"
                  : "text-stone-400 hover:text-stone-900"
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-4 h-px group-hover:w-7 transition-all duration-500 ${
                  isDark
                    ? "bg-stone-700 group-hover:bg-white"
                    : "bg-stone-300 group-hover:bg-stone-900"
                }`}
              />
              {actionLabel}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ═══ Skeleton Components ═══ */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "dark" | "light";
}

export function Skeleton({ className = "", variant = "dark", style, ...rest }: SkeletonProps) {
  const bg = variant === "dark"
    ? "bg-stone-800/60"
    : "bg-stone-200 dark:bg-stone-800/60";

  return (
    <div className={`animate-pulse rounded-lg ${bg} ${className}`} style={style} {...rest} />
  );
}

/** Skeleton para cards de estadísticas (3 cols) */
export function StatsSkeleton({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const isDark = variant === "dark";
  const border = isDark ? "border-stone-800" : "border-stone-200 dark:border-stone-800";
  const bg = isDark ? "bg-neutral-900" : "bg-stone-50 dark:bg-neutral-900";

  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: i * 0.06 }}
          className={`rounded-2xl border ${border} ${bg} px-3.5 py-5 space-y-3`}
        >
          <Skeleton variant={variant} className="h-2 w-12 mx-auto" />
          <Skeleton variant={variant} className="h-5 w-10 mx-auto" />
          <Skeleton variant={variant} className="h-2 w-16 mx-auto" />
        </motion.div>
      ))}
    </div>
  );
}

/** Skeleton para gráfica de actividad */
export function ChartSkeleton({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const isDark = variant === "dark";
  const border = isDark ? "border-stone-800" : "border-stone-200 dark:border-stone-800";
  const bg = isDark ? "bg-neutral-900" : "bg-stone-50 dark:bg-neutral-900";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className={`rounded-2xl border ${border} ${bg} px-4 py-5`}
    >
      <Skeleton variant={variant} className="h-2 w-28 mb-4" />
      <div className="flex items-end gap-1.5 h-20">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex-1 flex items-end justify-center" style={{ height: 80 }}>
            <Skeleton
              variant={variant}
              className="w-full max-w-[14px] rounded-sm"
              style={{ height: `${Math.random() * 60 + 15}%` } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/** Skeleton para timeline de eventos */
export function TimelineSkeleton({ count = 3, variant = "dark" }: { count?: number; variant?: "dark" | "light" }) {
  const isDark = variant === "dark";
  const border = isDark ? "border-stone-800" : "border-stone-200 dark:border-stone-800";
  const bg = isDark ? "bg-neutral-900" : "bg-stone-50 dark:bg-neutral-900";

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
          className={`rounded-2xl border ${border} ${bg} px-5 py-4 space-y-2`}
        >
          <div className="flex justify-between">
            <Skeleton variant={variant} className="h-3.5 w-20" />
            <Skeleton variant={variant} className="h-3 w-14" />
          </div>
          <Skeleton variant={variant} className="h-2.5 w-32" />
          <Skeleton variant={variant} className="h-2.5 w-24" />
        </motion.div>
      ))}
    </div>
  );
}

/** Loading page completa — ideal para redirects */
export function PageLoading({ message = "Cargando..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center gap-8">
      {/* Coffee cup animated */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-stone-600"
      >
        <CoffeeIllustration />
      </motion.div>

      {/* Pulse dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-stone-700"
            animate={{
              backgroundColor: ["rgb(68 64 60)", "rgb(168 162 158)", "rgb(68 64 60)"],
            }}
            transition={{
              duration: 1.2,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="text-[10px] uppercase tracking-[0.4em] text-stone-700"
      >
        {message}
      </motion.p>
    </div>
  );
}
