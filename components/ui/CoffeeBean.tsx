import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export function CoffeeBean({ active, isNew }: { active: boolean; isNew?: boolean }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
      className="w-7 h-7 rounded-full flex items-center justify-center"
      style={{
        background: active
          ? isDark ? "#C4954A" : "#3A2F2A"
          : isDark ? "#3A3230" : "#E6DED7",
      }}
    >
      <div
        className="h-4 w-[2px] rounded-full"
        style={{
          background: active
            ? isDark ? "rgba(26,20,18,0.7)" : "rgba(250,247,244,0.7)"
            : isDark ? "rgba(196,149,74,0.3)" : "rgba(58,47,42,0.3)",
        }}
      />
    </motion.div>
  );
}
