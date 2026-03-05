"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useFirestore } from "reactfire";
import { MenuSection } from "@/models/menu.model";
import { getFullMenu } from "@/services/menu.service";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PromoBannerSticky } from "@/components/ui/promos/PromoBanner";

function MenuItemImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden mb-3 print:hidden bg-stone-200 dark:bg-stone-900">
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        className={`object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }}
      />
    </div>
  );
}

export default function CafeMenu() {
  const firestore = useFirestore();
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [activeFilter, setActiveFilterState] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("menu-tab-filter");
    if (saved) setActiveFilterState(saved);
  }, []);

  function setActiveFilter(value: string | null) {
    console.log("setActiveFilter", value);

    setActiveFilterState(value);
    if (value) {
      sessionStorage.setItem("menu-tab-filter", value);
    } else {
      sessionStorage.removeItem("menu-tab-filter");
    }
  }

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      if (error) {
        setError(false);
        setLoading(true);
        getFullMenu(firestore)
          .then((data) => setSections(data.filter((s) => s.active)))
          .catch(() => setError(true))
          .finally(() => setLoading(false));
      }
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [error, firestore]);

  useEffect(() => {
    getFullMenu(firestore)
      .then((data) => setSections(data.filter((s) => s.active)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [firestore]);

  const hasFood = sections.some((s) => s.type === "food");
  const hasDrinks = sections.some((s) => s.type === "drink");

  const visibleSections = useMemo(() => {
    if (!activeFilter) return sections;
    return sections.filter((s) => s.type === activeFilter);
  }, [sections, activeFilter]);

  const tabs = useMemo(() => {
    const t: { label: string; value: string | null }[] = [{ label: "Todo", value: null }];
    if (hasDrinks) t.push({ label: "Bebidas", value: "drink" });
    if (hasFood) t.push({ label: "Alimentos", value: "food" });
    return t;
  }, [hasDrinks, hasFood]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-white print:min-h-0 print:bg-white print:text-neutral-900">

      {/* Nav — oculta al imprimir */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-5 bg-stone-50/80 dark:bg-neutral-950/80 backdrop-blur-sm print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300 group"
        >
          <span className="w-4 h-px bg-stone-400 dark:bg-stone-500 group-hover:w-7 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500" />
          Inicio
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-400 dark:text-stone-500">
          La Commune
        </span>
        <ThemeToggle />
      </nav>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-28 pb-24 print:max-w-none print:px-10 print:pt-6 print:pb-6">

        {/* Header */}
        <header className="text-center mb-14 space-y-3 print:mb-8">
          <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600 print:text-neutral-400">
            La Commune
          </p>
          <h1 className="font-display text-5xl sm:text-7xl font-light tracking-[0.2em] uppercase print:text-5xl">
            Menu
          </h1>
          <div className="flex items-center justify-center gap-4">
            <span className="w-8 h-px bg-stone-300 dark:bg-stone-700 print:bg-neutral-300" />
            <p className="text-[10px] tracking-[0.35em] uppercase text-stone-400 dark:text-stone-500 print:text-neutral-400">
              Bebidas
            </p>
            <span className="w-8 h-px bg-stone-300 dark:bg-stone-700 print:bg-neutral-300" />
          </div>
        </header>

        {/* Segmented control — oculto al imprimir, solo si hay más de una categoría */}
        {!loading && tabs.length > 1 && (
          <div className="flex justify-center mb-12 print:hidden">
            <div className="inline-flex border border-stone-200 dark:border-stone-800 rounded-full p-1 gap-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveFilter(tab.value)}
                  className={`text-[10px] uppercase tracking-[0.3em] px-5 py-1.5 rounded-full transition-all duration-200 ${
                    activeFilter === tab.value
                      ? "bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200"
                      : "text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sin conexión */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-32 gap-6 text-center print:hidden">
            <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">
              {isOnline ? "Error al cargar" : "Sin conexión"}
            </p>
            <p className="font-display text-3xl font-light tracking-[0.1em] text-stone-500 dark:text-stone-400">
              {isOnline ? "Algo salió mal" : "Sin internet"}
            </p>
            <div className="flex items-center gap-4">
              <span className="w-8 h-px bg-stone-200 dark:bg-stone-800" />
              <p className="text-sm text-stone-400 dark:text-stone-600 max-w-[22ch] leading-relaxed">
                {isOnline
                  ? "No pudimos cargar el menú. Intenta de nuevo."
                  : "Conéctate a internet para ver el menú."}
              </p>
              <span className="w-8 h-px bg-stone-200 dark:bg-stone-800" />
            </div>
            {isOnline && (
              <button
                onClick={() => {
                  setError(false);
                  setLoading(true);
                  getFullMenu(firestore)
                    .then((data) => setSections(data.filter((s) => s.active)))
                    .catch(() => setError(true))
                    .finally(() => setLoading(false));
                }}
                className="text-[10px] uppercase tracking-[0.35em] text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors duration-300"
              >
                Reintentar
              </button>
            )}
            {!isOnline && (
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-300 dark:text-stone-700">
                Se actualizará automáticamente al reconectarte
              </p>
            )}
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="flex flex-wrap gap-px bg-stone-200 dark:bg-stone-800">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-stone-50 dark:bg-neutral-950 flex-1 basis-[260px] px-6 py-8 sm:px-8 sm:py-10 space-y-4"
              >
                <div className="h-3 w-24 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse" />
                <div className="h-2.5 w-40 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse" />
                <div className="mt-6 space-y-5">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="space-y-2 py-4 border-t border-stone-200/40 dark:border-stone-800/40">
                      <div className="flex justify-between">
                        <div className="h-4 w-28 bg-stone-200 dark:bg-stone-900 rounded animate-pulse" />
                        <div className="h-4 w-8 bg-stone-200 dark:bg-stone-900 rounded animate-pulse" />
                      </div>
                      <div className="h-2.5 w-36 bg-stone-200 dark:bg-stone-900 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sin resultados */}
        {!loading && !error && visibleSections.length === 0 && (
          <div className="text-center py-20 space-y-2 print:hidden">
            <p className="text-stone-400 dark:text-stone-500 text-sm">Sin items con ese filtro</p>
            <button
              onClick={() => setActiveFilter(null)}
              className="text-[10px] uppercase tracking-widest text-stone-300 dark:text-stone-700 hover:text-stone-600 dark:hover:text-stone-400 transition-colors duration-200 underline underline-offset-4"
            >
              Ver todo
            </button>
          </div>
        )}

        {/* Secciones */}
        {!loading && !error && visibleSections.length > 0 && (
          <div className="flex flex-wrap gap-px bg-stone-200 dark:bg-stone-800 print:grid print:grid-cols-3 print:gap-6 print:bg-white print:items-start">
            {visibleSections.map((section) => {
              const isFood = section.type === "food";

              return (
                <div
                  key={section.id ?? section.title}
                  className="bg-stone-50 dark:bg-neutral-950 flex-1 basis-[260px] px-6 py-8 sm:px-8 sm:py-10 print:bg-white print:p-0 flex flex-col print:self-start print:break-inside-avoid"
                >
                  {/* Encabezado de sección */}
                  <div className="mb-6 shrink-0 print:pb-1 print:border-b print:border-neutral-800">
                    <h2
                      className={`text-[10px] uppercase tracking-[0.35em] mb-1 ${
                        isFood
                          ? "text-amber-600 dark:text-amber-300 print:text-amber-800"
                          : "text-stone-500 dark:text-stone-400 print:text-neutral-700"
                      }`}
                    >
                      {section.title}
                    </h2>
                    <p
                      className={`text-[11px] ${
                        isFood
                          ? "text-amber-400/50 dark:text-amber-500/50 print:text-amber-600/70"
                          : "text-stone-400 dark:text-stone-600 print:text-neutral-400"
                      }`}
                    >
                      {section.description}
                    </p>
                    <div
                      className={`w-6 h-px mt-4 ${
                        isFood
                          ? "bg-amber-400/30 dark:bg-amber-500/30 print:bg-amber-400"
                          : "bg-stone-300 dark:bg-stone-700 print:bg-neutral-300"
                      }`}
                    />
                  </div>

                  {/* Lista de items */}
                  <ul className="divide-y divide-stone-200/40 dark:divide-stone-800/40 print:divide-neutral-200">
                    {(section.items ?? []).map((item) => {
                      const isAvailable = item.available !== false;

                      return (
                        <li key={item.id ?? item.name} className={`py-4 space-y-1.5 ${!isAvailable ? "opacity-40" : ""}`}>

                          {/* Imagen */}
                          {item.imageUrl && <MenuItemImage src={item.imageUrl} alt={item.name} />}

                          {/* Nombre + precio */}
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display text-lg leading-tight font-medium text-stone-800 dark:text-stone-100 print:text-neutral-900">
                                  {item.name}
                                </span>
                                {item.highlight && (
                                  <span className="text-[9px] uppercase tracking-widest bg-amber-100 dark:bg-amber-600/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/50 rounded-full px-2 py-0.5 print:bg-transparent print:text-amber-700 print:border-amber-600">
                                    Especial
                                  </span>
                                )}
                                {item.seasonal && (
                                  <span className="text-[9px] uppercase tracking-widest bg-emerald-50 dark:bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 rounded-full px-2 py-0.5 print:bg-transparent print:text-emerald-700 print:border-emerald-600">
                                    Temporada
                                  </span>
                                )}
                              </div>

                              {item.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-block text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-500 border border-stone-300/60 dark:border-stone-700/60 rounded-full px-2 py-0.5 print:text-neutral-500 print:border-neutral-300"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {!item.sizes && item.price && (
                              <span className="text-sm tabular-nums text-stone-500 dark:text-stone-400 print:text-neutral-600 shrink-0 pt-0.5">
                                ${item.price}
                              </span>
                            )}
                          </div>

                          {/* Tamaños */}
                          {item.sizes && (
                            <div className="flex gap-2 mb-2 flex-wrap">
                              {item.sizes.map((size) => (
                                <span
                                  key={size.label}
                                  className="text-xs px-2.5 py-0.5 rounded-full border border-stone-300/60 dark:border-stone-700/60 text-stone-500 dark:text-stone-400 print:border-neutral-300 print:text-neutral-600"
                                >
                                  {size.label} · ${size.price}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Ingredientes */}
                          <p className="text-[11px] text-stone-400 dark:text-stone-600 print:text-neutral-400 leading-snug">
                            {item.ingredients.join(" · ")}
                          </p>

                          {/* Nota */}
                          {item.note && isAvailable && (
                            <p
                              className={`text-[11px] italic mt-1 leading-snug ${
                                item.highlight
                                  ? "text-amber-500/60 print:text-amber-700/80"
                                  : "text-stone-400 dark:text-stone-600 print:text-neutral-400"
                              }`}
                            >
                              {item.note}
                            </p>
                          )}

                          {!isAvailable && (
                            <p className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-600 print:text-neutral-400 mt-1">
                              No disponible hoy
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Métodos de pago — oculto al imprimir */}
        {!loading && !error && (
          <div className="mt-16 flex justify-center print:hidden">
            <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              <span>Efectivo</span>
              <span className="w-px h-3 bg-stone-200 dark:bg-stone-800" />
              <span>Tarjeta vía Mercado Pago</span>
            </div>
          </div>
        )}

        {/* Botón de descarga — oculto al imprimir */}
        {!loading && !error && (
          <div className="mt-8 flex justify-center print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-4 text-[11px] uppercase tracking-[0.35em] text-stone-400 dark:text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors duration-300 group"
            >
              <span className="w-8 h-px bg-stone-300 dark:bg-stone-700 group-hover:w-12 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500" />
              Descargar menú
              <span className="w-8 h-px bg-stone-300 dark:bg-stone-700 group-hover:w-12 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500" />
            </button>
          </div>
        )}

        {/* Pie de página para impresión */}
        <div className="hidden print:flex flex-col items-center justify-center mt-12 pt-6 border-t border-neutral-200 gap-3">
          <div className="flex items-center gap-4">
            <span className="w-8 h-px bg-neutral-300" />
            <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400">
              La Commune · {new Date().getFullYear()}
            </p>
            <span className="w-8 h-px bg-neutral-300" />
          </div>
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-400">
            Efectivo · Tarjeta vía Mercado Pago
          </p>
        </div>

      </div>

      {/* Promo sticky banner */}
      {!loading && !error && <PromoBannerSticky />}
    </div>
  );
}
