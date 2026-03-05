"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useFirestore } from "reactfire";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { addMenuSection } from "@/services/menu.service";
import { SECTION_TYPES } from "./menu-admin.constants";

export function AddSectionSheet({
  onAdded,
  onCancel,
  nextOrder,
}: {
  onAdded: () => void;
  onCancel: () => void;
  nextOrder: number;
}) {
  const firestore = useFirestore();
  const keyboardOffset = useKeyboardOffset();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"drink" | "food" | "other">("drink");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await addMenuSection(firestore, {
      title: title.trim(),
      description: description.trim(),
      type,
      order: nextOrder,
      active: true,
      schemaVersion: 1,
    });
    onAdded();
  };

  const inputCls =
    "w-full bg-white dark:bg-neutral-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
      style={{ paddingBottom: keyboardOffset, transition: "padding-bottom 0.15s ease" }}
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className="relative w-full max-w-sm bg-white dark:bg-neutral-900 border-t sm:border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-3xl px-6 pb-10 sm:pb-6 pt-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mb-2 sm:hidden" />
        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">Nueva sección</p>
        <input className={inputCls} placeholder="Título *" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <input className={inputCls} placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-2">
          {SECTION_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex-1 py-2.5 rounded-xl border text-[10px] uppercase tracking-widest transition-all duration-150 ${
                type === t.value
                  ? "border-stone-400 text-stone-700 dark:text-stone-200 bg-stone-200 dark:bg-stone-800"
                  : "border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 hover:border-stone-300 dark:hover:border-stone-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 py-5 rounded-2xl bg-stone-800 text-white dark:bg-stone-200 dark:text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-stone-900 dark:hover:bg-white transition-colors disabled:opacity-30"
          >
            {saving ? "Guardando…" : "Crear sección"}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-5 rounded-2xl border border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-300 text-[11px] uppercase tracking-[0.3em] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
