"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { MenuSection, MenuItem } from "@/models/menu.model";
import {
  getFullMenu,
  updateMenuSection,
  deleteMenuItem,
  deleteMenuSection,
} from "@/services/menu.service";
import { toast } from "@/components/ui/use-toast";
import { Toggle } from "./Toggle";
import { ItemDrawer } from "./ItemDrawer";
import { EditItemModal } from "./EditItemModal";
import { AddItemSheet } from "./AddItemSheet";
import { AddSectionSheet } from "./AddSectionSheet";
import { EditSectionSheet } from "./EditSectionSheet";
import { ConfirmSheet } from "./ConfirmSheet";
import { DeleteTarget } from "./menu-admin.constants";

type SectionCardProps = {
  section: MenuSection;
  onItemClick: (item: MenuItem, sectionId: string) => void;
  onToggleActive: (section: MenuSection) => void;
  onDeleteSection: (section: MenuSection) => void;
  onEditSection: (section: MenuSection) => void;
  onAddItem: (sectionId: string) => void;
};

const SectionCard = memo(function SectionCard({
  section,
  onItemClick,
  onToggleActive,
  onDeleteSection,
  onEditSection,
  onAddItem,
}: SectionCardProps) {
  return (
    <div
      className={`rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden transition-opacity duration-300 ${
        !section.active ? "opacity-40" : ""
      }`}
    >
      {/* Header sección */}
      <div className="flex items-center justify-between px-5 py-5 bg-white dark:bg-neutral-900">
        <button className="min-w-0 text-left" onClick={() => onEditSection(section)}>
          <p className={`text-[11px] uppercase tracking-[0.4em] font-medium ${
            section.type === "food" ? "text-amber-500" : "text-stone-600 dark:text-stone-300"
          }`}>
            {section.title}
            <span className="ml-2 text-stone-300 dark:text-stone-700 text-[9px] tracking-wider normal-case">editar</span>
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-600 mt-1 truncate">{section.description || "Sin descripción"}</p>
        </button>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <Toggle
            checked={section.active}
            onChange={() => onToggleActive(section)}
            label=""
          />
          <button
            onClick={() => onDeleteSection(section)}
            className="text-stone-200 dark:text-stone-800 hover:text-red-700 transition-colors"
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
      <ul className="divide-y divide-stone-200/40 dark:divide-stone-800/40 bg-stone-50 dark:bg-neutral-950">
        {(section.items ?? []).map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onItemClick(item, section.id!)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-stone-100/50 dark:hover:bg-stone-900/50 active:bg-stone-100 dark:active:bg-stone-900 transition-colors duration-150 text-left group min-h-[56px]"
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  width={32}
                  height={32}
                  unoptimized
                  className={`w-8 h-8 rounded-lg object-cover shrink-0 ${
                    !item.visible ? "opacity-30 grayscale" : !item.available ? "opacity-50" : "opacity-80"
                  }`}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full shrink-0 transition-colors mt-0.5 ${
                    !item.visible ? "bg-red-300 dark:bg-red-900" : !item.available ? "bg-orange-300 dark:bg-orange-800" : "bg-stone-500"
                  }`}
                />
              )}

              <span className="flex-1 min-w-0 space-y-0.5">
                <span
                  className={`block text-[15px] leading-snug transition-colors ${
                    !item.visible ? "text-stone-300 dark:text-stone-700 line-through" : !item.available ? "text-stone-400 dark:text-stone-500" : "text-stone-700 dark:text-stone-200"
                  }`}
                >
                  {item.name}
                  {!item.visible && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-red-400/80 no-underline">Oculto</span>
                  )}
                  {item.visible && !item.available && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-orange-400/80">Agotado</span>
                  )}
                  {item.seasonal && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-emerald-700/80">Temp</span>
                  )}
                  {item.highlight && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-amber-700/80">Esp</span>
                  )}
                </span>
                {item.ingredients.length > 0 && (
                  <span className={`block text-[11px] truncate transition-colors ${
                    item.visible && item.available ? "text-stone-400 dark:text-stone-600" : "text-stone-200 dark:text-stone-800"
                  }`}>
                    {item.ingredients.slice(0, 3).join(" · ")}
                    {item.ingredients.length > 3 ? " · …" : ""}
                  </span>
                )}
              </span>

              <span className="shrink-0 text-right space-y-0.5">
                {item.sizes ? (
                  <span className={`block text-[12px] tabular-nums transition-colors ${
                    item.visible && item.available ? "text-stone-400 dark:text-stone-600" : "text-stone-200 dark:text-stone-800"
                  }`}>
                    ${item.sizes[0].price}+
                  </span>
                ) : item.price ? (
                  <span className={`block text-[13px] tabular-nums transition-colors ${
                    item.visible && item.available ? "text-stone-500" : "text-stone-200 dark:text-stone-800"
                  }`}>
                    ${item.price}
                  </span>
                ) : null}
              </span>

              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-stone-200 dark:text-stone-800 group-hover:text-stone-400 dark:group-hover:text-stone-600 transition-colors shrink-0">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {/* Agregar item */}
      <div className="bg-stone-50 dark:bg-neutral-950 px-5 pb-5 pt-2">
        <button
          onClick={() => onAddItem(section.id!)}
          className="w-full py-3.5 rounded-2xl border border-dashed border-stone-200/80 dark:border-stone-800/80 text-stone-300 dark:text-stone-700 hover:border-stone-400 dark:hover:border-stone-600 hover:text-stone-600 dark:hover:text-stone-400 text-[10px] uppercase tracking-widest transition-all duration-200"
        >
          + Agregar item
        </button>
      </div>
    </div>
  );
});

export function MenuAdmin() {
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections
      .map((s) => ({
        ...s,
        items: (s.items ?? []).filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.ingredients.some((ing) => ing.toLowerCase().includes(q)) ||
            item.tags?.some((t) => t.toLowerCase().includes(q))
        ),
      }))
      .filter((s) => (s.items ?? []).length > 0 || s.title.toLowerCase().includes(q));
  }, [sections, searchQuery]);

  // Overlays
  const [drawerItem, setDrawerItem] = useState<{ item: MenuItem; sectionId: string } | null>(null);
  const [editItem, setEditItem] = useState<{ item: MenuItem; sectionId: string } | null>(null);
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [editingSection, setEditingSection] = useState<MenuSection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    getFullMenu({ forAdmin: true })
      .then((data) => { setSections(data); setLoading(false); })
      .catch(() => {
        setLoading(false);
        toast({ variant: "destructive", title: "Error al cargar el menú", description: "Verifica tu conexión e intenta de nuevo." });
      });
  }, []);

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

  // Auto-toggle sección cuando todos los items quedan deshabilitados o uno se habilita
  const syncSectionActive = useCallback(async (sectionId: string, itemId: string, newAvailable: boolean) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section?.items) return;

    const updatedItems = section.items.map((it) =>
      it.id === itemId ? { ...it, available: newAvailable } : it
    );

    const allUnavailable = updatedItems.length > 0 && updatedItems.every((it) => !it.available);

    if (allUnavailable && section.active) {
      await updateMenuSection(sectionId, { active: false });
      setSections((prev) =>
        prev.map((s) => s.id === sectionId ? { ...s, active: false } : s)
      );
      toast({ title: `"${section.title}" deshabilitada`, description: "Todos los items están no disponibles." });
    } else if (newAvailable && !section.active) {
      await updateMenuSection(sectionId, { active: true });
      setSections((prev) =>
        prev.map((s) => s.id === sectionId ? { ...s, active: true } : s)
      );
      toast({ title: `"${section.title}" habilitada`, description: "Un item volvió a estar disponible." });
    }
  }, [sections]);

  const handleToggleSectionActive = useCallback(async (section: MenuSection) => {
    await updateMenuSection(section.id!, { active: !section.active });
    setSections((prev) =>
      prev.map((s) => s.id === section.id ? { ...s, active: !s.active } : s)
    );
  }, []);

  const handleItemClick = useCallback((item: MenuItem, sectionId: string) => {
    setDrawerItem({ item, sectionId });
  }, []);

  const handleDeleteSectionRequest = useCallback((s: MenuSection) => {
    setDeleteTarget({ type: "section", sectionId: s.id!, name: s.title });
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "item") {
      await deleteMenuItem(deleteTarget.sectionId, deleteTarget.itemId!);
    } else {
      await deleteMenuSection(deleteTarget.sectionId);
    }
    setDeleteTarget(null);
    reload();
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-stone-200 dark:bg-stone-900 animate-pulse" style={{ height: 220, opacity: 1 - (i - 1) * 0.2 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 dark:text-stone-700">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-neutral-900 text-sm text-stone-700 dark:text-stone-300 placeholder:text-stone-300 dark:placeholder:text-stone-700 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-300 dark:text-stone-700 hover:text-stone-500 transition-colors"
              aria-label="Limpiar busqueda"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
        {filteredSections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            onItemClick={handleItemClick}
            onToggleActive={handleToggleSectionActive}
            onDeleteSection={handleDeleteSectionRequest}
            onEditSection={setEditingSection}
            onAddItem={setAddingItemTo}
          />
        ))}
      </div>

      {/* No results for search */}
      {searchQuery && filteredSections.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <p className="text-stone-400 dark:text-stone-500 text-sm">Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
          <button
            onClick={() => setSearchQuery("")}
            className="text-[10px] uppercase tracking-widest text-stone-300 dark:text-stone-700 hover:text-stone-600 dark:hover:text-stone-400 transition-colors underline underline-offset-4"
          >
            Limpiar busqueda
          </button>
        </div>
      )}

      {/* Nueva sección */}
      <button
        onClick={() => setAddingSection(true)}
        className="w-full mt-3 py-5 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 hover:border-stone-400 dark:hover:border-stone-600 hover:text-stone-600 dark:hover:text-stone-400 text-[10px] uppercase tracking-widest transition-all duration-200"
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
              if (patch.available !== undefined) {
                syncSectionActive(drawerItem.sectionId, drawerItem.item.id!, patch.available);
              }
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

        {/* Sheet editar sección */}
        {editingSection && (
          <EditSectionSheet
            key="edit-section"
            section={editingSection}
            onSaved={() => { setEditingSection(null); reload(); }}
            onCancel={() => setEditingSection(null)}
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
