"use client";

import { motion, AnimatePresence } from "framer-motion";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const visible = pullDistance > 8 || refreshing;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: pullDistance || 40 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center justify-center overflow-hidden"
        >
          <motion.div
            className="w-8 h-8 flex items-center justify-center"
            animate={refreshing ? { rotate: 360 } : { rotate: progress * 180 }}
            transition={
              refreshing
                ? { duration: 0.8, repeat: Infinity, ease: "linear" }
                : { duration: 0 }
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-amber-600 dark:text-amber-500"
              style={{ opacity: Math.max(progress, refreshing ? 1 : 0.3) }}
            >
              {refreshing ? (
                // Spinner
                <>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </>
              ) : (
                // Arrow down
                <>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </>
              )}
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
