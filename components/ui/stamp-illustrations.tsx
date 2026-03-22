"use client";

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
  | "matcha-latte";

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
  const CUP_R = 58;
  const fr = (p.displayedStamps / p.maxStamps) * CUP_R;

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <radialGradient id="coffeeFill-fw" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="55%" stopColor={p.isDark ? "#8b6b3d" : "#a07850"} />
          <stop offset="85%" stopColor="#c8956c" />
          <stop offset="100%" stopColor={p.isDark ? "#a07850" : "#b08860"} />
        </radialGradient>
        <clipPath id="cupClip-fw"><circle cx="90" cy="90" r="58" /></clipPath>
        <filter id="glow-fw"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx="90" cy="90" r="78" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <circle cx="90" cy="90" r="62" fill="none" stroke={c.cupStroke} strokeWidth="2.5" filter={p.isComplete ? "url(#glow-fw)" : undefined} />
      <circle cx="90" cy="90" r="58" fill={c.emptyFill} />
      <path d="M148 78 Q170 78 170 90 Q170 102 148 102" fill="none" stroke={c.handleStroke} strokeWidth="2.5" strokeLinecap="round" />
      <motion.circle cx={90} cy={90} fill="url(#coffeeFill-fw)" clipPath="url(#cupClip-fw)" initial={{ r: 0 }} animate={{ r: fr }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      <AnimatePresence>
        {p.isNewStamp && <motion.circle cx={90} cy={90} r={fr} fill="none" stroke={c.accent} strokeWidth={1.5} clipPath="url(#cupClip-fw)" initial={{ r: fr * 0.5, opacity: 0.8 }} animate={{ r: fr + 8, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />}
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
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 155 - fillPct * 65;

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[180px]">
      <defs>
        <linearGradient id="cFill-ll" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="50%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="100%" stopColor="#c8956c" />
        </linearGradient>
        <clipPath id="cupClip-ll">
          <path d="M45 50 Q42 50 40 55 L32 155 Q30 165 45 168 L135 168 Q150 165 148 155 L140 55 Q138 50 135 50Z" />
        </clipPath>
      </defs>
      <ellipse cx="90" cy="172" rx="75" ry="10" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <path d="M45 50 Q42 50 40 55 L32 155 Q30 165 45 168 L135 168 Q150 165 148 155 L140 55 Q138 50 135 50Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
      <path d="M140 70 Q165 70 165 100 Q165 130 140 130" fill="none" stroke={c.handleStroke} strokeWidth="2.5" strokeLinecap="round" />
      <motion.rect x="30" width="120" height="70" fill="url(#cFill-ll)" clipPath="url(#cupClip-ll)" opacity="0.9" initial={{ y: 170 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
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
  const CUP_R = 58;
  const fr = (p.displayedStamps / p.maxStamps) * CUP_R;

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <radialGradient id="foam-cap" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.isDark ? "#d4c8be" : "#f5f0ea"} />
          <stop offset="40%" stopColor={p.isDark ? "#a89e97" : "#e8ddd5"} />
          <stop offset="70%" stopColor={p.isDark ? "#7a706a" : "#d4c8be"} />
          <stop offset="100%" stopColor={p.isDark ? "#5a524c" : "#c7b7a3"} />
        </radialGradient>
        <clipPath id="cupClip-cap"><circle cx="90" cy="90" r="58" /></clipPath>
      </defs>
      <circle cx="90" cy="90" r="78" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <circle cx="90" cy="90" r="62" fill="none" stroke={c.cupStroke} strokeWidth="2.5" />
      <circle cx="90" cy="90" r="58" fill={c.emptyFill} />
      <path d="M148 78 Q170 78 170 90 Q170 102 148 102" fill="none" stroke={c.handleStroke} strokeWidth="2.5" strokeLinecap="round" />
      <motion.circle cx={90} cy={90} fill="url(#foam-cap)" clipPath="url(#cupClip-cap)" opacity="0.95" initial={{ r: 0 }} animate={{ r: fr }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
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
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 145 - fillPct * 42;

  return (
    <svg viewBox="0 0 180 200" className="w-[155px] h-[175px]">
      <defs>
        <linearGradient id="eFill-es" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#1a0f05" : "#3d2810"} />
          <stop offset="60%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="90%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="100%" stopColor="#c8956c" />
        </linearGradient>
        <clipPath id="cupClip-es">
          <path d="M55 80 Q52 80 50 85 L46 145 Q44 155 55 158 L125 158 Q136 155 134 145 L130 85 Q128 80 125 80Z" />
        </clipPath>
      </defs>
      <ellipse cx="90" cy="162" rx="55" ry="8" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <path d="M55 80 Q52 80 50 85 L46 145 Q44 155 55 158 L125 158 Q136 155 134 145 L130 85 Q128 80 125 80Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
      <path d="M130 90 Q150 90 150 110 Q150 130 130 130" fill="none" stroke={c.handleStroke} strokeWidth="2" strokeLinecap="round" />
      <motion.rect x="44" width="92" height="55" fill="url(#eFill-es)" clipPath="url(#cupClip-es)" opacity="0.95" initial={{ y: 158 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
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
  const pct = p.displayedStamps / p.maxStamps;
  const circumference = 2 * Math.PI * 65;
  const offset = circumference * (1 - pct);

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <linearGradient id="tagGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8956c" />
          <stop offset="100%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
        </linearGradient>
      </defs>
      <circle cx="90" cy="90" r="65" fill="none" stroke={p.isDark ? "#2a2722" : "#e8e0d8"} strokeWidth="6" />
      <motion.circle cx="90" cy="90" r="65" fill="none" stroke="url(#tagGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} transform="rotate(-90 90 90)" initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
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
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 170 - fillPct * 100;

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[180px]">
      <defs>
        <linearGradient id="bFill-gc" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#1a0f05" : "#3d2810"} />
          <stop offset="50%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="100%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
        </linearGradient>
        <clipPath id="beanClip-gc">
          <path d="M90 30 Q130 30 135 75 Q138 110 125 140 Q115 165 90 170 Q65 165 55 140 Q42 110 45 75 Q50 30 90 30Z" />
        </clipPath>
      </defs>
      <path d="M90 30 Q130 30 135 75 Q138 110 125 140 Q115 165 90 170 Q65 165 55 140 Q42 110 45 75 Q50 30 90 30Z" fill={c.emptyFill} stroke={c.cupStroke} strokeWidth="2" />
      <path d="M90 45 Q82 70 88 100 Q92 130 90 155" fill="none" stroke={c.cupStroke} strokeWidth="1.5" strokeLinecap="round" />
      <motion.rect x="40" width="100" height="105" fill="url(#bFill-gc)" clipPath="url(#beanClip-gc)" opacity="0.85" initial={{ y: 170 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
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
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 152 - fillPct * 72;
  const showVapor = fillPct > 0.2;

  return (
    <svg viewBox="0 0 180 200" className="w-[160px] h-[180px]">
      <defs>
        <radialGradient id="bFill-ga" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="60%" stopColor={p.isDark ? "#5a3f20" : "#8b6b3d"} />
          <stop offset="100%" stopColor="#c8956c" />
        </radialGradient>
        <clipPath id="beanClip-ga">
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
      <motion.rect x="54" width="72" height="72" fill="url(#bFill-ga)" clipPath="url(#beanClip-ga)" opacity="0.85" initial={{ y: 152 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
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
  const fillPct = p.displayedStamps / p.maxStamps;
  const topY = 184 - fillPct * 95;

  return (
    <svg viewBox="0 0 180 210" className="w-[150px] h-[185px]">
      <defs>
        <linearGradient id="cbFill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={p.isDark ? "#0a0805" : "#1a0f05"} />
          <stop offset="40%" stopColor={p.isDark ? "#1a0f05" : "#3d2810"} />
          <stop offset="80%" stopColor={p.isDark ? "#3d2810" : "#5a3f20"} />
          <stop offset="100%" stopColor="#8b6b3d" />
        </linearGradient>
        <clipPath id="glassClip-cb">
          <path d="M62 40 L58 175 Q57 182 68 184 L112 184 Q123 182 122 175 L118 40Z" />
        </clipPath>
      </defs>
      <path d="M62 40 L58 175 Q57 182 68 184 L112 184 Q123 182 122 175 L118 40Z" fill={p.isDark ? "#1a1412" : "#faf7f4"} stroke={c.cupStroke} strokeWidth="1.5" opacity="0.9" />
      <path d="M60 40 L120 40" stroke={c.cupStroke} strokeWidth="3" strokeLinecap="round" />
      <motion.rect x="56" width="70" height="96" fill="url(#cbFill)" clipPath="url(#glassClip-cb)" opacity="0.85" initial={{ y: 184 }} animate={{ y: topY }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
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
  const CUP_R = 58;
  const fr = (p.displayedStamps / p.maxStamps) * CUP_R;
  const matchaStroke = p.isDark ? "#5a7a3d" : "#a0b878";

  return (
    <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
      <defs>
        <radialGradient id="matchaFill-ml" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.isDark ? "#3d5a20" : "#5a7a3d"} />
          <stop offset="55%" stopColor={p.isDark ? "#5a7a3d" : "#7a9850"} />
          <stop offset="85%" stopColor="#a0b878" />
          <stop offset="100%" stopColor={p.isDark ? "#7a9850" : "#8ba860"} />
        </radialGradient>
        <clipPath id="cupClip-ml"><circle cx="90" cy="90" r="58" /></clipPath>
      </defs>
      <circle cx="90" cy="90" r="78" fill="none" stroke={c.plateStroke} strokeWidth="1.5" />
      <circle cx="90" cy="90" r="62" fill="none" stroke={matchaStroke} strokeWidth="2.5" />
      <circle cx="90" cy="90" r="58" fill={c.emptyFill} />
      <path d="M148 78 Q170 78 170 90 Q170 102 148 102" fill="none" stroke={matchaStroke} strokeWidth="2.5" strokeLinecap="round" />
      <motion.circle cx={90} cy={90} fill="url(#matchaFill-ml)" clipPath="url(#cupClip-ml)" initial={{ r: 0 }} animate={{ r: fr }} transition={{ duration: p.isNewStamp ? 0.8 : 0.5, ease: [0.16, 1, 0.3, 1] }} />
      {fr > 20 && <path d="M75 88 Q80 82 85 88 Q90 94 95 88 Q100 82 105 88" fill="none" stroke={c.latteArt} strokeWidth="0.8" opacity="0.5" />}
      {!p.isComplete && <CentralCount {...p} cx={90} cy={85} />}
      {p.isComplete && <CompleteMark cx={90} cy={87} isDark={p.isDark} />}
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
};

export function StampIllustration({ id, ...props }: IllustrationProps & { id: IllustrationId }) {
  const Component = ILLUSTRATION_MAP[id] ?? FlatWhiteCenital;
  return <Component {...props} />;
}
