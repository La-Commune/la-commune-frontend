"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFirestore } from "reactfire";
import { MenuSection, MenuItem } from "@/models/menu.model";
import {
  getFullMenu,
  updateMenuItem,
  addMenuItem,
  deleteMenuItem,
  addMenuSection,
  updateMenuSection,
  deleteMenuSection,
} from "@/services/menu.service";

/* ── Constantes ──────────────────────────────────────── */

const ITEM_TAGS = ["Fuerte", "Cremoso", "Dulce", "Gourmet", "Intenso", "Refrescante"];
const SECTION_TYPES = [
  { value: "drink", label: "Bebida" },
  { value: "food", label: "Alimento" },
  { value: "other", label: "Otro" },
] as const;

/* ── Toggle ──────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 text-[10px] uppercase tracking-widest transition-colors duration-200 ${
        checked ? "text-stone-300" : "text-stone-600"
      }`}
    >
      <span
        className={`w-8 h-4 rounded-full border transition-all duration-300 flex items-center px-0.5 ${
          checked ? "bg-stone-300 border-stone-300" : "bg-transparent border-stone-700"
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full transition-transform duration-300 ${
            checked ? "translate-x-4 bg-neutral-900" : "translate-x-0 bg-stone-700"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

/* ── Drawer: acciones de item ────────────────────────── */

