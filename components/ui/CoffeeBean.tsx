import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export function CoffeeBean({
  active,
  isNew,
  isGift,
  isMilestone,
  isAlmostDone,
}: {
  active: boolean;
  isNew?: boolean;
  isGift?: boolean;
  /** True when this stamp completes the halfway point */
  isMilestone?: boolean;
  /** True when only 1-2 stamps remain (urgency visual) */
  isAlmostDone?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // El sello de bienvenida usa un tono más suave para diferenciarse
  const giftBg = isDark ? "#9A7A3A" : "#6B5A4A";
  const activeBg = isDark ? "#C4954A" : "#3A2F2A";
  const inactiveBg = isDark ? "#3A3230" : "#E6DED7";
  const almostBg = isDark ? "#D4A85A" : "#2A1F1A";

  const bg = active
    ? isGift
      ? giftBg
      : isAlmostDone
        ? almostBg
        : activeBg
    : inactiveBg;

  // Glow color for milestones and almost-done states
  const glowColor = isDark
    ? "rgba(196, 149, 74, 0.5)"
    : "rgba(58, 47, 42, 0.3)";

  const almostGlow = isDark
    ? "rgba(212, 168, 90, 0.6)"
    : "rgba(42, 31, 26, 0.4)";

  return (
    <motion.div
      initial={false}
      animate={
        isNew
          ? { scale: [0, 1.35, 1] }
          : active
            ? { scale: [0.85, 1.1, 1] }
            : { scale: 1 }
      }
      transition={{ duration: isNew ? 0.55 : 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-7 h-7 rounded-full flex items-center justify-center relative"
      style={{ background: bg }}
    >
      {/* Pulse glow ring for milestone stamps */}
      {active && isMilestone && (
        <motion.div
          className="absolute inset-[-3px] rounded-full"
          style={{
            border: `1.5px solid ${glowColor}`,
          }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Urgency glow for almost-done stamps */}
      {active && isAlmostDone && !isGift && (
        <motion.div
          className="absolute inset-[-2px] rounded-full"
          style={{
            background: `radial-gradient(circle, ${almostGlow} 0%, transparent 70%)`,
          }}
          animate={{
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {isGift ? (
        // Icono de regalo/estrella para el sello de bienvenida
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-3.5 h-3.5 relative z-10"
          aria-hidden="true"
        >
          <path
            d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.93L8 10.67l-3.52 1.68.67-3.93L2.3 5.64l3.94-.57L8 1.5z"
            fill={isDark ? "rgba(26,20,18,0.7)" : "rgba(250,247,244,0.8)"}
          />
        </svg>
      ) : (
        <div
          className="h-4 w-[2px] rounded-full relative z-10"
          style={{
            background: active
              ? isDark ? "rgba(26,20,18,0.7)" : "rgba(250,247,244,0.7)"
              : isDark ? "rgba(196,149,74,0.3)" : "rgba(58,47,42,0.3)",
          }}
        />
      )}
    </motion.div>
  );
}
