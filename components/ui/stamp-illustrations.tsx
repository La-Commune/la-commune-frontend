"use client";

import { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type IllustrationId =
  | "latte-lateral"
  | "cappuccino-cenital"
  | "flat-white-cenital"
  | "espresso-shot"
  | "cupcake"
  | "rebanada-pastel"
  | "tag-descuento"
  | "monedas"
  | "grano-cenital"
  | "grano-aroma"
  | "cold-brew"
  | "matcha-latte"
  | "rol-canela"
  | "v60-goteo"
  | "dos-tazas-brindis"
  | "corazon-latte-art"
  | "concha"
  | "prensa-francesa";

export interface IllustrationProps {
  stamps: number;
  maxStamps: number;
  displayedStamps: number;
  animatedStamps: number;
  isComplete: boolean;
  isNewStamp: boolean;
  isDark: boolean;
  fillRadius: number;
  /** Stamps reales del cliente (sin bonus). Para el texto del contador. */
  realStamps?: number;
  /** Max stamps reales (sin bonus). Para el texto "de X". */
  realMaxStamps?: number;
  /** Unique prefix for SVG IDs to avoid collisions between instances */
  uid?: string;
}

/** Catálogo de ilustraciones con metadatos para el selector admin */
export const ILLUSTRATION_CATALOG: {
  id: IllustrationId;
  name: string;
  category: string;
  emoji: string;
}[] = [
  { id: "flat-white-cenital", name: "Flat White Cenital", category: "Tazas", emoji: "☕" },
  { id: "latte-lateral", name: "Latte Lateral", category: "Tazas", emoji: "☕" },
  { id: "cappuccino-cenital", name: "Cappuccino Cenital", category: "Tazas", emoji: "☕" },
  { id: "espresso-shot", name: "Espresso Shot", category: "Tazas", emoji: "☕" },
  { id: "cupcake", name: "Cupcake", category: "Postres", emoji: "🧁" },
  { id: "rebanada-pastel", name: "Rebanada de Pastel", category: "Postres", emoji: "🍰" },
  { id: "tag-descuento", name: "Tag de Descuento", category: "Descuento", emoji: "%" },
  { id: "monedas", name: "Monedas", category: "Descuento", emoji: "🪙" },
  { id: "grano-cenital", name: "Grano de Café", category: "Universal", emoji: "🫘" },
  { id: "grano-aroma", name: "Grano con Aroma", category: "Universal", emoji: "🫘" },
  { id: "cold-brew", name: "Cold Brew", category: "Bebida Especial", emoji: "🧋" },
  { id: "matcha-latte", name: "Matcha Latte", category: "Bebida Especial", emoji: "🍵" },
  { id: "rol-canela", name: "Rol de Canela", category: "Postres", emoji: "🍥" },
  { id: "v60-goteo", name: "V60 Pour Over", category: "Ritual", emoji: "🫖" },
  { id: "dos-tazas-brindis", name: "Brindis de Barrio", category: "Comunidad", emoji: "🥂" },
  { id: "corazon-latte-art", name: "Lo que se da, vuelve", category: "Comunidad", emoji: "🤍" },
  { id: "concha", name: "Concha", category: "Pan dulce", emoji: "🐚" },
  { id: "prensa-francesa", name: "Prensa Francesa", category: "Ritual", emoji: "☕" },
];

// ─── Helper colors ───
function colors(isDark: boolean) {
  return {
    cupStroke: isDark ? "#4a4240" : "#c7b7a3",
    plateStroke: isDark ? "#3a3630" : "#d8d0c8",
    handleStroke: isDark ? "#4a4240" : "#c7b7a3",
    emptyFill: isDark ? "#1a1412" : "#f0e9e0",
    textLight: isDark ? "#1a1412" : "#f5f0ea",
    textGhost: isDark ? "#3a3630" : "#c7b7a3",
    subtextGhost: isDark ? "#2a2722" : "#d8d0c8",
    latteArt: isDark ? "#e8ddd5" : "#f5f0ea",
    accent: isDark ? "#C4954A" : "#8b6b3d",
  };
}

// ═══════════════════════════════════════════
// A3: FLAT WHITE CENITAL (la actual)
// ═══════════════════════════════════════════
function FlatWhiteCenital(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const CUP_R = 58;
  const fr = (p.displayedStamps / p.maxStamps) * CUP_R;

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <radialGradient id={`${u}coffeeFill-fw`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="55%" stopColor={p.isDark ? "#8b6b3d" : "#a07850"} />
          <stop offset="85%" stopColor="#c8956c" />
          <stop offset="100%" stopColor={p.isDark ? "#a07850" : "#b08860"} />
        </radialGradient>
        <clipPath id={`${u}cupClip-fw`}><circle cx="90" cy="90" r="58" /></clipPath>
        <filter id={`${u}glow-fw`}><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx="90" cy="90" r="78" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <circle cx="90" cy="90" r="62" fill="none" stroke={c.cupStroke} strokeWidth="2.5" filter={p.isComplete ? `url(#${u}glow-fw)` : undefined} />
      <circle cx="90" cy="90" r="58" fill={c.emptyFill} />
      <path d="M148 78 Q170 78 170 90 Q170 102 148 102" fill="none" stroke={c.handleStroke} strokeWidth="2.5" strokeLinecap="round" />
      <motion.circle cx={90} cy={90} fill={`url(#${u}coffeeFill-fw)`} clipPath={`url(#${u}cupClip-fw)`} initial={{ r: 0 }} animate={{ r: fr }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      <AnimatePresence>
        {p.isNewStamp && <motion.circle cx={90} cy={90} r={fr} fill="none" stroke={c.accent} strokeWidth={1.5} clipPath={`url(#${u}cupClip-fw)`} initial={{ r: fr * 0.5, opacity: 0.8 }} animate={{ r: fr + 8, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />}
      </AnimatePresence>
      {p.isComplete && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}>
          <path d="M90 65 Q78 76 90 82 Q102 76 90 65Z" fill="none" stroke={c.latteArt} strokeWidth="0.8" opacity="0.5" />
          <path d="M90 74 Q80 83 90 88 Q100 83 90 74Z" fill="none" stroke={c.latteArt} strokeWidth="0.7" opacity="0.4" />
          <path d="M90 83 Q83 90 90 95 Q97 90 90 83Z" fill="none" stroke={c.latteArt} strokeWidth="0.6" opacity="0.35" />
          <line x1="90" y1="95" x2="90" y2="112" stroke={c.latteArt} strokeWidth="0.6" opacity="0.3" />
        </motion.g>
      )}
      {!p.isComplete && <CentralCount {...p} cx={90} cy={85} />}
      {p.isComplete && <CompleteMark cx={90} cy={87} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// A1: LATTE LATERAL
// ═══════════════════════════════════════════
function LatteLateral(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 155 - fillPct * 65;

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[180px]">
      <defs>
        <linearGradient id={`${u}cFill-ll`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="50%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="100%" stopColor="#c8956c" />
        </linearGradient>
        <clipPath id={`${u}cupClip-ll`}>
          <path d="M45 50 Q42 50 40 55 L32 155 Q30 165 45 168 L135 168 Q150 165 148 155 L140 55 Q138 50 135 50Z" />
        </clipPath>
      </defs>
      <ellipse cx="90" cy="172" rx="75" ry="10" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <path d="M45 50 Q42 50 40 55 L32 155 Q30 165 45 168 L135 168 Q150 165 148 155 L140 55 Q138 50 135 50Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
      <path d="M140 70 Q165 70 165 100 Q165 130 140 130" fill="none" stroke={c.handleStroke} strokeWidth="2.5" strokeLinecap="round" />
      <motion.rect x="30" width="120" height="70" fill={`url(#${u}cFill-ll)`} clipPath={`url(#${u}cupClip-ll)`} opacity="0.9" initial={{ y: 170 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      <path d="M43 50 L137 50" stroke={c.cupStroke} strokeWidth="3" strokeLinecap="round" />
      {!p.isComplete && <CentralCount {...p} cx={90} cy={130} svgFont="28px" />}
      {p.isComplete && <CompleteMark cx={90} cy={125} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// A2: CAPPUCCINO CENITAL
// ═══════════════════════════════════════════
function CappuccinoCenital(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const CUP_R = 58;
  const fr = (p.displayedStamps / p.maxStamps) * CUP_R;

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <radialGradient id={`${u}foam-cap`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.isDark ? "#d4c8be" : "#f5f0ea"} />
          <stop offset="40%" stopColor={p.isDark ? "#a89e97" : "#e8ddd5"} />
          <stop offset="70%" stopColor={p.isDark ? "#7a706a" : "#d4c8be"} />
          <stop offset="100%" stopColor={p.isDark ? "#5a524c" : "#c7b7a3"} />
        </radialGradient>
        <clipPath id={`${u}cupClip-cap`}><circle cx="90" cy="90" r="58" /></clipPath>
      </defs>
      <circle cx="90" cy="90" r="78" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <circle cx="90" cy="90" r="62" fill="none" stroke={c.cupStroke} strokeWidth="2.5" />
      <circle cx="90" cy="90" r="58" fill={c.emptyFill} />
      <path d="M148 78 Q170 78 170 90 Q170 102 148 102" fill="none" stroke={c.handleStroke} strokeWidth="2.5" strokeLinecap="round" />
      <motion.circle cx={90} cy={90} fill={`url(#${u}foam-cap)`} clipPath={`url(#${u}cupClip-cap)`} opacity="0.95" initial={{ r: 0 }} animate={{ r: fr }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      {fr > 15 && <>
        <circle cx="78" cy="80" r="12" fill="none" stroke={c.cupStroke} strokeWidth="0.5" opacity="0.3" />
        <circle cx="100" cy="85" r="10" fill="none" stroke={c.cupStroke} strokeWidth="0.5" opacity="0.25" />
        <circle cx="88" cy="98" r="8" fill="none" stroke={c.cupStroke} strokeWidth="0.5" opacity="0.2" />
      </>}
      {!p.isComplete && <CentralCount {...p} cx={90} cy={85} textFill={c.accent} />}
      {p.isComplete && <CompleteMark cx={90} cy={87} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// A4: ESPRESSO SHOT
// ═══════════════════════════════════════════
function EspressoShot(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 145 - fillPct * 42;

  return (
    <svg viewBox="0 0 180 200" className="w-[155px] h-[175px]">
      <defs>
        <linearGradient id={`${u}eFill-es`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#1a0f05" : "#3d2810"} />
          <stop offset="60%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="90%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="100%" stopColor="#c8956c" />
        </linearGradient>
        <clipPath id={`${u}cupClip-es`}>
          <path d="M55 80 Q52 80 50 85 L46 145 Q44 155 55 158 L125 158 Q136 155 134 145 L130 85 Q128 80 125 80Z" />
        </clipPath>
      </defs>
      <ellipse cx="90" cy="162" rx="55" ry="8" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <path d="M55 80 Q52 80 50 85 L46 145 Q44 155 55 158 L125 158 Q136 155 134 145 L130 85 Q128 80 125 80Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
      <path d="M130 90 Q150 90 150 110 Q150 130 130 130" fill="none" stroke={c.handleStroke} strokeWidth="2" strokeLinecap="round" />
      <motion.rect x="44" width="92" height="55" fill={`url(#${u}eFill-es)`} clipPath={`url(#${u}cupClip-es)`} opacity="0.95" initial={{ y: 158 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      {fillPct > 0 && <motion.path d="M52 107 Q70 103 90 105 Q110 107 128 104" fill="none" stroke="#d4a57c" strokeWidth="1.5" initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.6 }} />}
      <path d="M53 80 L127 80" stroke={c.cupStroke} strokeWidth="2.5" strokeLinecap="round" />
      {!p.isComplete && <CentralCount {...p} cx={90} cy={125} svgFont="26px" />}
      {p.isComplete && <CompleteMark cx={90} cy={120} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// B1: CUPCAKE
// ═══════════════════════════════════════════
function Cupcake(p: IllustrationProps) {
  const c = colors(p.isDark);
  const pct = p.displayedStamps / p.maxStamps;
  const showBase = pct > 0;
  const showFrosting = pct >= 0.4;
  const showCherry = p.isComplete;

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[180px]">
      {/* Capacillo — siempre */}
      <path d="M55 120 L48 170 Q46 178 56 180 L124 180 Q134 178 132 170 L125 120Z" fill="none" stroke={c.cupStroke} strokeWidth="1.5" />
      {[60, 75, 90, 105, 120].map((x, i) => <line key={i} x1={x} y1={x === 90 ? 120 : 122} x2={x < 90 ? x - 6 : x > 90 ? x + 6 : x} y2={x === 90 ? 178 : 175} stroke={c.plateStroke} strokeWidth="0.5" opacity="0.5" />)}
      {/* Pan */}
      {showBase && (
        <motion.path d="M55 120 Q55 95 68 90 Q80 86 90 85 Q100 86 112 90 Q125 95 125 120Z" fill={p.isDark ? "#a07850" : "#d4a57c"} stroke={c.cupStroke} strokeWidth="1.5" initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} transition={{ duration: 0.5 }} />
      )}
      {/* Frosting */}
      {showFrosting && (
        <motion.g initial={{ opacity: 0, y: 5 }} animate={{ opacity: 0.85, y: 0 }} transition={{ duration: 0.6 }}>
          <path d="M50 92 Q55 70 70 65 Q80 62 90 60 Q100 62 110 65 Q125 70 130 92Z" fill={p.isDark ? "#c0a0c0" : "#f0e0f0"} stroke={p.isDark ? "#a080a0" : "#d8c0d8"} strokeWidth="1" />
          <path d="M58 88 Q65 78 75 74 Q85 71 90 70 Q95 71 105 74 Q115 78 122 88Z" fill={p.isDark ? "#b090b0" : "#e8d0e8"} stroke="none" opacity="0.5" />
        </motion.g>
      )}
      {/* Cereza */}
      {showCherry && (
        <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}>
          <circle cx="90" cy="55" r="8" fill="#c0392b" stroke="#a93226" strokeWidth="1" />
          <path d="M90 47 Q95 40 92 33" fill="none" stroke="#27ae60" strokeWidth="1.5" strokeLinecap="round" />
        </motion.g>
      )}
      {!p.isComplete && <CentralCount {...p} cx={90} cy={showFrosting ? 78 : 105} textFill={showFrosting ? c.accent : undefined} svgFont="26px" />}
      {p.isComplete && <CompleteMark cx={90} cy={78} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// B2: REBANADA DE PASTEL
// ═══════════════════════════════════════════
function RebanadaPastel(p: IllustrationProps) {
  const c = colors(p.isDark);
  const layers = Math.ceil((p.displayedStamps / p.maxStamps) * 3);

  const layerColors = [
    p.isDark ? "#a07850" : "#d4a57c",
    p.isDark ? "#8b6b3d" : "#c8956c",
    p.isDark ? "#c8956c" : "#b08860",
  ];

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[180px]">
      <ellipse cx="90" cy="175" rx="70" ry="8" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      {[0, 1, 2].map((i) => {
        const y = 145 - i * 33;
        const filled = i < layers;
        return (
          <g key={i}>
            {filled ? (
              <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <rect x="45" y={y} width="90" height="28" rx="3" fill={layerColors[i]} stroke={c.cupStroke} strokeWidth="1" />
                <rect x="45" y={y - 5} width="90" height="6" rx="2" fill={p.isDark ? "#d4c8be" : "#f5f0ea"} opacity="0.8" />
              </motion.g>
            ) : (
              <rect x="45" y={y} width="90" height="28" rx="3" fill="none" stroke={c.plateStroke} strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
            )}
          </g>
        );
      })}
      {p.isComplete && (
        <motion.text x="90" y="72" textAnchor="middle" fontSize="20" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>🍓</motion.text>
      )}
      {!p.isComplete && <CentralCount {...p} cx={90} cy={layers > 1 ? 130 : 160} svgFont="26px" />}
      {p.isComplete && <CompleteMark cx={90} cy={130} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// C1: TAG DESCUENTO
// ═══════════════════════════════════════════
function TagDescuento(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const pct = p.displayedStamps / p.maxStamps;
  const circumference = 2 * Math.PI * 65;
  const offset = circumference * (1 - pct);

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <linearGradient id={`${u}tagGrad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8956c" />
          <stop offset="100%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
        </linearGradient>
      </defs>
      <circle cx="90" cy="90" r="65" fill="none" stroke={p.isDark ? "#2a2722" : "#e8e0d8"} strokeWidth="6" />
      <motion.circle cx="90" cy="90" r="65" fill="none" stroke={`url(#${u}tagGrad)`} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} transform="rotate(-90 90 90)" initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      <circle cx="90" cy="90" r="48" fill={p.isDark ? "#1a1412" : "#FAF7F4"} stroke={p.isDark ? "#2a2722" : "#e8e0d8"} strokeWidth="1" />
      {!p.isComplete ? (
        <>
          <text x="90" y="82" textAnchor="middle" dominantBaseline="central" fontSize="36" fill={c.accent} fontWeight="200" fontFamily="Georgia, serif">%</text>
          <text x="90" y="112" textAnchor="middle" fontSize="11" fill={p.isDark ? "#7a706a" : "#A89E97"} fontFamily="system-ui" letterSpacing="1">{p.animatedStamps} de {p.maxStamps}</text>
        </>
      ) : <CompleteMark cx={90} cy={90} isDark={p.isDark} size={32} />}
      <line x1="90" y1="25" x2="90" y2="10" stroke={c.cupStroke} strokeWidth="1.5" />
      <circle cx="90" cy="8" r="3" fill="none" stroke={c.cupStroke} strokeWidth="1.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════
// C2: MONEDAS
// ═══════════════════════════════════════════
function Monedas(p: IllustrationProps) {
  const c = colors(p.isDark);
  const filled = p.displayedStamps;

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[180px]">
      <ellipse cx="90" cy="178" rx="45" ry="8" fill={p.isDark ? "#2a2722" : "#e8e0d8"} opacity="0.5" />
      {Array.from({ length: p.maxStamps }).map((_, i) => {
        const y = 170 - i * 24;
        const isFilled = i < filled;
        return (
          <g key={i}>
            {isFilled ? (
              <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
                <ellipse cx="90" cy={y} rx="40" ry="10" fill="#c8956c" stroke="#b08860" strokeWidth="1" />
                <rect x="50" y={y - 10} width="80" height="10" fill="#b08860" />
                <ellipse cx="90" cy={y - 10} rx="40" ry="10" fill={p.isDark ? "#c8956c" : "#d4a57c"} stroke="#c8956c" strokeWidth="1" />
                <text x="90" y={y - 7} textAnchor="middle" fontSize="8" fill={p.isDark ? "#5a3f20" : "#8b6b3d"} fontFamily="Georgia" opacity="0.6">LC</text>
              </motion.g>
            ) : (
              <ellipse cx="90" cy={y - 10} rx="40" ry="10" fill="none" stroke={c.plateStroke} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════
// D1: GRANO CENITAL
// ═══════════════════════════════════════════
function GranoCenital(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 170 - fillPct * 100;

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[180px]">
      <defs>
        <linearGradient id={`${u}bFill-gc`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#1a0f05" : "#3d2810"} />
          <stop offset="50%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="100%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
        </linearGradient>
        <clipPath id={`${u}beanClip-gc`}>
          <path d="M90 30 Q130 30 135 75 Q138 110 125 140 Q115 165 90 170 Q65 165 55 140 Q42 110 45 75 Q50 30 90 30Z" />
        </clipPath>
      </defs>
      <path d="M90 30 Q130 30 135 75 Q138 110 125 140 Q115 165 90 170 Q65 165 55 140 Q42 110 45 75 Q50 30 90 30Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
      <path d="M90 45 Q82 70 88 100 Q92 130 90 155" fill="none" stroke={c.cupStroke} strokeWidth="1.5" strokeLinecap="round" />
      <motion.rect x="40" width="100" height="105" fill={`url(#${u}bFill-gc)`} clipPath={`url(#${u}beanClip-gc)`} opacity="0.85" initial={{ y: 170 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      {fillPct > 0.3 && <path d="M90 100 Q92 130 90 155" fill="none" stroke={p.isDark ? "#0a0805" : "#1a1412"} strokeWidth="1" strokeLinecap="round" opacity="0.3" />}
      {!p.isComplete && <CentralCount {...p} cx={90} cy={110} svgFont="28px" />}
      {p.isComplete && <CompleteMark cx={90} cy={105} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// D2: GRANO CON AROMA
// ═══════════════════════════════════════════
function GranoAroma(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 152 - fillPct * 72;
  const showVapor = fillPct > 0.2;

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[180px]">
      <defs>
        <radialGradient id={`${u}bFill-ga`} cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="60%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="100%" stopColor="#c8956c" />
        </radialGradient>
        <clipPath id={`${u}beanClip-ga`}>
          <path d="M90 50 Q120 50 123 85 Q125 110 118 130 Q112 148 90 152 Q68 148 62 130 Q55 110 57 85 Q60 50 90 50Z" />
        </clipPath>
      </defs>
      {showVapor && <>
        <motion.path d="M78 42 Q75 30 78 20" fill="none" stroke={c.cupStroke} strokeWidth="1" strokeLinecap="round" animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }} />
        <motion.path d="M90 38 Q87 25 90 15" fill="none" stroke={c.cupStroke} strokeWidth="1" strokeLinecap="round" animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }} />
        <motion.path d="M102 42 Q105 30 102 20" fill="none" stroke={c.cupStroke} strokeWidth="1" strokeLinecap="round" animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2.2, repeat: Infinity }} />
      </>}
      <path d="M90 50 Q120 50 123 85 Q125 110 118 130 Q112 148 90 152 Q68 148 62 130 Q55 110 57 85 Q60 50 90 50Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
      <path d="M90 60 Q84 80 88 100 Q92 120 90 142" fill="none" stroke={c.cupStroke} strokeWidth="1.5" strokeLinecap="round" />
      <motion.rect x="54" width="72" height="72" fill={`url(#${u}bFill-ga)`} clipPath={`url(#${u}beanClip-ga)`} opacity="0.85" initial={{ y: 152 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      {!p.isComplete && <CentralCount {...p} cx={90} cy={108} svgFont="26px" />}
      {p.isComplete && <CompleteMark cx={90} cy={105} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// E1: COLD BREW
// ═══════════════════════════════════════════
function ColdBrew(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 184 - fillPct * 95;

  return (
    <svg viewBox="0 0 180 210" className="w-[150px] h-[185px]">
      <defs>
        <linearGradient id={`${u}cbFill`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#0a0805" : "#1a0f05"} />
          <stop offset="40%" stopColor={p.isDark ? "#1a0f05" : "#3d2810"} />
          <stop offset="80%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="100%" stopColor="#8b6b3d" />
        </linearGradient>
        <clipPath id={`${u}glassClip-cb`}>
          <path d="M62 40 L58 175 Q57 182 68 184 L112 184 Q123 182 122 175 L118 40Z" />
        </clipPath>
      </defs>
      <path d="M62 40 L58 175 Q57 182 68 184 L112 184 Q123 182 122 175 L118 40Z" fill={p.isDark ? "#1a1412" : "#faf7f4"} stroke={c.cupStroke} strokeWidth="1.5" opacity="0.9" />
      <path d="M60 40 L120 40" stroke={c.cupStroke} strokeWidth="3" strokeLinecap="round" />
      <motion.rect x="56" width="70" height="96" fill={`url(#${u}cbFill)`} clipPath={`url(#${u}glassClip-cb)`} opacity="0.85" initial={{ y: 184 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      {fillPct > 0.2 && <>
        <rect x="70" y="100" width="16" height="14" rx="3" fill={c.emptyFill} stroke={c.plateStroke} strokeWidth="0.8" opacity="0.7" transform="rotate(-8 78 107)" />
        <rect x="94" y="110" width="14" height="12" rx="3" fill={c.emptyFill} stroke={c.plateStroke} strokeWidth="0.8" opacity="0.6" transform="rotate(5 101 116)" />
      </>}
      <line x1="100" y1="20" x2="97" y2="140" stroke={c.cupStroke} strokeWidth="2.5" strokeLinecap="round" />
      {!p.isComplete && <CentralCount {...p} cx={82} cy={160} svgFont="22px" />}
      {p.isComplete && <CompleteMark cx={85} cy={155} isDark={p.isDark} size={22} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// E2: MATCHA LATTE
// ═══════════════════════════════════════════
function MatchaLatte(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const CUP_R = 58;
  const fr = (p.displayedStamps / p.maxStamps) * CUP_R;
  const matchaStroke = p.isDark ? "#5a7a3d" : "#a0b878";

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <radialGradient id={`${u}matchaFill-ml`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.isDark ? "#3d5a20" : "#5a7a3d"} />
          <stop offset="55%" stopColor={p.isDark ? "#5a7a3d" : "#7a9850"} />
          <stop offset="85%" stopColor="#a0b878" />
          <stop offset="100%" stopColor={p.isDark ? "#7a9850" : "#8ba860"} />
        </radialGradient>
        <clipPath id={`${u}cupClip-ml`}><circle cx="90" cy="90" r="58" /></clipPath>
      </defs>
      <circle cx="90" cy="90" r="78" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <circle cx="90" cy="90" r="62" fill="none" stroke={matchaStroke} strokeWidth="2.5" />
      <circle cx="90" cy="90" r="58" fill={c.emptyFill} />
      <path d="M148 78 Q170 78 170 90 Q170 102 148 102" fill="none" stroke={matchaStroke} strokeWidth="2.5" strokeLinecap="round" />
      <motion.circle cx={90} cy={90} fill={`url(#${u}matchaFill-ml)`} clipPath={`url(#${u}cupClip-ml)`} initial={{ r: 0 }} animate={{ r: fr }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      {fr > 20 && <path d="M75 88 Q80 82 85 88 Q90 94 95 88 Q100 82 105 88" fill="none" stroke={c.latteArt} strokeWidth="0.8" opacity="0.5" />}
      {!p.isComplete && <CentralCount {...p} cx={90} cy={85} />}
      {p.isComplete && <CompleteMark cx={90} cy={87} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// F1: ROL DE CANELA — la espiral se hornea sello a sello
// ═══════════════════════════════════════════

/** Espiral de Arquímedes precalculada (estática — solo depende de la geometría) */
const ROL_SPIRAL_PATH = (() => {
  const cx = 90, cy = 92, turns = 3.1, steps = 120, a = 4.2, b = 6.6;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI;
    const r = a + b * (t / (2 * Math.PI));
    const x = cx + r * Math.cos(t);
    const y = cy + r * Math.sin(t);
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d;
})();

function RolCanela(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const pct = p.displayedStamps / p.maxStamps;

  const doughLight = p.isDark ? "#3a2c1c" : "#e7d3b3";
  const doughDeep = p.isDark ? "#6b4d2a" : "#c89b63";
  const cinnamon = p.isDark ? "#8b5a2b" : "#7a4a22";
  const glaze = p.isDark ? "#e8ddd5" : "#fbf6ef";

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <radialGradient id={`${u}dough-rc`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={doughLight} />
          <stop offset="100%" stopColor={doughDeep} />
        </radialGradient>
        <clipPath id={`${u}rollClip-rc`}><circle cx="90" cy="92" r="52" /></clipPath>
        <filter id={`${u}glow-rc`}><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* Plato */}
      <ellipse cx="90" cy="150" rx="66" ry="9" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      {/* Orilla del rol */}
      <circle cx="90" cy="92" r="56" fill="none" stroke={c.cupStroke} strokeWidth="2.5"
        filter={p.isComplete ? `url(#${u}glow-rc)` : undefined} />
      <circle cx="90" cy="92" r="52" fill={c.emptyFill} />

      {/* Masa horneándose: el disco se tiñe con el progreso */}
      <motion.circle cx={90} cy={92} fill={`url(#${u}dough-rc)`} clipPath={`url(#${u}rollClip-rc)`}
        initial={{ r: 0 }} animate={{ r: pct * 52 }}
        transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />

      {/* La espiral de canela se DIBUJA con el progreso */}
      <motion.path d={ROL_SPIRAL_PATH} fill="none" stroke={cinnamon} strokeWidth="5.5"
        strokeLinecap="round" clipPath={`url(#${u}rollClip-rc)`}
        initial={{ pathLength: 0 }} animate={{ pathLength: pct }}
        transition={{ duration: p.isNewStamp ? 0.9 : 0.55, ease: [0.16, 1, 0.3, 1] }} />
      {/* Brillo fino sobre el surco */}
      <motion.path d={ROL_SPIRAL_PATH} fill="none" stroke={glaze} strokeWidth="1.2"
        strokeLinecap="round" opacity={0.45} clipPath={`url(#${u}rollClip-rc)`}
        initial={{ pathLength: 0 }} animate={{ pathLength: pct }}
        transition={{ duration: p.isNewStamp ? 0.9 : 0.55, ease: [0.16, 1, 0.3, 1] }} />

      {/* Ripple al sumar sello */}
      <AnimatePresence>
        {p.isNewStamp && (
          <motion.circle cx={90} cy={92} fill="none" stroke={c.accent} strokeWidth={1.5}
            clipPath={`url(#${u}rollClip-rc)`}
            initial={{ r: pct * 52 * 0.5, opacity: 0.8 }}
            animate={{ r: pct * 52 + 8, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }} />
        )}
      </AnimatePresence>

      {/* Completa: glaseado que escurre + azúcar */}
      {p.isComplete && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}>
          <motion.path
            d="M52 80 Q62 96 56 112 M78 64 Q72 82 82 96 M104 66 Q112 84 100 100 M126 84 Q120 100 128 116 M90 60 Q86 78 94 92"
            fill="none" stroke={glaze} strokeWidth="3.4" strokeLinecap="round"
            clipPath={`url(#${u}rollClip-rc)`}
            initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ duration: 1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }} />
          <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            transition={{ delay: 0.9, ease: [0.16, 1, 0.3, 1] }}>
            {[[70, 76], [110, 80], [88, 116], [120, 104], [62, 100]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.6" fill={glaze} opacity="0.85" />
            ))}
          </motion.g>
        </motion.g>
      )}

      {!p.isComplete && <CentralCount {...p} cx={90} cy={88} />}
      {p.isComplete && <CompleteMark cx={90} cy={90} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// F2: V60 POUR OVER — gotea y el servidor se llena
// ═══════════════════════════════════════════
function V60Goteo(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const pct = p.displayedStamps / p.maxStamps;

  // Nivel del café en el servidor. Fondo y=178, tope máx y=126.
  const serverBottom = 178;
  const serverTopMax = 126;
  const liquidY = serverBottom - pct * (serverBottom - serverTopMax);
  const drips = pct > 0 && pct < 1;

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[178px]">
      <defs>
        <linearGradient id={`${u}drip-v60`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="100%" stopColor={p.isDark ? "#1a0f05" : "#3d2810"} />
        </linearGradient>
        <clipPath id={`${u}serverClip-v60`}>
          <path d="M58 120 L62 172 Q63 180 74 180 L106 180 Q117 180 118 172 L122 120Z" />
        </clipPath>
        <filter id={`${u}glow-v60`}><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* ── Servidor (jarra) ── */}
      <path d="M58 120 L62 172 Q63 180 74 180 L106 180 Q117 180 118 172 L122 120Z"
        fill={p.isDark ? "#1a1412" : "#faf7f4"} stroke={c.cupStroke} strokeWidth="2" opacity="0.92"
        filter={p.isComplete ? `url(#${u}glow-v60)` : undefined} />
      <path d="M56 120 L124 120" stroke={c.cupStroke} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M122 130 Q140 132 140 150 Q140 166 122 166" fill="none" stroke={c.handleStroke} strokeWidth="2.5" strokeLinecap="round" />

      {/* Café acumulado */}
      <motion.rect x="56" width="68" height="60"
        fill={`url(#${u}drip-v60)`} clipPath={`url(#${u}serverClip-v60)`} opacity="0.9"
        initial={{ y: serverBottom }} animate={{ y: liquidY }}
        transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />

      {/* ── Dripper cónico V60 ── */}
      <path d="M60 54 L120 54 L102 96 L78 96 Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
      {[72, 84, 96, 108].map((x, i) => (
        <line key={i} x1={x} y1="56" x2={90 + (x - 90) * 0.42} y2="94" stroke={c.cupStroke} strokeWidth="0.8" opacity="0.4" />
      ))}
      <ellipse cx="90" cy="54" rx="30" ry="5" fill={p.isDark ? "#221c1a" : "#fdfbf9"} stroke={c.cupStroke} strokeWidth="1.5" />
      {/* Cama de café molido — se aclara conforme avanza la extracción */}
      <path d="M76 76 L104 76 L98 90 L82 90 Z"
        fill={p.isDark ? "#3d2810" : "#5a3f20"} opacity={0.55 - pct * 0.25} />

      {/* Gota cayendo (loop mientras gotea) */}
      {drips && (
        <motion.path d="M90 96 q-2.5 5 0 9 q2.5 -4 0 -9Z" fill={`url(#${u}drip-v60)`}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, liquidY - 104], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeIn", times: [0, 0.1, 0.85, 1] }} />
      )}

      {/* Ripple al sumar: onda en la superficie */}
      <AnimatePresence>
        {p.isNewStamp && pct > 0 && (
          <motion.circle cx={90} cy={liquidY} fill="none" stroke={c.accent} strokeWidth={1.5}
            clipPath={`url(#${u}serverClip-v60)`}
            initial={{ r: 6, opacity: 0.8 }} animate={{ r: 34, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }} />
        )}
      </AnimatePresence>

      {/* Completa: gota final dorada + pulso */}
      {p.isComplete && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }}>
          <motion.path d="M90 96 q-2.5 5 0 9 q2.5 -4 0 -9Z" fill={c.accent}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} />
          <motion.circle cx={90} cy={100} fill="none" stroke={c.accent} strokeWidth={1}
            initial={{ r: 1, opacity: 0.8 }} animate={{ r: 9, opacity: 0 }}
            transition={{ duration: 1, delay: 0.5, repeat: Infinity, repeatDelay: 0.6 }} />
        </motion.g>
      )}

      {!p.isComplete && <CentralCount {...p} cx={90} cy={148} svgFont="24px" textFill={pct > 0.45 ? "#f5f0ea" : undefined} />}
      {p.isComplete && <CompleteMark cx={90} cy={150} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// F3: DOS TAZAS BRINDIS — "Brindis de Barrio"
// ═══════════════════════════════════════════
function DosTazasBrindis(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const fillPct = p.displayedStamps / p.maxStamps;
  // El líquido sube de y=132 (vacío) a y=96 (lleno) en ambas tazas
  const topY = 132 - fillPct * 36;

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <linearGradient id={`${u}fill-dtb`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="55%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="100%" stopColor="#c8956c" />
        </linearGradient>
        <clipPath id={`${u}clipL-dtb`}>
          <path d="M40 96 L44 128 Q45 134 54 134 L70 134 Q79 134 80 128 L84 96Z" />
        </clipPath>
        <clipPath id={`${u}clipR-dtb`}>
          <path d="M96 96 L100 128 Q101 134 110 134 L126 134 Q135 134 136 128 L140 96Z" />
        </clipPath>
        <filter id={`${u}spark-dtb`}><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* Mesa compartida */}
      <line x1="22" y1="150" x2="158" y2="150" stroke={c.plateStroke} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="62" cy="150" rx="26" ry="4" fill="none" stroke={c.plateStroke} strokeWidth="1" opacity="0.5" />
      <ellipse cx="118" cy="150" rx="26" ry="4" fill="none" stroke={c.plateStroke} strokeWidth="1" opacity="0.5" />

      {/* ── Taza izquierda (se inclina al completar) ── */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
        animate={p.isComplete ? { rotate: 11, x: 7 } : { rotate: 0, x: 0 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <path d="M40 96 L44 128 Q45 134 54 134 L70 134 Q79 134 80 128 L84 96Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
        <path d="M84 102 Q98 102 98 112 Q98 122 84 122" fill="none" stroke={c.handleStroke} strokeWidth="2" strokeLinecap="round" />
        <motion.rect x="40" width="44" height="40" fill={`url(#${u}fill-dtb)`} clipPath={`url(#${u}clipL-dtb)`} opacity="0.92"
          initial={{ y: 134 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
        <path d="M40 96 L84 96" stroke={c.cupStroke} strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>

      {/* ── Taza derecha (espejo) ── */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
        animate={p.isComplete ? { rotate: -11, x: -7 } : { rotate: 0, x: 0 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <path d="M96 96 L100 128 Q101 134 110 134 L126 134 Q135 134 136 128 L140 96Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
        <path d="M96 102 Q82 102 82 112 Q82 122 96 122" fill="none" stroke={c.handleStroke} strokeWidth="2" strokeLinecap="round" />
        <motion.rect x="96" width="44" height="40" fill={`url(#${u}fill-dtb)`} clipPath={`url(#${u}clipR-dtb)`} opacity="0.92"
          initial={{ y: 134 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
        <path d="M96 96 L140 96" stroke={c.cupStroke} strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>

      {/* Ripple en nuevo sello — aro sobre AMBAS tazas */}
      <AnimatePresence>
        {p.isNewStamp && !p.isComplete && (
          <>
            <motion.circle cx={62} cy={topY + 4} fill="none" stroke={c.accent} strokeWidth={1.5}
              initial={{ r: 8, opacity: 0.8 }} animate={{ r: 26, opacity: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }} />
            <motion.circle cx={118} cy={topY + 4} fill="none" stroke={c.accent} strokeWidth={1.5}
              initial={{ r: 8, opacity: 0.8 }} animate={{ r: 26, opacity: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.08, ease: "easeOut" }} />
          </>
        )}
      </AnimatePresence>

      {/* Destello del brindis al completar */}
      {p.isComplete && (
        <motion.g style={{ transformBox: "fill-box", transformOrigin: "center" }}
          initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 1, 0.85], scale: [0.3, 1.3, 1] }}
          transition={{ duration: 0.7, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}>
          <g filter={`url(#${u}spark-dtb)`} stroke={c.accent} strokeWidth="1.6" strokeLinecap="round">
            <line x1="90" y1="86" x2="90" y2="76" />
            <line x1="90" y1="106" x2="90" y2="116" />
            <line x1="80" y1="96" x2="70" y2="96" />
            <line x1="100" y1="96" x2="110" y2="96" />
            <line x1="83" y1="89" x2="77" y2="83" />
            <line x1="97" y1="89" x2="103" y2="83" />
            <line x1="83" y1="103" x2="77" y2="109" />
            <line x1="97" y1="103" x2="103" y2="109" />
          </g>
          <circle cx="90" cy="96" r="2.6" fill={c.accent} filter={`url(#${u}spark-dtb)`} />
        </motion.g>
      )}

      {/* El contador vive en el aire entre las dos tazas */}
      {!p.isComplete && <CentralCount {...p} cx={90} cy={64} svgFont="30px" />}
      {p.isComplete && <CompleteMark cx={90} cy={58} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// F4: CORAZÓN LATTE ART — "Lo que se da, vuelve"
// ═══════════════════════════════════════════
function CorazonLatteArt(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const fillPct = p.displayedStamps / p.maxStamps;
  // Crema sube dentro del corazón: y=120 (vacío) → y=58 (lleno)
  const topY = 120 - fillPct * 62;
  const heartPath = "M90 116 C66 96 60 78 70 66 C78 56 90 60 90 72 C90 60 102 56 110 66 C120 78 114 96 90 116Z";

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <radialGradient id={`${u}crema-cla`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={p.isDark ? "#e8ddd5" : "#f5f0ea"} />
          <stop offset="60%" stopColor={p.isDark ? "#cabcae" : "#ece2d6"} />
          <stop offset="100%" stopColor={p.isDark ? "#a89e97" : "#d8cabb"} />
        </radialGradient>
        <radialGradient id={`${u}coffee-cla`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="80%" stopColor={p.isDark ? "#8b6b3d" : "#a07850"} />
          <stop offset="100%" stopColor={p.isDark ? "#a07850" : "#b08860"} />
        </radialGradient>
        <clipPath id={`${u}heartClip-cla`}><path d={heartPath} /></clipPath>
        <filter id={`${u}glow-cla`}><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* Taza cenital de fondo */}
      <circle cx="90" cy="90" r="74" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <circle cx="90" cy="90" r="60" fill="none" stroke={c.cupStroke} strokeWidth="2.5" filter={p.isComplete ? `url(#${u}glow-cla)` : undefined} />
      <circle cx="90" cy="90" r="56" fill={c.emptyFill} />
      <circle cx="90" cy="90" r="56" fill={`url(#${u}coffee-cla)`} opacity={fillPct > 0 ? 0.32 + fillPct * 0.45 : 0} />
      <path d="M146 78 Q168 78 168 90 Q168 102 146 102" fill="none" stroke={c.handleStroke} strokeWidth="2.5" strokeLinecap="round" />

      {/* Corazón: late una vez al completar */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        animate={p.isComplete ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={{ duration: 0.6, delay: 0.55, ease: "easeInOut" }}>
        {/* Crema que sube dentro del corazón */}
        <motion.rect x="56" width="68" height="64" fill={`url(#${u}crema-cla)`} clipPath={`url(#${u}heartClip-cla)`}
          initial={{ y: 120 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
        {/* Contorno que se dibuja trazo a trazo */}
        <motion.path d={heartPath} fill="none" stroke={c.latteArt} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: p.isComplete ? 1 : Math.max(fillPct, 0.04) }}
          transition={{ duration: p.isNewStamp ? 0.8 : 0.6, ease: [0.16, 1, 0.3, 1] }} />
      </motion.g>

      {/* Ripple en nuevo sello */}
      <AnimatePresence>
        {p.isNewStamp && (
          <motion.circle cx={90} cy={92} fill="none" stroke={c.accent} strokeWidth={1.5} clipPath={`url(#${u}heartClip-cla)`}
            initial={{ r: 10, opacity: 0.8 }} animate={{ r: 14 + fillPct * 34, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }} />
        )}
      </AnimatePresence>

      {/* Dos hilos de vapor que se cruzan al completar — comunión */}
      {p.isComplete && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ duration: 1, delay: 0.8 }} stroke={c.latteArt} strokeWidth="1" strokeLinecap="round" fill="none">
          <path d="M84 60 Q80 50 86 42 Q90 36 86 30" />
          <path d="M96 60 Q100 50 94 42 Q90 36 94 30" />
        </motion.g>
      )}

      {!p.isComplete && <CentralCount {...p} cx={90} cy={132} svgFont="22px" />}
      {p.isComplete && <CompleteMark cx={90} cy={128} isDark={p.isDark} size={22} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// F5: CONCHA — la costra se cuartea línea a línea
// ═══════════════════════════════════════════
function Concha(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const pct = p.displayedStamps / p.maxStamps;

  // El domo de la concha
  const DOME = "M40 120 Q40 58 90 56 Q140 58 140 120 Z";
  // Masa (pan) que sube con el progreso
  const breadTop = 120 - pct * 64; // 120 (vacío) → 56 (lleno)
  const crust = p.isDark ? "#c79a5a" : "#e8c98f";
  const crustLine = p.isDark ? "#7a5a2c" : "#b8915a";

  // Líneas del enrejado clásico — se revelan una por sello
  const lines = [
    "M62 60 L52 118", "M78 57 L72 120", "M90 56 L90 120",
    "M102 57 L108 120", "M118 60 L128 118",
    "M48 78 Q90 70 132 78", "M46 96 Q90 88 134 96", "M50 112 Q90 106 130 112",
  ];
  const linesToShow = Math.round(pct * lines.length);

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <linearGradient id={`${u}bread-co`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#3a2c1c" : "#d9b884"} />
          <stop offset="60%" stopColor={p.isDark ? "#5a3f20" : "#e7cfa0"} />
          <stop offset="100%" stopColor={crust} />
        </linearGradient>
        <clipPath id={`${u}domeClip-co`}><path d={DOME} /></clipPath>
        <filter id={`${u}glow-co`}><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* Charola */}
      <ellipse cx="90" cy="126" rx="58" ry="8" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      {/* Contorno del domo */}
      <path d={DOME} fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2.5"
        filter={p.isComplete ? `url(#${u}glow-co)` : undefined} />

      {/* Pan que sube */}
      <motion.rect x="38" width="104" height="68" fill={`url(#${u}bread-co)`}
        clipPath={`url(#${u}domeClip-co)`}
        initial={{ y: 120 }} animate={{ y: breadTop }}
        transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />

      {/* Enrejado: cada línea es un sello dibujándose */}
      <g clipPath={`url(#${u}domeClip-co)`}>
        {lines.map((d, i) => (
          <motion.path key={i} d={d} fill="none" stroke={crustLine}
            strokeWidth="2.2" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={i < linesToShow ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: p.isNewStamp ? 0.7 : 0.45, ease: [0.16, 1, 0.3, 1], delay: i < linesToShow ? (i % 3) * 0.05 : 0 }} />
        ))}
      </g>

      {/* Ripple al sumar */}
      <AnimatePresence>
        {p.isNewStamp && (
          <motion.circle cx={90} cy={95} fill="none" stroke={c.accent} strokeWidth={1.5}
            clipPath={`url(#${u}domeClip-co)`}
            initial={{ r: 18, opacity: 0.8 }} animate={{ r: 58, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }} />
        )}
      </AnimatePresence>

      {/* Completa: la costra brilla + pizca de azúcar */}
      {p.isComplete && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}>
          <motion.path d={DOME} fill="none" stroke={c.latteArt} strokeWidth="1"
            opacity="0.5" clipPath={`url(#${u}domeClip-co)`}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.4 }} />
          {[[66, 72], [96, 68], [114, 84], [78, 100], [108, 104], [90, 84]].map(([x, y], i) => (
            <motion.circle key={i} cx={x} cy={y} r="1.5" fill={c.latteArt}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 0.8 }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              transition={{ delay: 0.6 + i * 0.06, ease: [0.16, 1, 0.3, 1] }} />
          ))}
        </motion.g>
      )}

      {!p.isComplete && <CentralCount {...p} cx={90} cy={92} svgFont="30px" />}
      {p.isComplete && <CompleteMark cx={90} cy={92} isDark={p.isDark} />}
    </svg>
  );
}

// ═══════════════════════════════════════════
// F6: PRENSA FRANCESA — el émbolo baja y el café prensado crece ARRIBA del filtro
// ═══════════════════════════════════════════
function PrensaFrancesa(p: IllustrationProps) {
  const c = colors(p.isDark);
  const u = p.uid ?? "";
  const pct = p.displayedStamps / p.maxStamps;

  // Recorrido del émbolo: arriba (y=64) → fondo (y=126). Baja con el progreso.
  const plungerTop = 64;
  const plungerBottom = 126;
  const plungerY = plungerTop + pct * (plungerBottom - plungerTop);

  // Café PRENSADO: crece ARRIBA del filtro conforme el émbolo baja
  // (física real: lo claro/molido queda abajo del filtro, lo bebible arriba)
  const GLASS_TOP = 58;
  const brewH = Math.max(0, plungerY - 6 - GLASS_TOP);

  return (
    <svg viewBox="0 0 180 200" className="w-[155px] h-[175px]">
      <defs>
        <linearGradient id={`${u}brew-fp`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="60%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="100%" stopColor={p.isDark ? "#1a0f05" : "#3d2810"} />
        </linearGradient>
        <linearGradient id={`${u}metal-fp`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#5a524c" : "#d8d0c8"} />
          <stop offset="45%" stopColor={p.isDark ? "#9a9088" : "#f5f0ea"} />
          <stop offset="55%" stopColor={p.isDark ? "#9a9088" : "#f5f0ea"} />
          <stop offset="100%" stopColor={p.isDark ? "#4a4240" : "#c7b7a3"} />
        </linearGradient>
        <clipPath id={`${u}glassClip-fp`}>
          <path d="M52 56 L52 128 Q52 134 60 134 L120 134 Q128 134 128 128 L128 56Z" />
        </clipPath>
      </defs>

      {/* Mesa */}
      <ellipse cx="90" cy="172" rx="58" ry="8" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />

      {/* Cuerpo de vidrio */}
      <path d="M52 56 L52 128 Q52 134 60 134 L120 134 Q128 134 128 128 L128 56Z"
        fill={p.isDark ? "#1a1412" : "#faf7f4"} stroke={c.cupStroke} strokeWidth="2" opacity="0.92" />

      {/* Café prensado (arriba del filtro, crece al bajar el émbolo) */}
      <motion.rect x="52" y={GLASS_TOP} width="76"
        fill={`url(#${u}brew-fp)`} clipPath={`url(#${u}glassClip-fp)`} opacity="0.9"
        initial={{ height: 0 }} animate={{ height: brewH }}
        transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />

      {/* Cama de molido al fondo (se compacta, sutil) */}
      <rect x="54" y="124" width="72" height="9" rx="2"
        fill={p.isDark ? "#2a1c0e" : "#5a3f20"} opacity={0.35 + pct * 0.3}
        clipPath={`url(#${u}glassClip-fp)`} />

      {/* Banda metálica superior + pico + asa */}
      <rect x="50" y="44" width="80" height="14" rx="3" fill={`url(#${u}metal-fp)`} stroke={c.cupStroke} strokeWidth="1" />
      <path d="M128 50 Q140 48 142 56" fill="none" stroke={c.cupStroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M128 66 Q150 68 150 92 Q150 116 128 118" fill="none" stroke={c.handleStroke} strokeWidth="2.5" strokeLinecap="round" />

      {/* Vástago del émbolo */}
      <motion.line x1="90" x2="90" y1="14"
        stroke={`url(#${u}metal-fp)`} strokeWidth="4" strokeLinecap="round"
        initial={{ y2: plungerTop }} animate={{ y2: plungerY }}
        transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      {/* Perilla (baja con el vástago, proporcional) */}
      <motion.g
        initial={{ y: 0 }} animate={{ y: (plungerY - plungerTop) * 0.35 }}
        transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <ellipse cx="90" cy="14" rx="14" ry="6" fill={`url(#${u}metal-fp)`} stroke={c.cupStroke} strokeWidth="1" />
      </motion.g>
      {/* Disco del filtro */}
      <motion.g initial={{ y: plungerTop }} animate={{ y: plungerY }}
        transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <ellipse cx="90" cy="0" rx="36" ry="6" fill={`url(#${u}metal-fp)`} stroke={c.cupStroke} strokeWidth="1.2" />
        {[-22, -11, 0, 11, 22].map((dx, i) => (
          <circle key={i} cx={90 + dx} cy="0" r="1.1" fill={p.isDark ? "#2a2722" : "#b8a89a"} opacity="0.7" />
        ))}
      </motion.g>

      {/* Ripple al sumar: anillo en la línea del filtro */}
      <AnimatePresence>
        {p.isNewStamp && brewH > 4 && (
          <motion.circle cx={90} cy={plungerY - 6} fill="none" stroke={c.accent} strokeWidth={1.5}
            clipPath={`url(#${u}glassClip-fp)`}
            initial={{ r: 8, opacity: 0.8 }} animate={{ r: 40, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }} />
        )}
      </AnimatePresence>

      {/* Completa: vapor del café recién prensado */}
      {p.isComplete && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}>
          <motion.path d="M76 50 Q72 38 76 28" fill="none" stroke={c.latteArt} strokeWidth="1.2" strokeLinecap="round"
            animate={{ opacity: [0.15, 0.45, 0.15] }} transition={{ duration: 2.4, repeat: Infinity }} />
          <motion.path d="M90 48 Q86 35 90 24" fill="none" stroke={c.latteArt} strokeWidth="1.2" strokeLinecap="round"
            animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2.8, repeat: Infinity }} />
          <motion.path d="M104 50 Q108 38 104 28" fill="none" stroke={c.latteArt} strokeWidth="1.2" strokeLinecap="round"
            animate={{ opacity: [0.15, 0.45, 0.15] }} transition={{ duration: 2.6, repeat: Infinity }} />
        </motion.g>
      )}

      {!p.isComplete && <CentralCount {...p} cx={90} cy={92} svgFont="24px" textFill={pct > 0.55 ? "#f5f0ea" : undefined} />}
      {p.isComplete && <CompleteMark cx={90} cy={92} isDark={p.isDark} size={24} />}
    </svg>
  );
}

// ─── Shared sub-components ───

function CentralCount({ animatedStamps, maxStamps, displayedStamps, isDark, cx, cy, svgFont = "34px", textFill, realStamps, realMaxStamps }: IllustrationProps & { cx: number; cy: number; svgFont?: string; textFill?: string }) {
  const c = colors(isDark);
  // Mostrar conteo real (sin bonus) si se provee, sino usar el visual
  const showStamps = realStamps != null ? realStamps : animatedStamps;
  const showMax = realMaxStamps ?? maxStamps;
  const empty = displayedStamps === 0;
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: empty ? 0.6 : 0.9 }} transition={{ duration: 0.4 }}>
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "var(--font-display)", fontSize: empty ? "28px" : svgFont, fill: textFill ?? (empty ? c.textGhost : c.textLight), fontWeight: 300 }}>{showStamps}</text>
      <text x={cx} y={cy + 21} textAnchor="middle" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "5.5px", fill: empty ? c.subtextGhost : (textFill ?? c.textLight), letterSpacing: "2.5px", textTransform: "uppercase" as const, opacity: 0.7 }}>de {showMax}</text>
    </motion.g>
  );
}

function CompleteMark({ cx, cy, isDark, size = 28 }: { cx: number; cy: number; isDark: boolean; size?: number }) {
  const c = colors(isDark);
  return (
    <motion.text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "var(--font-display)", fontSize: `${size}px`, fill: c.textLight, fontWeight: 300 }} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 0.7, scale: 1 }} transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}>✓</motion.text>
  );
}

// ─── Mapa de componentes ───

const ILLUSTRATION_MAP: Record<IllustrationId, React.FC<IllustrationProps>> = {
  "flat-white-cenital": FlatWhiteCenital,
  "latte-lateral": LatteLateral,
  "cappuccino-cenital": CappuccinoCenital,
  "espresso-shot": EspressoShot,
  "cupcake": Cupcake,
  "rebanada-pastel": RebanadaPastel,
  "tag-descuento": TagDescuento,
  "monedas": Monedas,
  "grano-cenital": GranoCenital,
  "grano-aroma": GranoAroma,
  "cold-brew": ColdBrew,
  "matcha-latte": MatchaLatte,
  "rol-canela": RolCanela,
  "v60-goteo": V60Goteo,
  "dos-tazas-brindis": DosTazasBrindis,
  "corazon-latte-art": CorazonLatteArt,
  "concha": Concha,
  "prensa-francesa": PrensaFrancesa,
};

export function StampIllustration({ id, ...props }: IllustrationProps & { id: IllustrationId }) {
  const uid = useId().replace(/:/g, "");
  const Component = ILLUSTRATION_MAP[id] ?? FlatWhiteCenital;
  return <Component {...props} uid={uid} />;
}
