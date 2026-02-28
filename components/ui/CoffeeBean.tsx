import { motion } from "framer-motion";

export function CoffeeBean({ active, isNew }: { active: boolean; isNew?: boolean }) {
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
      className={`
        w-7 h-7 rounded-full
        ${active ? "bg-[#3A2F2A]" : "bg-[#E6DED7]"}
        flex items-center justify-center
      `}
    >
      <div
        className={`h-4 w-[2px] rounded-full ${
          active ? "bg-[#FAF7F4]/70" : "bg-[#3A2F2A]/30"
        }`}
      />
    </motion.div>
  );
}
