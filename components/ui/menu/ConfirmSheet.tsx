"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DeleteTarget } from "./menu-admin.constants";

export function ConfirmSheet({
  target,
  onConfirm,
  onCancel,
}: {
  target: DeleteTarget;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:px-4"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className="relative w-full max-w-sm bg-neutral-900 border-t sm:border border-stone-800 rounded-t-3xl sm:rounded-3xl px-6 pb-10 sm:pb-6 pt-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-stone-700 rounded-full mx-auto mb-2 sm:hidden" />
        <div className="space-y-1 text-center">
          <p className="text-stone-300 text-sm leading-snug">
            ¿Eliminar <strong className="text-white font-normal">"{target.name}"</strong>?
          </p>
          {target.type === "section" && (
            <p className="text-[11px] text-stone-600">
              Se eliminarán también todos sus items.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handle}
            disabled={loading}
            className="flex-1 py-5 rounded-2xl bg-red-900/30 border border-red-800/50 text-red-400 text-[11px] uppercase tracking-[0.3em] hover:bg-red-900/50 transition-colors disabled:opacity-40"
          >
            {loading ? "Eliminando…" : "Eliminar"}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-5 rounded-2xl border border-stone-800 text-stone-500 text-[11px] uppercase tracking-[0.3em] hover:text-stone-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
