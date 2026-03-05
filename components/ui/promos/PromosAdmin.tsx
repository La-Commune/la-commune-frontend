"use client";

import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFirestore } from "reactfire";
import { Timestamp } from "firebase/firestore";
import { Promotion } from "@/models/promotion.model";
import {
  getPromotions,
  addPromotion,
  updatePromotion,
  deletePromotion,
} from "@/services/promotion.service";
import { toast } from "@/components/ui/use-toast";
import { Toggle } from "@/components/ui/menu/Toggle";
import { AddPromoSheet } from "./AddPromoSheet";
import { EditPromoSheet } from "./EditPromoSheet";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

function formatPromoDate(d: Timestamp | string): string {
  const date = d instanceof Timestamp ? d.toDate() : new Date(d);
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function isPromoLive(p: Promotion): boolean {
  if (!p.active) return false;
  const now = new Date();
  const start = p.startsAt instanceof Timestamp ? p.startsAt.toDate() : new Date(p.startsAt);
  const end = p.endsAt instanceof Timestamp ? p.endsAt.toDate() : new Date(p.endsAt);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

export function PromosAdmin() {
  const firestore = useFirestore();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    getPromotions(firestore)
      .then(setPromos)
      .catch(() => toast({ variant: "destructive", title: "Error al cargar promos" }))
      .finally(() => setLoading(false));
  }, [firestore]);

  useEffect(() => { reload(); }, [reload]);

  const handleToggleActive = async (promo: Promotion) => {
    await updatePromotion(firestore, promo.id!, { active: !promo.active });
    setPromos((prev) =>
      prev.map((p) => (p.id === promo.id ? { ...p, active: !p.active } : p))
    );
  };

  const handleDelete = async (promo: Promotion) => {
    await deletePromotion(firestore, promo.id!);
    setPromos((prev) => prev.filter((p) => p.id !== promo.id));
    toast({ title: `"${promo.title}" eliminada` });
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-stone-200 dark:bg-stone-900 animate-pulse h-24" style={{ opacity: 1 - (i - 1) * 0.3 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">

      {promos.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-stone-400 dark:text-stone-500 text-sm">Sin promociones</p>
          <p className="text-[11px] text-stone-300 dark:text-stone-700">Crea una promo para que aparezca en el menu y la app del cliente.</p>
        </div>
      )}

      <div className="space-y-3">
        {promos.map((promo) => {
          const live = isPromoLive(promo);
          return (
            <div
              key={promo.id}
              className={`rounded-2xl border overflow-hidden transition-opacity duration-300 ${
                !promo.active ? "opacity-40" : ""
              } ${live ? "border-amber-300 dark:border-amber-700/50" : "border-stone-200 dark:border-stone-800"}`}
            >
              <div className="flex items-start justify-between gap-3 px-5 py-4 bg-white dark:bg-neutral-900">
                <button
                  onClick={() => setEditing(promo)}
                  className="flex-1 min-w-0 text-left group"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-lg font-medium text-stone-800 dark:text-stone-100 leading-tight group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                      {promo.title}
                    </span>
                    {live && (
                      <span className="text-[9px] uppercase tracking-widest bg-amber-100 dark:bg-amber-600/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/50 rounded-full px-2 py-0.5">
                        Activa
                      </span>
                    )}
                    <span className="text-[9px] uppercase tracking-widest bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full px-2 py-0.5">
                      {promo.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 dark:text-stone-600 mt-1 line-clamp-2">
                    {promo.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[10px] text-stone-400 dark:text-stone-600">
                      {formatPromoDate(promo.startsAt)} — {formatPromoDate(promo.endsAt)}
                    </span>
                    {promo.daysOfWeek.length > 0 && promo.daysOfWeek.length < 7 && (
                      <span className="text-[10px] text-stone-300 dark:text-stone-700">
                        {promo.daysOfWeek.map((d) => DAY_LABELS[d]).join(", ")}
                      </span>
                    )}
                    {promo.appliesTo && (
                      <span className="text-[10px] text-stone-300 dark:text-stone-700 italic">
                        {promo.appliesTo}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-3 shrink-0 pt-1">
                  <Toggle checked={promo.active} onChange={() => handleToggleActive(promo)} label="" />
                  <button
                    onClick={() => handleDelete(promo)}
                    className="text-stone-200 dark:text-stone-800 hover:text-red-700 transition-colors"
                    aria-label="Eliminar promo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Boton nueva promo */}
      <button
        onClick={() => setAdding(true)}
        className="w-full mt-3 py-5 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 hover:border-stone-400 dark:hover:border-stone-600 hover:text-stone-600 dark:hover:text-stone-400 text-[10px] uppercase tracking-widest transition-all duration-200"
      >
        + Nueva promo
      </button>

      <AnimatePresence>
        {adding && (
          <AddPromoSheet
            key="add-promo"
            nextOrder={promos.length + 1}
            onAdded={() => { setAdding(false); reload(); }}
            onCancel={() => setAdding(false)}
          />
        )}
        {editing && (
          <EditPromoSheet
            key="edit-promo"
            promo={editing}
            onSaved={() => { setEditing(null); reload(); }}
            onCancel={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
