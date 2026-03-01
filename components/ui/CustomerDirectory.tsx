"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFirestore } from "reactfire";
import { Customer } from "@/models/customer.model";
import { getAllCustomers, updateCustomerNotes } from "@/services/customer.service";
import { formatDate } from "@/lib/utils";

type CustomerRow = Customer & { id: string };

/* ── Drawer de cliente ──────────────────────────────── */

function CustomerDrawer({
  customer,
  onClose,
  onNotesSaved,
}: {
  customer: CustomerRow;
  onClose: () => void;
  onNotesSaved: (id: string, notes: string) => void;
}) {
  const firestore = useFirestore();
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateCustomerNotes(firestore, customer.id, notes);
    onNotesSaved(customer.id, notes);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        className="relative w-full max-w-sm sm:max-w-lg bg-neutral-900 border-t sm:border border-stone-800 rounded-t-3xl sm:rounded-3xl px-6 pb-12 sm:pb-8 pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle móvil */}
        <div className="w-10 h-1 bg-stone-700 rounded-full mx-auto mb-6 sm:hidden" />

        <div className="flex flex-col sm:flex-row sm:gap-10">

          {/* Detalles */}
          <div className="flex-1 min-w-0 space-y-5 mb-7 sm:mb-0">
            <div className="space-y-1">
              <h2
                className="text-2xl font-light text-stone-100"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {customer.name || "Sin nombre"}
              </h2>
              {customer.phone && (
                <p className="text-sm text-stone-500">{customer.phone}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-stone-800 bg-neutral-950 px-4 py-3 text-center">
                <p className="text-2xl font-light text-stone-200">{customer.totalVisits ?? 0}</p>
                <p className="text-[10px] uppercase tracking-widest text-stone-600 mt-0.5">Visitas</p>
              </div>
              <div className="rounded-xl border border-stone-800 bg-neutral-950 px-4 py-3 text-center">
                <p className="text-2xl font-light text-stone-200">{customer.totalStamps ?? 0}</p>
                <p className="text-[10px] uppercase tracking-widest text-stone-600 mt-0.5">Sellos</p>
              </div>
            </div>

            {customer.lastVisitAt && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600 mb-0.5">Última visita</p>
                <p className="text-sm text-stone-400">{formatDate(customer.lastVisitAt)}</p>
              </div>
            )}
            {customer.createdAt && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600 mb-0.5">Miembro desde</p>
                <p className="text-sm text-stone-400">{formatDate(customer.createdAt)}</p>
              </div>
            )}
          </div>

          {/* Separador desktop */}
          <div className="hidden sm:block w-px bg-stone-800 shrink-0" />

          {/* Notas */}
          <div className="sm:w-52 shrink-0 flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-[0.35em] text-stone-600">Notas del barista</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Preferencias, alergias…"
              className="w-full bg-neutral-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors resize-none"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-2xl bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-white transition-colors disabled:opacity-30"
            >
              {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar nota"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Componente principal ───────────────────────────── */

export function CustomerDirectory() {
  const firestore = useFirestore();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAllCustomers(firestore)
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, [firestore]);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").includes(q)
    );
  });

  const handleNotesSaved = (id: string, notes: string) => {
    setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, notes } : c));
    setSelected((prev) => prev ? { ...prev, notes } : null);
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-stone-900 animate-pulse" style={{ opacity: 1 - (i - 1) * 0.2 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">

      {/* Buscador */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600 pointer-events-none">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o teléfono…"
          className="w-full bg-neutral-900 border border-stone-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors"
        />
      </div>

      {/* Conteo */}
      <p className="text-[10px] uppercase tracking-widest text-stone-700 text-right">
        {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
      </p>

      {/* Lista */}
      <div className="space-y-1.5">
        {filtered.map((customer) => (
          <button
            key={customer.id}
            onClick={() => setSelected(customer)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-stone-800 bg-neutral-900 hover:bg-stone-900/80 hover:border-stone-700 transition-all duration-150 text-left group"
          >
            {/* Avatar inicial */}
            <div className="w-9 h-9 rounded-full border border-stone-700 bg-neutral-950 flex items-center justify-center shrink-0">
              <span className="text-[13px] text-stone-400 font-light">
                {(customer.name ?? "?")[0]?.toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-sm text-stone-200 truncate">
                {customer.name || "Sin nombre"}
              </p>
              {customer.phone && (
                <p className="text-[11px] text-stone-600 truncate">{customer.phone}</p>
              )}
            </div>

            {/* Stats */}
            <div className="text-right shrink-0 space-y-0.5">
              <p className="text-[12px] tabular-nums text-stone-500">
                {customer.totalVisits ?? 0} visitas
              </p>
              {customer.lastVisitAt && (
                <p className="text-[10px] text-stone-700">{formatDate(customer.lastVisitAt)}</p>
              )}
            </div>

            {/* Flecha */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-stone-800 group-hover:text-stone-600 transition-colors shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        ))}

        {filtered.length === 0 && !loading && (
          <p className="text-center text-stone-700 text-sm py-8">Sin resultados</p>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selected && (
          <CustomerDrawer
            key={selected.id}
            customer={selected}
            onClose={() => setSelected(null)}
            onNotesSaved={handleNotesSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
