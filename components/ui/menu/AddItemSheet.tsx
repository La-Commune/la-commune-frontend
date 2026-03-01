"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useFirestore } from "reactfire";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { addMenuItem } from "@/services/menu.service";

export function AddItemSheet({
  sectionId,
  onAdded,
  onCancel,
  nextOrder,
}: {
  sectionId: string;
  onAdded: () => void;
  onCancel: () => void;
  nextOrder: number;
}) {
  const firestore = useFirestore();
  const keyboardOffset = useKeyboardOffset();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await addMenuItem(firestore, sectionId, {
      name: name.trim(),
      price: price ? Number(price) : undefined,
      ingredients: ingredients.split(",").map((s) => s.trim()).filter(Boolean),
      note: note.trim() || undefined,
      available: true,
      tags: [],
      highlight: false,
      seasonal: false,
      order: nextOrder,
      schemaVersion: 1,
    });
    onAdded();
  };

  const inputCls =
    "w-full bg-neutral-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors";

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
        className="relative w-full max-w-sm bg-neutral-900 border-t sm:border border-stone-800 rounded-t-3xl sm:rounded-3xl px-6 pb-10 sm:pb-6 pt-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-stone-700 rounded-full mx-auto mb-2 sm:hidden" />
        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">Nuevo item</p>
        <input className={inputCls} placeholder="Nombre *" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input className={inputCls} placeholder="Precio  (ej: 45)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input className={inputCls} placeholder="Ingredientes separados por coma" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
        <input className={inputCls} placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-5 rounded-2xl bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-white transition-colors disabled:opacity-30"
          >
            {saving ? "Guardando…" : "Agregar"}
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-5 rounded-2xl border border-stone-800 text-stone-600 hover:text-stone-300 text-[11px] uppercase tracking-[0.3em] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
