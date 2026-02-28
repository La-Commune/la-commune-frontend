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

/* ── Helpers ─────────────────────────────────────────── */

const ITEM_TAGS = ["Fuerte", "Cremoso", "Dulce", "Gourmet", "Intenso", "Refrescante"];
const SECTION_TYPES = [
  { value: "drink", label: "Bebida" },
  { value: "food", label: "Alimento" },
  { value: "other", label: "Otro" },
];

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
        className={`w-8 h-4 rounded-full border transition-colors duration-200 flex items-center px-0.5 ${
          checked ? "bg-stone-300 border-stone-300" : "bg-transparent border-stone-700"
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full transition-transform duration-200 ${
            checked ? "translate-x-4 bg-neutral-900" : "translate-x-0 bg-stone-700"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

/* ── Form: Nuevo item ─────────────────────────────────── */

function AddItemForm({
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
    setSaving(false);
  };

  const inputCls =
    "w-full bg-neutral-900 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors";

  return (
    <div className="mt-4 p-4 rounded-xl border border-stone-800 bg-neutral-900/50 space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-stone-500">Nuevo item</p>
      <input className={inputCls} placeholder="Nombre *" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={inputCls} placeholder="Precio (ej: 40)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
      <input className={inputCls} placeholder="Ingredientes separados por coma" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
      <input className={inputCls} placeholder="Nota opcional" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex-1 py-2.5 rounded-xl bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.3em] hover:bg-white transition-colors disabled:opacity-30"
        >
          {saving ? "Guardando…" : "Agregar"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 rounded-xl border border-stone-800 text-stone-500 hover:text-stone-300 text-[11px] uppercase tracking-[0.3em] transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ── Form: Nueva sección ──────────────────────────────── */

function AddSectionForm({
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
    setSaving(false);
  };

  const inputCls =
    "w-full bg-neutral-900 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors";

  return (
    <div className="p-5 rounded-2xl border border-stone-800 bg-neutral-900/50 space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-stone-500">Nueva sección</p>
      <input className={inputCls} placeholder="Título *" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input className={inputCls} placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex gap-2">
        {SECTION_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value as any)}
            className={`flex-1 py-2 rounded-xl border text-[10px] uppercase tracking-widest transition-colors ${
              type === t.value
                ? "border-stone-400 text-stone-200 bg-stone-800"
                : "border-stone-800 text-stone-600 hover:border-stone-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="flex-1 py-2.5 rounded-xl bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.3em] hover:bg-white transition-colors disabled:opacity-30"
        >
          {saving ? "Guardando…" : "Crear sección"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 rounded-xl border border-stone-800 text-stone-500 hover:text-stone-300 text-[11px] uppercase tracking-[0.3em] transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
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
  const [price, setPrice] = useState(item.price?.toString() ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [ingredients, setIngredients] = useState(item.ingredients.join(", "));
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [highlight, setHighlight] = useState(item.highlight);
  const [seasonal, setSeasonal] = useState(item.seasonal);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag: string) =>
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleSave = async () => {
    if (!name.trim() || !item.id) return;
    setSaving(true);
    await updateMenuItem(firestore, sectionId, item.id, {
      name: name.trim(),
      price: price ? Number(price) : undefined,
      note: note.trim() || undefined,
      ingredients: ingredients.split(",").map((s) => s.trim()).filter(Boolean),
      tags,
      highlight,
      seasonal,
    });
    onSaved();
    setSaving(false);
    onClose();
  };

  const inputCls =
    "w-full bg-neutral-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md bg-neutral-900 border border-stone-800 rounded-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] uppercase tracking-widest text-stone-500">Editar item</p>

        <input className={inputCls} placeholder="Nombre *" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder="Precio" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input className={inputCls} placeholder="Ingredientes separados por coma" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
        <input className={inputCls} placeholder="Nota opcional" value={note} onChange={(e) => setNote(e.target.value)} />

        {/* Tags */}
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-stone-600">Tags</p>
          <div className="flex flex-wrap gap-2">
            {ITEM_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border transition-colors ${
                  tags.includes(tag)
                    ? "border-stone-400 text-stone-200 bg-stone-800"
                    : "border-stone-800 text-stone-600 hover:border-stone-600"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Toggle checked={highlight} onChange={setHighlight} label="Especial" />
          <Toggle checked={seasonal} onChange={setSeasonal} label="Temporada" />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-3 rounded-xl bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.3em] hover:bg-white transition-colors disabled:opacity-30"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            onClick={onClose}
            className="px-4 rounded-xl border border-stone-800 text-stone-500 hover:text-stone-300 text-[11px] uppercase tracking-[0.3em] transition-colors"
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
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: MenuItem; sectionId: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "item" | "section"; sectionId: string; itemId?: string; name: string } | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    getFullMenu(firestore).then((data) => {
      setSections(data);
      setLoading(false);
    });
  }, [firestore]);

  useEffect(() => { reload(); }, [reload]);

  const handleToggleAvailable = async (sectionId: string, item: MenuItem) => {
    await updateMenuItem(firestore, sectionId, item.id!, { available: !item.available });
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              items: s.items?.map((it) =>
                it.id === item.id ? { ...it, available: !it.available } : it
              ),
            }
      )
    );
  };

  const handleToggleSectionActive = async (section: MenuSection) => {
    await updateMenuSection(firestore, section.id!, { active: !section.active });
    setSections((prev) =>
      prev.map((s) => (s.id === section.id ? { ...s, active: !s.active } : s))
    );
  };

  const handleDeleteItem = async () => {
    if (!confirmDelete || confirmDelete.type !== "item") return;
    await deleteMenuItem(firestore, confirmDelete.sectionId, confirmDelete.itemId!);
    setConfirmDelete(null);
    reload();
  };

  const handleDeleteSection = async () => {
    if (!confirmDelete || confirmDelete.type !== "section") return;
    await deleteMenuSection(firestore, confirmDelete.sectionId);
    setConfirmDelete(null);
    reload();
  };

  if (loading) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-stone-900 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">

      {/* Lista de secciones */}
      {sections.map((section) => (
        <div
          key={section.id}
          className={`rounded-2xl border border-stone-800 bg-neutral-900 overflow-hidden transition-opacity duration-200 ${
            !section.active ? "opacity-50" : ""
          }`}
        >
          {/* Header sección */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
            <div>
              <p className="text-sm text-stone-200 font-light">{section.title}</p>
              <p className="text-[10px] text-stone-600 uppercase tracking-widest mt-0.5">
                {section.description}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Toggle
                checked={section.active}
                onChange={() => handleToggleSectionActive(section)}
                label="Activa"
              />
              <button
                onClick={() =>
                  setConfirmDelete({
                    type: "section",
                    sectionId: section.id!,
                    name: section.title,
                  })
                }
                className="text-stone-700 hover:text-red-500 transition-colors"
                aria-label="Eliminar sección"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Items */}
          <ul className="divide-y divide-stone-800/50">
            {(section.items ?? []).map((item) => (
              <li
                key={item.id}
                className={`px-5 py-3.5 flex items-center justify-between gap-3 ${
                  !item.available ? "opacity-50" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-stone-300">{item.name}</span>
                    {item.price && (
                      <span className="text-[11px] text-stone-600">${item.price}</span>
                    )}
                    {item.seasonal && (
                      <span className="text-[9px] uppercase tracking-widest text-emerald-600 border border-emerald-800/50 rounded-full px-1.5 py-0.5">
                        Temporada
                      </span>
                    )}
                    {item.highlight && (
                      <span className="text-[9px] uppercase tracking-widest text-amber-600 border border-amber-800/50 rounded-full px-1.5 py-0.5">
                        Especial
                      </span>
                    )}
                  </div>
                  {!item.available && (
                    <p className="text-[10px] uppercase tracking-widest text-stone-700 mt-0.5">
                      No disponible
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle disponibilidad */}
                  <button
                    onClick={() => handleToggleAvailable(section.id!, item)}
                    className={`text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-colors ${
                      item.available
                        ? "border-stone-700 text-stone-500 hover:border-stone-600 hover:text-stone-300"
                        : "border-emerald-800/50 text-emerald-600 hover:border-emerald-600"
                    }`}
                  >
                    {item.available ? "Ocultar" : "Activar"}
                  </button>

                  {/* Editar */}
                  <button
                    onClick={() => setEditingItem({ item, sectionId: section.id! })}
                    className="text-stone-700 hover:text-stone-300 transition-colors"
                    aria-label="Editar item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>

                  {/* Eliminar */}
                  <button
                    onClick={() =>
                      setConfirmDelete({
                        type: "item",
                        sectionId: section.id!,
                        itemId: item.id!,
                        name: item.name,
                      })
                    }
                    className="text-stone-700 hover:text-red-500 transition-colors"
                    aria-label="Eliminar item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Agregar item */}
          <div className="px-5 pb-4">
            {addingItemTo === section.id ? (
              <AddItemForm
                sectionId={section.id!}
                nextOrder={(section.items?.length ?? 0) + 1}
                onAdded={() => { setAddingItemTo(null); reload(); }}
                onCancel={() => setAddingItemTo(null)}
              />
            ) : (
              <button
                onClick={() => setAddingItemTo(section.id!)}
                className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-400 text-[10px] uppercase tracking-widest transition-colors"
              >
                + Agregar item
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Agregar sección */}
      {addingSection ? (
        <AddSectionForm
          nextOrder={sections.length + 1}
          onAdded={() => { setAddingSection(false); reload(); }}
          onCancel={() => setAddingSection(false)}
        />
      ) : (
        <button
          onClick={() => setAddingSection(true)}
          className="w-full py-4 rounded-2xl border border-dashed border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-400 text-[10px] uppercase tracking-widest transition-colors"
        >
          + Nueva sección
        </button>
      )}

      {/* Modal editar item */}
      <AnimatePresence>
        {editingItem && (
          <EditItemModal
            item={editingItem.item}
            sectionId={editingItem.sectionId}
            onSaved={reload}
            onClose={() => setEditingItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Diálogo de confirmación */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xs bg-neutral-900 border border-stone-800 rounded-2xl p-6 space-y-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-stone-300 text-sm leading-snug">
                ¿Eliminar <strong className="text-white font-normal">"{confirmDelete.name}"</strong>?
                {confirmDelete.type === "section" && (
                  <span className="block text-[11px] text-stone-600 mt-1">
                    Se eliminarán también todos sus items.
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmDelete.type === "item" ? handleDeleteItem : handleDeleteSection}
                  className="flex-1 py-2.5 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-[11px] uppercase tracking-[0.3em] hover:bg-red-900/50 transition-colors"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-800 text-stone-500 text-[11px] uppercase tracking-[0.3em] hover:text-stone-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
