import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export function CoffeeBean({
  active,
  isNew,
  isGift,
}: {
  active: boolean;
  isNew?: boolean;
  isGift?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // El sello de bienvenida usa un tono más suave para diferenciarse
  const giftBg = isDark ? "#9A7A3A" : "#6B5A4A";
  const activeBg = isDark ? "#C4954A" : "#3A2F2A";
  const inactiveBg = isDark ? "#3A3230" : "#E6DED7";

  const bg = active
    ? isGift ? giftBg : activeBg
    : inactiveBg;

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
      {isGift ? (
        // Icono de regalo/estrella para el sello de bienvenida
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="w-3.5 h-3.5"
          aria-hidden="true"
        >
          <path
            d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.93L8 10.67l-3.52 1.68.67-3.93L2.3 5.64l3.94-.57L8 1.5z"
            fill={isDark ? "rgba(26,20,18,0.7)" : "rgba(250,247,244,0.8)"}
          />
        </svg>
      ) : (
        <div
          className="h-4 w-[2px] rounded-full"
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
