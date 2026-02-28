"use client";

import Link from "next/link";

type Ingredient = {
  name: string;
};

type SizeOption = {
  label: string;
  price: number;
};

type Drink = {
  name: string;
  price?: number;
  sizes?: SizeOption[];
  ingredients: Ingredient[];
  optional?: Ingredient[];
  note?: string;
  available?: boolean;
  tag?: "Fuerte" | "Cremoso" | "Dulce" | "Gourmet" | "Intenso" | "Refrescante";
  highlight?: boolean;
  seasonal?: boolean;
};

type Section = {
  title: string;
  description: string;
  type: "drink" | "food";
  drinks: Drink[];
};

const sections: Section[] = [
  {
    title: "Con leche",
    description: "Suaves, balanceadas y cremosas",
    type: "drink",
    drinks: [
      {
        name: "Latte",
        price: 40,
        ingredients: [{ name: "Espresso" }, { name: "Leche vaporizada" }],
      },
      {
        name: "Cappuccino",
        price: 40,
        ingredients: [
          { name: "Espresso" },
          { name: "Leche vaporizada" },
          { name: "Espuma de leche" },
        ],
        tag: "Cremoso",
      },
      {
        name: "Flat White",
        price: 40,
        ingredients: [{ name: "Espresso" }, { name: "Leche vaporizada" }],
        note: "Más café, menos espuma",
        tag: "Intenso",
      },
      {
        name: "Moka",
        price: 45,
        ingredients: [
          { name: "Espresso" },
          { name: "Chocolate" },
          { name: "Cocoa" },
          { name: "Leche" },
          { name: "Vainilla" },
        ],
        tag: "Dulce",
      },
    ],
  },
  {
    title: "Especiales",
    description: "Con sabores y perfil más dulce",
    type: "drink",
    drinks: [
      {
        name: "Latte Praliné",
        sizes: [
          { label: "10 oz", price: 45 },
          { label: "12 oz", price: 52 },
        ],
        ingredients: [
          { name: "Espresso" },
          { name: "Caramelo" },
          { name: "Leche vaporizada" },
          { name: "Nuez pecana" },
        ],
        note: "Nuez pecana garapiñada con cubierta de praliné",
        tag: "Gourmet",
        seasonal: true,
      },
      {
        name: "Chocolate caliente",
        price: 40,
        ingredients: [
          { name: "Chocolate" },
          { name: "Cocoa" },
          { name: "Leche" },
          { name: "Vainilla" },
        ],
        note: "Sin café · Perfil más cremoso",
        tag: "Dulce",
      },
      {
        name: "Latte Helado",
        price: 50,
        ingredients: [
          { name: "Espresso" },
          { name: "Caramelo" },
          { name: "Leche fría" },
          { name: "Hielo" },
        ],
        tag: "Refrescante",
      },
    ],
  },
  {
    title: "Base espresso",
    description: "Bebidas intensas, cortas y directas",
    type: "drink",
    drinks: [
      {
        name: "Espresso",
        price: 30,
        ingredients: [{ name: "Espresso" }],
        tag: "Fuerte",
      },
      {
        name: "Americano",
        price: 30,
        ingredients: [{ name: "Espresso" }, { name: "Agua caliente" }],
        note: "Espresso servido primero",
      },
    ],
  },
];

export default function CafeMenu() {
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

        {/* Secciones — flex wrap: el último item crece para llenar el espacio disponible */}
        <div className="flex flex-wrap gap-px bg-stone-800 print:grid print:grid-cols-3 print:gap-0 print:bg-white">
          {sections.map((section) => {
            const isFood = section.type === "food";

            return (
              <div
                key={section.title}
                className="bg-neutral-950 flex-1 basis-[260px] px-6 py-8 sm:px-8 sm:py-10 print:bg-white print:p-6 print:border print:border-neutral-200 flex flex-col print:break-inside-avoid"
              >
                {/* Encabezado de sección */}
                <div className="mb-6 shrink-0">
                  <h2
                    className={`text-[10px] uppercase tracking-[0.35em] mb-1 ${
                      isFood
                        ? "text-amber-300 print:text-amber-700"
                        : "text-stone-400 print:text-neutral-500"
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

                {/* Lista de bebidas */}
                <ul className="flex-1 flex flex-col divide-y divide-stone-800/40 print:divide-neutral-200">
                  {section.drinks.map((drink) => {
                    const isAvailable = drink.available !== false;

                    return (
                      <li key={drink.name} className={`flex-1 flex flex-col justify-center py-4 space-y-1.5 ${!isAvailable ? "opacity-40" : ""}`}>

                        {/* Nombre + precio */}
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display text-lg leading-tight font-medium text-stone-100 print:text-neutral-900">
                                {drink.name}
                              </span>
                              {drink.highlight && (
                                <span className="text-[9px] uppercase tracking-widest bg-amber-600/15 text-amber-400 border border-amber-500/50 rounded-full px-2 py-0.5 print:bg-transparent print:text-amber-700 print:border-amber-600">
                                  Especial
                                </span>
                              )}
                              {drink.seasonal && (
                                <span className="text-[9px] uppercase tracking-widest bg-emerald-600/10 text-emerald-400 border border-emerald-500/40 rounded-full px-2 py-0.5 print:bg-transparent print:text-emerald-700 print:border-emerald-600">
                                  Temporada
                                </span>
                              )}
                            </div>

                            {drink.tag && (
                              <span className="inline-block text-[10px] uppercase tracking-widest text-stone-500 border border-stone-700/60 rounded-full px-2 py-0.5 print:text-neutral-500 print:border-neutral-300">
                                {drink.tag}
                              </span>
                            )}
                          </div>

                          {!drink.sizes && drink.price && (
                            <span className="text-sm tabular-nums text-stone-400 print:text-neutral-600 shrink-0 pt-0.5">
                              ${drink.price}
                            </span>
                          )}
                        </div>

                        {/* Tamaños */}
                        {drink.sizes && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {drink.sizes.map((size) => (
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
                          {drink.ingredients.map((i) => i.name).join(" · ")}
                        </p>

                        {/* Nota */}
                        {drink.note && isAvailable && (
                          <p
                            className={`text-[11px] italic mt-1 leading-snug ${
                              drink.highlight
                                ? "text-amber-500/60 print:text-amber-700/80"
                                : "text-stone-600 print:text-neutral-400"
                            }`}
                          >
                            {drink.note}
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

        {/* Botón de descarga — oculto al imprimir */}
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