function ItemDrawer({
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

      {/* Sheet — más ancho en desktop para mostrar detalles */}
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

/* ── Modal: editar item ───────────────────────────────── */

function EditItemModal({
  item,
  sectionId,
  onSaved,
  onClose,
}: {
  item: MenuItem;
  sectionId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const firestore = useFirestore();
  const [name, setName] = useState(item.name);
  const [note, setNote] = useState(item.note ?? "");
  const [ingredients, setIngredients] = useState(item.ingredients.join(", "));
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? "");
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [highlight, setHighlight] = useState(item.highlight);
  const [seasonal, setSeasonal] = useState(item.seasonal);
  const [saving, setSaving] = useState(false);

  // Precio vs tamaños
  const [pricingMode, setPricingMode] = useState<"single" | "sizes">(
    item.sizes && item.sizes.length > 0 ? "sizes" : "single"
  );
  const [price, setPrice] = useState(item.price?.toString() ?? "");
  const [sizes, setSizes] = useState<{ label: string; price: string }[]>(
    item.sizes?.map((s) => ({ label: s.label, price: s.price.toString() })) ??
      [{ label: "", price: "" }]
  );

  const addSize = () => setSizes((prev) => [...prev, { label: "", price: "" }]);
  const removeSize = (i: number) => setSizes((prev) => prev.filter((_, idx) => idx !== i));
  const updateSize = (i: number, field: "label" | "price", value: string) =>
    setSizes((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleSave = async () => {
    if (!name.trim() || !item.id) return;
    setSaving(true);

    const validSizes = sizes
      .filter((s) => s.label.trim() && s.price)
      .map((s) => ({ label: s.label.trim(), price: Number(s.price) }));

    const data: Partial<MenuItem> = {
      name: name.trim(),
      note: note.trim() || undefined,
      ingredients: ingredients.split(",").map((s) => s.trim()).filter(Boolean),
      imageUrl: imageUrl.trim() || undefined,
      tags,
      highlight,
      seasonal,
    };

    const clearFields: (keyof MenuItem)[] = [];

    if (pricingMode === "sizes" && validSizes.length > 0) {
      data.sizes = validSizes;
      clearFields.push("price");
    } else if (pricingMode === "single") {
      data.price = price ? Number(price) : undefined;
      clearFields.push("sizes");
    }

    await updateMenuItem(firestore, sectionId, item.id, data, clearFields);
    onSaved();
    setSaving(false);
    onClose();
  };

  const inputCls =
    "w-full bg-neutral-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors";
  const smallInputCls =
    "bg-neutral-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md bg-neutral-900 border border-stone-800 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">Editar</p>
          <button onClick={onClose} className="text-stone-700 hover:text-stone-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <input className={inputCls} placeholder="Nombre *" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder="Ingredientes separados por coma" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
        <input className={inputCls} placeholder="Nota opcional" value={note} onChange={(e) => setNote(e.target.value)} />

        {/* Imagen */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-stone-600">Imagen (URL)</p>
          <input
            className={inputCls}
            placeholder="https://…"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          {imageUrl.trim() && (
            <div className="w-full h-28 rounded-xl overflow-hidden border border-stone-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl.trim()}
                alt="preview"
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
        </div>

        {/* ── Precio / Tamaños ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-stone-600">Precio</p>
            {/* Toggle modo */}
            <div className="flex gap-1 p-0.5 bg-stone-900 border border-stone-800 rounded-lg">
              {(["single", "sizes"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPricingMode(mode)}
                  className={`px-3 py-1 rounded-md text-[10px] uppercase tracking-wider transition-all duration-150 ${
                    pricingMode === mode
                      ? "bg-stone-700 text-stone-200"
                      : "text-stone-600 hover:text-stone-400"
                  }`}
                >
                  {mode === "single" ? "Único" : "Por tamaño"}
                </button>
              ))}
            </div>
          </div>

          {pricingMode === "single" ? (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-600 text-sm">$</span>
              <input
                className="w-full bg-neutral-950 border border-stone-800 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors"
                placeholder="45"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {sizes.map((size, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className={`flex-1 ${smallInputCls}`}
                    placeholder="10 oz"
                    value={size.label}
                    onChange={(e) => updateSize(i, "label", e.target.value)}
                  />
                  <div className="relative w-24 shrink-0">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-600 text-sm">$</span>
                    <input
                      className={`w-full pl-6 pr-3 py-2.5 bg-neutral-950 border border-stone-800 rounded-xl text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors`}
                      placeholder="45"
                      type="number"
                      value={size.price}
                      onChange={(e) => updateSize(i, "price", e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => removeSize(i)}
                    disabled={sizes.length === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-stone-800 text-stone-700 hover:border-stone-600 hover:text-red-600 transition-colors disabled:opacity-20 shrink-0"
                    aria-label="Eliminar tamaño"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={addSize}
                className="w-full py-2.5 rounded-xl border border-dashed border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-400 text-[10px] uppercase tracking-widest transition-all duration-200"
              >
                + Agregar tamaño
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-stone-600">Tags</p>
          <div className="flex flex-wrap gap-2">
            {ITEM_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all duration-150 ${
                  tags.includes(tag)
                    ? "border-stone-400 text-stone-100 bg-stone-800"
                    : "border-stone-800 text-stone-600 hover:border-stone-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-5 pt-1">
          <Toggle checked={highlight} onChange={setHighlight} label="Especial" />
          <Toggle checked={seasonal} onChange={setSeasonal} label="Temporada" />
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full py-3.5 rounded-2xl bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-white transition-colors disabled:opacity-30 mt-2"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── Form: Nuevo item ─────────────────────────────────── */

function AddItemSheet({
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

/* ── Form: Nueva sección ──────────────────────────────── */

function AddSectionSheet({
  onAdded,
  onCancel,
  nextOrder,
}: {
  onAdded: () => void;
  onCancel: () => void;
  nextOrder: number;
}) {
  const firestore = useFirestore();
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
    "w-full bg-neutral-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
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
        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">Nueva sección</p>
        <input className={inputCls} placeholder="Título *" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <input className={inputCls} placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex gap-2">
          {SECTION_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex-1 py-2.5 rounded-xl border text-[10px] uppercase tracking-widest transition-all duration-150 ${
                type === t.value
                  ? "border-stone-400 text-stone-200 bg-stone-800"
                  : "border-stone-800 text-stone-600 hover:border-stone-700"
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
            className="flex-1 py-5 rounded-2xl bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-white transition-colors disabled:opacity-30"
          >
            {saving ? "Guardando…" : "Crear sección"}
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

/* ── Confirmación de borrado ─────────────────────────── */

interface DeleteTarget {
  type: "item" | "section";
  sectionId: string;
  itemId?: string;
  name: string;
}

function ConfirmSheet({
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

/* ── Componente principal ────────────────────────────── */

export function MenuAdmin() {
  const firestore = useFirestore();
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Overlays
  const [drawerItem, setDrawerItem] = useState<{ item: MenuItem; sectionId: string } | null>(null);
  const [editItem, setEditItem] = useState<{ item: MenuItem; sectionId: string } | null>(null);
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    getFullMenu(firestore).then((data) => { setSections(data); setLoading(false); });
  }, [firestore]);

  useEffect(() => { reload(); }, [reload]);

  // Actualizar item en estado local sin hacer reload completo
  const patchItem = (sectionId: string, itemId: string, patch: Partial<MenuItem>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId ? s : {
          ...s,
          items: s.items?.map((it) => it.id === itemId ? { ...it, ...patch } : it),
        }
      )
    );
  };

  const handleToggleSectionActive = async (section: MenuSection) => {
    await updateMenuSection(firestore, section.id!, { active: !section.active });
    setSections((prev) =>
      prev.map((s) => s.id === section.id ? { ...s, active: !s.active } : s)
    );
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "item") {
      await deleteMenuItem(firestore, deleteTarget.sectionId, deleteTarget.itemId!);
    } else {
      await deleteMenuSection(firestore, deleteTarget.sectionId);
    }
    setDeleteTarget(null);
    reload();
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-stone-900 animate-pulse" style={{ height: 220, opacity: 1 - (i - 1) * 0.2 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
      {sections.map((section) => (
        <div
          key={section.id}
          className={`rounded-2xl border border-stone-800 overflow-hidden transition-opacity duration-300 ${
            !section.active ? "opacity-40" : ""
          }`}
        >
          {/* Header sección */}
          <div className="flex items-center justify-between px-5 py-5 bg-neutral-900">
            <div className="min-w-0">
              <p className={`text-[11px] uppercase tracking-[0.4em] font-medium ${
                section.type === "food" ? "text-amber-500" : "text-stone-300"
              }`}>
                {section.title}
              </p>
              <p className="text-[11px] text-stone-600 mt-1 truncate">{section.description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <Toggle
                checked={section.active}
                onChange={() => handleToggleSectionActive(section)}
                label=""
              />
              <button
                onClick={() =>
                  setDeleteTarget({ type: "section", sectionId: section.id!, name: section.title })
                }
                className="text-stone-800 hover:text-red-700 transition-colors"
                aria-label="Eliminar sección"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Items */}
          <ul className="divide-y divide-stone-800/40 bg-neutral-950">
            {(section.items ?? []).map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setDrawerItem({ item, sectionId: section.id! })}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-stone-900/50 active:bg-stone-900 transition-colors duration-150 text-left group min-h-[56px]"
                >
                  {/* Thumbnail imagen */}
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover shrink-0 opacity-80"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 transition-colors mt-0.5 ${
                        item.available ? "bg-stone-500" : "bg-stone-800"
                      }`}
                    />
                  )}

                  {/* Nombre + subtítulo */}
                  <span className="flex-1 min-w-0 space-y-0.5">
                    <span
                      className={`block text-[15px] leading-snug transition-colors ${
                        item.available ? "text-stone-200" : "text-stone-700"
                      }`}
                    >
                      {item.name}
                      {item.seasonal && (
                        <span className="ml-2 text-[9px] uppercase tracking-widest text-emerald-700/80">Temp</span>
                      )}
                      {item.highlight && (
                        <span className="ml-2 text-[9px] uppercase tracking-widest text-amber-700/80">Esp</span>
                      )}
                    </span>
                    {item.ingredients.length > 0 && (
                      <span className={`block text-[11px] truncate transition-colors ${
                        item.available ? "text-stone-600" : "text-stone-800"
                      }`}>
                        {item.ingredients.slice(0, 3).join(" · ")}
                        {item.ingredients.length > 3 ? " · …" : ""}
                      </span>
                    )}
                  </span>

                  {/* Precio */}
                  <span className="shrink-0 text-right space-y-0.5">
                    {item.sizes ? (
                      <span className={`block text-[12px] tabular-nums transition-colors ${
                        item.available ? "text-stone-600" : "text-stone-800"
                      }`}>
                        ${item.sizes[0].price}+
                      </span>
                    ) : item.price ? (
                      <span className={`block text-[13px] tabular-nums transition-colors ${
                        item.available ? "text-stone-500" : "text-stone-800"
                      }`}>
                        ${item.price}
                      </span>
                    ) : null}
                  </span>

                  {/* Flecha */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-stone-800 group-hover:text-stone-600 transition-colors shrink-0">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          {/* Agregar item */}
          <div className="bg-neutral-950 px-5 pb-5 pt-2">
            <button
              onClick={() => setAddingItemTo(section.id!)}
              className="w-full py-3.5 rounded-2xl border border-dashed border-stone-800/80 text-stone-700 hover:border-stone-600 hover:text-stone-400 text-[10px] uppercase tracking-widest transition-all duration-200"
            >
              + Agregar item
            </button>
          </div>
        </div>
      ))}
      </div>

      {/* Nueva sección */}
      <button
        onClick={() => setAddingSection(true)}
        className="w-full mt-3 py-5 rounded-2xl border border-dashed border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-400 text-[10px] uppercase tracking-widest transition-all duration-200"
      >
        + Nueva sección
      </button>

      {/* ── Overlays ── */}
      <AnimatePresence>

        {/* Drawer de item */}
        {drawerItem && (
          <ItemDrawer
            key="item-drawer"
            item={drawerItem.item}
            sectionId={drawerItem.sectionId}
            onClose={() => setDrawerItem(null)}
            onUpdated={(patch) => {
              patchItem(drawerItem.sectionId, drawerItem.item.id!, patch);
              setDrawerItem((prev) => prev ? { ...prev, item: { ...prev.item, ...patch } } : null);
            }}
            onEdit={() => setEditItem(drawerItem)}
            onDelete={() =>
              setDeleteTarget({
                type: "item",
                sectionId: drawerItem.sectionId,
                itemId: drawerItem.item.id!,
                name: drawerItem.item.name,
              })
            }
          />
        )}

        {/* Modal editar */}
        {editItem && (
          <EditItemModal
            key="edit-modal"
            item={editItem.item}
            sectionId={editItem.sectionId}
            onSaved={reload}
            onClose={() => setEditItem(null)}
          />
        )}

        {/* Sheet nuevo item */}
        {addingItemTo && (
          <AddItemSheet
            key="add-item"
            sectionId={addingItemTo}
            nextOrder={
              (sections.find((s) => s.id === addingItemTo)?.items?.length ?? 0) + 1
            }
            onAdded={() => { setAddingItemTo(null); reload(); }}
            onCancel={() => setAddingItemTo(null)}
          />
        )}

        {/* Sheet nueva sección */}
        {addingSection && (
          <AddSectionSheet
            key="add-section"
            nextOrder={sections.length + 1}
            onAdded={() => { setAddingSection(false); reload(); }}
            onCancel={() => setAddingSection(false)}
          />
        )}

        {/* Sheet confirmar borrado */}
        {deleteTarget && (
          <ConfirmSheet
            key="confirm-delete"
            target={deleteTarget}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}

      </AnimatePresence>
    </div>
  );
}
