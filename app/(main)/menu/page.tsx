"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFirestore } from "reactfire";
import { MenuSection } from "@/models/menu.model";
import { getFullMenu } from "@/services/menu.service";

export default function CafeMenu() {
  const firestore = useFirestore();
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFullMenu(firestore)
      .then((data) => setSections(data.filter((s) => s.active)))
      .finally(() => setLoading(false));
  }, [firestore]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white print:min-h-0 print:bg-white print:text-neutral-900">

      {/* Nav — oculta al imprimir */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-5 bg-neutral-950/80 backdrop-blur-sm print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-white transition-colors duration-300 group"
        >
          <span className="w-4 h-px bg-stone-500 group-hover:w-7 group-hover:bg-white transition-all duration-500" />
          Inicio
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-500">
          La Commune
        </span>
        <div className="w-16" />
      </nav>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-8 pt-28 pb-24 print:max-w-none print:px-10 print:pt-6 print:pb-6">

        {/* Header */}
        <header className="text-center mb-14 space-y-3 print:mb-8">
          <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600 print:text-neutral-400">
            La Commune
          </p>
          <h1 className="font-display text-5xl sm:text-7xl font-light tracking-[0.2em] uppercase print:text-5xl">
            Menú
          </h1>
          <div className="flex items-center justify-center gap-4">
            <span className="w-8 h-px bg-stone-700 print:bg-neutral-300" />
            <p className="text-[10px] tracking-[0.35em] uppercase text-stone-500 print:text-neutral-400">
              Bebidas
            </p>
            <span className="w-8 h-px bg-stone-700 print:bg-neutral-300" />
          </div>
        </header>

        {/* Skeleton */}
        {loading && (
          <div className="flex flex-wrap gap-px bg-stone-800">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-neutral-950 flex-1 basis-[260px] px-6 py-8 sm:px-8 sm:py-10 space-y-4"
              >
                <div className="h-3 w-24 bg-stone-900 rounded-full animate-pulse" />
                <div className="h-2.5 w-40 bg-stone-900 rounded-full animate-pulse" />
                <div className="mt-6 space-y-5">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="space-y-2 py-4 border-t border-stone-800/40">
                      <div className="flex justify-between">
                        <div className="h-4 w-28 bg-stone-900 rounded animate-pulse" />
                        <div className="h-4 w-8 bg-stone-900 rounded animate-pulse" />
                      </div>
                      <div className="h-2.5 w-36 bg-stone-900 rounded-full animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Secciones */}
        {!loading && (
          <div className="flex flex-wrap gap-px bg-stone-800 print:grid print:grid-cols-3 print:gap-6 print:bg-white print:items-start">
            {sections.map((section) => {
              const isFood = section.type === "food";

              return (
                <div
                  key={section.id ?? section.title}
                  className="bg-neutral-950 flex-1 basis-[260px] px-6 py-8 sm:px-8 sm:py-10 print:bg-white print:p-0 flex flex-col print:self-start print:break-inside-avoid"
                >
                  {/* Encabezado de sección */}
                  <div className="mb-6 shrink-0 print:pb-1 print:border-b print:border-neutral-800">
                    <h2
                      className={`text-[10px] uppercase tracking-[0.35em] mb-1 ${
                        isFood
                          ? "text-amber-300 print:text-amber-800"
                          : "text-stone-400 print:text-neutral-700"
                      }`}
                    >
                      {section.title}
                    </h2>
                    <p
                      className={`text-[11px] ${
                        isFood
                          ? "text-amber-500/50 print:text-amber-600/70"
                          : "text-stone-600 print:text-neutral-400"
                      }`}
                    >
                      {section.description}
                    </p>
                    <div
                      className={`w-6 h-px mt-4 ${
                        isFood
                          ? "bg-amber-500/30 print:bg-amber-400"
                          : "bg-stone-700 print:bg-neutral-300"
                      }`}
                    />
                  </div>

                  {/* Lista de items */}
                  <ul className="divide-y divide-stone-800/40 print:divide-neutral-200">
                    {(section.items ?? []).map((item) => {
                      const isAvailable = item.available !== false;

                      return (
                        <li key={item.id ?? item.name} className={`py-4 space-y-1.5 ${!isAvailable ? "opacity-40" : ""}`}>

                          {/* Imagen */}
                          {item.imageUrl && (
                            <div className="w-full h-36 sm:h-44 rounded-xl overflow-hidden mb-3 print:hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }}
                              />
                            </div>
                          )}

                          {/* Nombre + precio */}
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display text-lg leading-tight font-medium text-stone-100 print:text-neutral-900">
                                  {item.name}
                                </span>
                                {item.highlight && (
                                  <span className="text-[9px] uppercase tracking-widest bg-amber-600/15 text-amber-400 border border-amber-500/50 rounded-full px-2 py-0.5 print:bg-transparent print:text-amber-700 print:border-amber-600">
                                    Especial
                                  </span>
                                )}
                                {item.seasonal && (
                                  <span className="text-[9px] uppercase tracking-widest bg-emerald-600/10 text-emerald-400 border border-emerald-500/40 rounded-full px-2 py-0.5 print:bg-transparent print:text-emerald-700 print:border-emerald-600">
                                    Temporada
                                  </span>
                                )}
                              </div>

                              {item.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-block text-[10px] uppercase tracking-widest text-stone-500 border border-stone-700/60 rounded-full px-2 py-0.5 print:text-neutral-500 print:border-neutral-300"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {!item.sizes && item.price && (
                              <span className="text-sm tabular-nums text-stone-400 print:text-neutral-600 shrink-0 pt-0.5">
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
                                  className="text-xs px-2.5 py-0.5 rounded-full border border-stone-700/60 text-stone-400 print:border-neutral-300 print:text-neutral-600"
                                >
                                  {size.label} · ${size.price}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Ingredientes */}
                          <p className="text-[11px] text-stone-600 print:text-neutral-400 leading-snug">
                            {item.ingredients.join(" · ")}
                          </p>

                          {/* Nota */}
                          {item.note && isAvailable && (
                            <p
                              className={`text-[11px] italic mt-1 leading-snug ${
                                item.highlight
                                  ? "text-amber-500/60 print:text-amber-700/80"
                                  : "text-stone-600 print:text-neutral-400"
                              }`}
                            >
                              {item.note}
                            </p>
                          )}

                          {!isAvailable && (
                            <p className="text-[10px] uppercase tracking-widest text-stone-600 print:text-neutral-400 mt-1">
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

        {/* Botón de descarga — oculto al imprimir */}
        {!loading && (
          <div className="mt-16 flex justify-center print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-4 text-[11px] uppercase tracking-[0.35em] text-stone-500 hover:text-white transition-colors duration-300 group"
            >
              <span className="w-8 h-px bg-stone-700 group-hover:w-12 group-hover:bg-white transition-all duration-500" />
              Descargar menú
              <span className="w-8 h-px bg-stone-700 group-hover:w-12 group-hover:bg-white transition-all duration-500" />
            </button>
          </div>
        )}

        {/* Pie de página para impresión */}
        <div className="hidden print:flex items-center justify-center mt-12 pt-6 border-t border-neutral-200 gap-4">
          <span className="w-8 h-px bg-neutral-300" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-400">
            La Commune · {new Date().getFullYear()}
          </p>
          <span className="w-8 h-px bg-neutral-300" />
        </div>

      </div>
    </div>
  );
}
