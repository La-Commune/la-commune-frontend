"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useFirestore } from "reactfire";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { MenuItem } from "@/models/menu.model";
import { updateMenuItem } from "@/services/menu.service";
import { Toggle } from "./Toggle";
import { ITEM_TAGS } from "./menu-admin.constants";

export function EditItemModal({
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
  const keyboardOffset = useKeyboardOffset();
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
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 px-4"
      style={{ paddingBottom: Math.max(keyboardOffset, 16), transition: "padding-bottom 0.15s ease" }}
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
            <div className="relative w-full h-28 rounded-xl overflow-hidden border border-stone-800">
              <Image
                src={imageUrl.trim()}
                alt="preview"
                fill
                unoptimized
                className="object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }}
              />
            </div>
          )}
        </div>

        {/* ── Precio / Tamaños ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-stone-600">Precio</p>
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
                      className="w-full pl-6 pr-3 py-2.5 bg-neutral-950 border border-stone-800 rounded-xl text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors"
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
