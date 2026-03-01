"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const [visible, setVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);

  const x = useSpring(rawX, { stiffness: 500, damping: 40, mass: 0.3 });
  const y = useSpring(rawY, { stiffness: 500, damping: 40, mass: 0.3 });

  useEffect(() => {
    if ("ontouchstart" in window) {
      setIsTouch(true);
      return;
    }

    const move = (e: MouseEvent) => {
      rawX.set(e.clientX - 4);
      rawY.set(e.clientY - 4);
      if (!visible) setVisible(true);
    };

    const hide = () => setVisible(false);
    const show = () => setVisible(true);

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseleave", hide);
    document.addEventListener("mouseenter", show);

    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseleave", hide);
      document.removeEventListener("mouseenter", show);
    };
  }, [rawX, rawY, visible]);

  if (isTouch) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 w-2 h-2 rounded-full bg-white pointer-events-none z-[9998] mix-blend-difference"
      style={{ x, y }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.2 } }}
    />
  );
}
