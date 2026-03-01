"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("splash-seen");
    if (!seen) {
      setVisible(true);
      sessionStorage.setItem("splash-seen", "1");
      const t = setTimeout(() => setVisible(false), 1100);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d0d0d] overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Film grain — mismo que el home */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "128px 128px",
              opacity: 0.18,
              mixBlendMode: "overlay",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center select-none"
          >
            <p className="font-display text-5xl sm:text-6xl font-light tracking-[0.35em] uppercase text-stone-100">
              La Commune
            </p>
            <div className="w-6 h-px bg-stone-700 mx-auto mt-4" />
            <p className="text-[10px] uppercase tracking-[0.4em] text-stone-500 mt-4">
              Pachuca · Hidalgo
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
