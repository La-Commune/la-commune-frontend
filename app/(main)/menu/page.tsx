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
        note: "Receta especial con nuez pecana garapiñada con cubierta de praliné",
        tag: "Gourmet",
        highlight: true,
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
        tag: "Dulce",
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
    <div className="min-h-screen bg-neutral-950 text-white">

      {/* Nav fija — back + wordmark */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 py-5 bg-neutral-950/80 backdrop-blur-sm">
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

        {/* Espaciador para centrar el wordmark */}
        <div className="w-16" />
      </nav>

      {/* Contenido */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">

        {/* Header con identidad */}
        <header className="text-center mb-14 space-y-4">
          <h1 className="font-display text-5xl sm:text-7xl font-light tracking-[0.2em] uppercase">
            Menú
          </h1>
          <div className="flex items-center justify-center gap-4">
            <span className="w-8 h-px bg-stone-700" />
            <p className="text-[10px] tracking-[0.35em] uppercase text-stone-500">
              Bebidas
            </p>
            <span className="w-8 h-px bg-stone-700" />
          </div>
        </header>

        <p className="md:hidden text-xs text-stone-500 mb-3 text-right">
          Desliza →
        </p>

        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-8 md:overflow-visible">
          {sections.map((section) => {
            const isFood = section.type === "food";

            return (
              <div
                key={section.title}
                className={`min-w-[260px] snap-center rounded-3xl p-8 shadow-lg border transition-all duration-300
                  ${
                    isFood
                      ? "bg-[#25211C] border-[#3A332A]"
                      : "bg-[#1F1F1F] border-stone-800"
                  }`}
              >
                <h2
                  className={`text-xs uppercase tracking-widest mb-1 ${
                    isFood ? "text-amber-200" : "text-stone-300"
                  }`}
                >
                  {section.title}
                </h2>

                <p
                  className={`text-[11px] tracking-wide mb-6 ${
                    isFood ? "text-amber-400/60" : "text-stone-500"
                  }`}
                >
                  {section.description}
                </p>

                <ul className="space-y-6">
                  {section.drinks.map((drink) => {
                    const isAvailable = drink.available !== false;

                    return (
                      <li
                        key={drink.name}
                        className={`space-y-2 ${!isAvailable ? "opacity-40" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-xl font-medium text-stone-100 flex items-center gap-2">
                              {drink.name}
                              {drink.highlight && (
                                <span className="text-[9px] uppercase tracking-widest bg-amber-600/20 text-amber-400 border border-amber-500 rounded-full px-2 py-0.5">
                                  Especial
                                </span>
                              )}
                            </p>

                            {drink.tag && (
                              <span className="inline-block mt-1 text-[10px] uppercase tracking-widest text-stone-400 border border-stone-600 rounded-full px-2 py-0.5">
                                {drink.tag}
                              </span>
                            )}
                          </div>

                          {!drink.sizes && (
                            <span className="text-sm tabular-nums text-stone-400">
                              ${drink.price} MXN
                            </span>
                          )}
                        </div>

                        {drink.sizes && (
                          <div className="flex gap-3 mt-1 flex-wrap">
                            {drink.sizes.map((size) => (
                              <span
                                key={size.label}
                                className="text-xs px-3 py-1 rounded-full border border-stone-600 text-stone-300"
                              >
                                {size.label} · ${size.price}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-xs text-stone-300 leading-relaxed">
                          {drink.ingredients.map((i) => `• ${i.name}`).join(" ")}
                        </p>

                        {drink.optional && isAvailable && (
                          <p className="text-xs text-stone-500">
                            Personalízalo:{" "}
                            {drink.optional.map((o) => o.name).join(" · ")}
                          </p>
                        )}

                        {drink.note && isAvailable && (
                          <p
                            className={`text-xs italic pl-3 border-l-2 ${
                              drink.highlight
                                ? "text-amber-400 border-amber-500"
                                : "text-stone-400 border-stone-600"
                            }`}
                          >
                            Nota: {drink.note}
                          </p>
                        )}

                        {!isAvailable && (
                          <span className="inline-block text-[10px] uppercase tracking-widest text-stone-500 border border-stone-600 rounded-full px-2 py-1">
                            No disponible hoy
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
