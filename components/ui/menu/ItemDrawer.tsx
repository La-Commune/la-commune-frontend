"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useFirestore } from "reactfire";
import { MenuItem } from "@/models/menu.model";
import { updateMenuItem } from "@/services/menu.service";

export function ItemDrawer({
  item,
  sectionId,
  onClose,
  onUpdated,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  sectionId: string;
  onClose: () => void;
  onUpdated: (patch: Partial<MenuItem>) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const firestore = useFirestore();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await updateMenuItem(firestore, sectionId, item.id!, {
      available: !item.available,
    });
    onUpdated({ available: !item.available });
    setToggling(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className="relative w-full max-w-sm sm:max-w-xl bg-neutral-900 border-t sm:border border-stone-800 rounded-t-3xl sm:rounded-3xl px-6 pb-12 sm:pb-8 pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle — solo móvil */}
        <div className="w-10 h-1 bg-stone-700 rounded-full mx-auto mb-6 sm:hidden" />

        {/* Layout: columna en móvil, dos columnas en desktop */}
        <div className="flex flex-col sm:flex-row sm:gap-10">

          {/* ── Detalles del item ── */}
          <div className="flex-1 min-w-0 space-y-5 mb-7 sm:mb-0">

            {/* Nombre + badges */}
            <div className="space-y-2">
              <div className="flex items-start gap-3 flex-wrap">
                <h2
                  className="text-2xl font-light text-stone-100 leading-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.seasonal && (
                    <span className="text-[9px] uppercase tracking-widest text-emerald-500 border border-emerald-800/60 rounded-full px-2.5 py-1">
                      Temporada
                    </span>
                  )}
                  {item.highlight && (
                    <span className="text-[9px] uppercase tracking-widest text-amber-500 border border-amber-800/60 rounded-full px-2.5 py-1">
                      Especial
                    </span>
                  )}
                  <span
                    className={`text-[9px] uppercase tracking-widest rounded-full px-2.5 py-1 border ${
                      item.available
                        ? "text-stone-500 border-stone-800"
                        : "text-stone-700 border-stone-900"
                    }`}
                  >
                    {item.available ? "Disponible" : "No disponible hoy"}
                  </span>
                </div>
              </div>
            </div>

            {/* Precio / tamaños */}
            {item.sizes && item.sizes.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">Tamaños</p>
                <div className="flex gap-3 flex-wrap">
                  {item.sizes.map((s) => (
                    <span
                      key={s.label}
                      className="text-sm text-stone-400 border border-stone-800 rounded-xl px-3 py-1.5"
                    >
                      {s.label} <span className="text-stone-600">${s.price}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : item.price ? (
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">Precio</p>
                <p className="text-2xl font-light text-stone-300">${item.price}</p>
              </div>
            ) : null}

            {/* Ingredientes */}
            {item.ingredients.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">Ingredientes</p>
                <ul className="space-y-1">
                  {item.ingredients.map((ing) => (
                    <li key={ing} className="flex items-center gap-2.5 text-sm text-stone-400">
                      <span className="w-1 h-1 rounded-full bg-stone-700 shrink-0" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Nota */}
            {item.note && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">Nota</p>
                <p className="text-sm text-stone-500 italic leading-snug">{item.note}</p>
              </div>
            )}

            {/* Tags */}
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase tracking-widest text-stone-600 border border-stone-800 rounded-full px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Separador vertical en desktop ── */}
          <div className="hidden sm:block w-px bg-stone-800 shrink-0" />

          {/* ── Acciones ── */}
          <div className="sm:w-52 shrink-0 flex flex-col gap-3">

            {/* Toggle disponibilidad */}
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`w-full py-5 rounded-2xl border text-[11px] uppercase tracking-[0.35em] transition-all duration-200 disabled:opacity-40 ${
                item.available
                  ? "border-stone-800 text-stone-400 hover:border-stone-600 hover:bg-stone-900 hover:text-stone-200"
                  : "border-emerald-800/60 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40"
              }`}
            >
              {toggling
                ? "Guardando…"
                : item.available
                ? "No disponible hoy"
                : "Marcar disponible"}
            </button>

            {/* Editar */}
            <button
              onClick={() => { onClose(); onEdit(); }}
              className="w-full py-5 rounded-2xl border border-stone-800 text-stone-400 text-[11px] uppercase tracking-[0.35em] hover:border-stone-600 hover:bg-stone-900 hover:text-stone-200 transition-all duration-200"
            >
              Editar
            </button>

            {/* Separador antes del destructivo */}
            <div className="h-px bg-stone-800/60 my-1" />

            {/* Eliminar */}
            <button
              onClick={() => { onClose(); onDelete(); }}
              className="w-full py-5 rounded-2xl border border-stone-900 text-stone-700 text-[11px] uppercase tracking-[0.35em] hover:border-red-900/60 hover:bg-red-900/10 hover:text-red-600 transition-all duration-200"
            >
              Eliminar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
