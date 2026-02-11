"use client";

type Ingredient = {
  name: string;
};

type Drink = {
  name: string;
  price: number;
  ingredients: Ingredient[];
  optional?: Ingredient[];
  note?: string;
  available?: boolean;
  tag?: "Fuerte" | "Cremoso" | "Dulce" | "Gourmet" | "Intenso";
};

type Section = {
  title: string;
  description: string;
  drinks: Drink[];
};

const sections: Section[] = [
  {
    title: "Con leche",
    description: "Suaves, balanceadas y cremosas",
    drinks: [
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
        name: "Latte",
        price: 40,
        ingredients: [{ name: "Espresso" }, { name: "Leche vaporizada" }],
      },
      {
        name: "Flat White",
        price: 40,
        ingredients: [
          { name: "Espresso" },
          { name: "Leche vaporizada" },
        ],
        note: "Más café, menos espuma",
        tag: "Intenso",
      },
    ],
  },
  {
    title: "Base espresso",
    description: "Bebidas intensas, cortas y directas",
    drinks: [
      {
        name: "Espresso",
        price: 30,
        ingredients: [{ name: "Espresso" }],
        tag: "Fuerte",
      },
      {
        name: "Espresso con panna",
        price: 35,
        ingredients: [{ name: "Espresso" }, { name: "Crema" }],
        available: false,
      },
      {
        name: "Americano",
        price: 30,
        ingredients: [{ name: "Espresso" }, { name: "Agua caliente" }],
        note: "Espresso servido primero",
      },
      {
        name: "Long Black",
        price: 30,
        ingredients: [{ name: "Agua caliente" }, { name: "Espresso" }],
        note: "Agua caliente primero, espresso después",
      },
    ],
  },
  {
    title: "Especiales",
    description: "Con sabores y perfil más dulce",
    drinks: [
      {
        name: "Mocha",
        price: 45,
        ingredients: [
          { name: "Espresso" },
          { name: "Chocolate" },
          { name: "Cocoa" },
          { name: "Leche" },
        ],
        note: "Clásico o con un toque de vainilla, al mismo precio",
        tag: "Dulce",
      },
      {
        name: "Latte Praliné",
        price: 45,
        ingredients: [
          { name: "Espresso" },
          { name: "Caramelo" },
          { name: "Leche" },
          { name: "Praliné (nuez pecana)" },
        ],
        tag: "Gourmet",
      },
      {
        name: "Chocolate caliente",
        price: 40,
        ingredients: [
          { name: "Chocolate" },
          { name: "Cocoa" },
          { name: "Leche" },
        ],
        optional: [{ name: "Vainilla" }],
        note: "Perfil más redondo y reconfortante",
        tag: "Dulce",
      },
    ],
  },
  {
    title: "Galletas",
    description: "Para acompañar tu café",
    drinks: [
      {
        name: "Pastizetas mini · 3 piezas",
        price: 20,
        ingredients: [{ name: "Galleta artesanal tamaño bocado" }],
        optional: [{ name: "Cubierta chocolate +$5 MXN" }],
        available: false,
      },
      {
        name: "Pastizetas mini · 5 piezas",
        price: 30,
        ingredients: [{ name: "Galleta artesanal tamaño bocado" }],
        optional: [{ name: "Cubierta chocolate +$10 MXN" }],
        available: false,
      },
    ],
  },
];

export default function CafeMenu() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <header className="text-center mb-12 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-medium tracking-widest uppercase">
          Menú
        </h1>
        <p className="text-sm tracking-wide text-stone-400">
          Bebidas calientes y alimentos
        </p>
      </header>

      {/* Scroll hint */}
      <p className="md:hidden text-xs text-stone-400 mb-3 text-right">
        Desliza →
      </p>

      {/* Menu */}
      <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible">
        {sections.map((section) => (
          <div
            key={section.title}
            className="min-w-[260px] snap-center rounded-3xl bg-[#1F1F1F] p-8 shadow-lg"
          >
            <h2 className="text-xs uppercase tracking-widest text-stone-300 mb-1">
              {section.title}
            </h2>
            <p className="text-[11px] tracking-wide text-stone-500 mb-6">
              {section.description}
            </p>

            <ul className="space-y-6">
              {section.drinks.map((drink) => {
                const isAvailable = drink.available !== false;

                return (
                  <li
                    key={drink.name}
                    className={`space-y-2 ${
                      !isAvailable ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[15px] font-medium text-stone-100">
                          {drink.name}
                        </p>
                        {drink.tag && (
                          <span className="inline-block mt-1 text-[10px] uppercase tracking-widest text-stone-400 border border-stone-600 rounded-full px-2 py-0.5">
                            {drink.tag}
                          </span>
                        )}
                      </div>
                      <span className="text-sm tabular-nums text-stone-400">
                        ${drink.price} MXN
                      </span>
                    </div>

                    <p className="text-xs text-stone-300">
                      {drink.ingredients.map((i) => `• ${i.name}`).join(" ")}
                    </p>

                    {drink.optional && isAvailable && (
                      <p className="text-xs text-stone-500">
                        Personalízalo:{" "}
                        {drink.optional.map((o) => o.name).join(" · ")}
                      </p>
                    )}

                    {drink.note && isAvailable && (
                      <p className="text-xs italic text-stone-400 border-l-2 border-stone-600 pl-3">
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
        ))}
      </div>

      {/* Personalización */}
      <div className="mt-16 grid gap-8 md:grid-cols-2">
        <div className="rounded-3xl bg-[#1F1F1F] p-8">
          <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-4">
            Intensidad
          </h3>
          <div className="flex gap-2">
            {["Suave", "Normal"].map((level) => (
              <span
                key={level}
                className="text-xs px-3 py-1 rounded-full border border-stone-600 text-stone-300"
              >
                {level}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-[#1F1F1F] p-8">
          <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-4">
            Sabores
          </h3>
          <p className="text-sm text-stone-200">
            Vainilla · Avellana · Caramelo
          </p>
          <p className="text-xs text-stone-400 mt-2">
            Disponible para bebidas con leche · +$5 MXN
          </p>
        </div>
      </div>
    </section>
  );
}
