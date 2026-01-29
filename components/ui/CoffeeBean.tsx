import { motion } from "framer-motion";

export function CoffeeBean({ active }: { active: boolean }) {
    return (
      <motion.div
        initial={false}
        animate={active ? { scale: [0.85, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`
            w-7 h-7 rounded-full
            ${
              active
                ? "bg-[#3A2F2A]"
                : "bg-[#E6DED7]"
            }
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
  