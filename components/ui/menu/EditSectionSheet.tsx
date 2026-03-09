"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { MenuSection } from "@/models/menu.model";
import { updateMenuSection } from "@/services/menu.service";

export function EditSectionSheet({
  section,
  onSaved,
  onCancel,
}: {
  section: MenuSection;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const keyboardOffset = useKeyboardOffset();
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !section.id) return;
    setSaving(true);
    await updateMenuSection(section.id, {
      title: title.trim(),
      description: description.trim(),
    });
    onSaved();
    setSaving(false);
    onCancel();
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
        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">Editar sección</p>
        <input
          className={inputCls}
          placeholder="Título *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
        <input
          className={inputCls}
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 py-5 rounded-2xl bg-stone-800 text-white dark:bg-stone-200 dark:text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-stone-900 dark:hover:bg-white transition-colors disabled:opacity-30"
          >
            {saving ? "Guardando…" : "Guardar"}
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
