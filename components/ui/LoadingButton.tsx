"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════
 * LoadingButton — Botón con estado de carga premium
 * Spinner integrado + transición suave entre estados
 * ═══════════════════════════════════════════════════════════ */

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Si está en proceso de carga */
  loading?: boolean;
  /** Texto alternativo mientras carga */
  loadingText?: string;
  /** Contenido del botón */
  children: ReactNode;
  /** Variante visual */
  variant?: "default" | "outline" | "ghost" | "danger";
  /** Tamaño */
  size?: "sm" | "md" | "lg";
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.2}
      />
      <path
        d="M12 2C6.477 2 2 6.477 2 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const variantClasses = {
  default:
    "bg-amber-700 dark:bg-amber-600 text-white hover:bg-amber-800 dark:hover:bg-amber-700 border-transparent",
  outline:
    "bg-transparent border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-500 dark:hover:border-stone-500 hover:text-stone-900 dark:hover:text-stone-200",
  ghost:
    "bg-transparent border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/40",
  danger:
    "bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-800 border-transparent",
};

const sizeClasses = {
  sm: "text-[10px] tracking-[0.25em] px-4 py-2 gap-2",
  md: "text-[11px] tracking-[0.3em] px-6 py-2.5 gap-2.5",
  lg: "text-xs tracking-[0.3em] px-8 py-3 gap-3",
};

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  variant = "outline",
  size = "md",
  disabled,
  className = "",
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center uppercase font-medium
        rounded-full border transition-all duration-300
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      {...props}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="inline-flex items-center gap-2"
          >
            <Spinner size={size === "sm" ? 12 : size === "lg" ? 16 : 14} />
            {loadingText && <span>{loadingText}</span>}
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export { Spinner };
