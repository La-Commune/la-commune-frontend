"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useFirestore } from "reactfire";
import { Timestamp } from "firebase/firestore";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { Promotion } from "@/models/promotion.model";
import { updatePromotion } from "@/services/promotion.service";

const PROMO_TYPES = [
  { value: "2x1" as const, label: "2x1" },
  { value: "descuento" as const, label: "Descuento" },
  { value: "gratis" as const, label: "Gratis" },
  { value: "otro" as const, label: "Otro" },
];

const DAY_OPTIONS = [
  { value: 0, label: "D" },
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "Mi" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
];

function toDateStr(d: Timestamp | string): string {
  const date = d instanceof Timestamp ? d.toDate() : new Date(d);
  return date.toISOString().split("T")[0];
}

export function EditPromoSheet({
  promo,
  onSaved,
  onCancel,
}: {
  promo: Promotion;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const firestore = useFirestore();
  const keyboardOffset = useKeyboardOffset();
  const [title, setTitle] = useState(promo.title);
  const [description, setDescription] = useState(promo.description);
  const [type, setType] = useState(promo.type);
  const [startsAt, setStartsAt] = useState(toDateStr(promo.startsAt));
  const [endsAt, setEndsAt] = useState(toDateStr(promo.endsAt));
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(promo.daysOfWeek);
  const [appliesTo, setAppliesTo] = useState(promo.appliesTo ?? "");
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await updatePromotion(firestore, promo.id!, {
      title: title.trim(),
      description: description.trim(),
      type,
      startsAt: Timestamp.fromDate(new Date(startsAt + "T00:00:00")),
      endsAt: Timestamp.fromDate(new Date(endsAt + "T23:59:59")),
      daysOfWeek,
      appliesTo: appliesTo.trim() || undefined,
    });
    onSaved();
  };

  const inputCls =
    "w-full bg-white dark:bg-neutral-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 overflow-y-auto"
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
        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">Editar promo</p>

        <input className={inputCls} placeholder="Titulo *" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Descripcion" value={description} onChange={(e) => setDescription(e.target.value)} />

        {/* Tipo */}
        <div className="flex gap-2 flex-wrap">
          {PROMO_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`px-3 py-2 rounded-xl border text-[10px] uppercase tracking-widest transition-all duration-150 ${
                type === t.value
                  ? "border-stone-400 text-stone-700 dark:text-stone-200 bg-stone-200 dark:bg-stone-800"
                  : "border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 hover:border-stone-300 dark:hover:border-stone-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Fechas */}
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-600">Inicio</label>
            <input type="date" className={inputCls} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-600">Fin</label>
            <input type="date" className={inputCls} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>

        {/* Dias de la semana */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-600">
            Dias (vacio = todos)
          </label>
          <div className="flex gap-1.5">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => toggleDay(d.value)}
                className={`w-9 h-9 rounded-lg border text-[11px] transition-all duration-150 ${
                  daysOfWeek.includes(d.value)
                    ? "border-stone-400 text-stone-700 dark:text-stone-200 bg-stone-200 dark:bg-stone-800"
                    : "border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aplica a */}
        <input className={inputCls} placeholder="Aplica a (ej: Lattes, Espresso)" value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} />

        {/* Botones */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 py-5 rounded-2xl bg-stone-800 text-white dark:bg-stone-200 dark:text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-stone-900 dark:hover:bg-white transition-colors disabled:opacity-30"
          >
            {saving ? "Guardando..." : "Guardar"}
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
