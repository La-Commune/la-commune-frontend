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
};

type Section = {
  title: string;
  description: string;
  drinks: Drink[];
};

const sections: Section[] = [
  {
    title: "Base espresso",
    description: "Bebidas intensas, cortas y directas",
    drinks: [
      {
        name: "Espresso",
        price: 30,
        ingredients: [{ name: "Espresso" }],
      },
      {
        name: "Espresso con panna",
        price: 35,
        ingredients: [{ name: "Espresso" }, { name: "Crema" }],
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
      },
      {
        name: "Latte",
        price: 40,
        ingredients: [{ name: "Espresso" }, { name: "Leche vaporizada" }],
      },
      {
        name: "Leche vaporizada (12 oz)",
        price: 30,
        ingredients: [{ name: "Leche entera o deslactozada" }],
        note: "Puedes agregar un toque de sabor",
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
      },
      {
        name: "Chocolate caliente",
        price: 40,
        ingredients: [{ name: "Chocolate" }, { name: "Cocoa" }, { name: "Leche" }],
        optional: [{ name: "Vainilla" }],
        note: "Recomendado si te gusta un perfil más redondo",
      },
    ],
  },
];

export default function CafeMenu() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <header className="text-center mb-16 space-y-3">
        <h1 className="text-3xl sm:text-4xl font-medium tracking-widest text-black uppercase">
          menú
        </h1>
        <p className="text-sm sm:text-base tracking-wide text-stone-400">
          Bebidas calientes
        </p>
      </header>

      {/* Menu */}
      <div
        className="
          flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4
          md:grid md:grid-cols-3 md:gap-8 md:overflow-visible
        "
      >
        {sections.map((section) => (
          <div
            key={section.title}
            className="
              min-w-[260px] sm:min-w-[280px]
              md:min-w-0
              snap-center
              rounded-3xl
              bg-[#1F1F1F]
              p-8
              shadow-lg
              flex-shrink-0
            "
          >
            <h2 className="text-xs uppercase tracking-widest text-stone-300 mb-1">
              {section.title}
            </h2>
            <p className="text-[11px] tracking-wide text-stone-500 mb-6">
              {section.description}
            </p>

            <ul className="space-y-6">
              {section.drinks.map((drink) => (
                <li key={drink.name} className="space-y-2">
                  {/* Name + price */}
                  <div className="flex items-center justify-between">
                    <span className="text-base tracking-wide text-stone-100">
                      {drink.name}
                    </span>
                    <span className="text-sm tracking-wide tabular-nums text-stone-400">
                      ${drink.price}
                    </span>
                  </div>

                  {/* Ingredients */}
                  <p className="text-xs tracking-wide text-stone-400">
                    {drink.ingredients.map((i) => i.name).join(" · ")}
                  </p>

                  {/* Optional */}
                  {drink.optional && (
                    <p className="text-xs tracking-wide text-stone-500">
                      Personalízalo:{" "}
                      {drink.optional.map((o) => o.name).join(" · ")}
                    </p>
                  )}

                  {/* Note */}
                  {drink.note && (
                    <p className="text-xs italic tracking-wide text-stone-400 border-l-2 border-stone-600 pl-3">
                      {drink.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Personalization */}
      <div className="mt-16 grid gap-8 md:grid-cols-2">
        <div className="rounded-3xl bg-[#1F1F1F] p-8">
          <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-4">
            Intensidad
          </h3>
          <p className="text-sm tracking-wide text-stone-200">
            Suave · Normal
          </p>
        </div>

        <div className="rounded-3xl bg-[#1F1F1F] p-8">
          <h3 className="text-xs uppercase tracking-widest text-stone-400 mb-4">
            Sabores
          </h3>
          <p className="text-sm tracking-wide text-stone-200">
            Vainilla · Avellana · Caramelo
          </p>
          <p className="text-xs tracking-wide text-stone-400 mt-2">
            +$5 MXN por sabor
          </p>
        </div>
      </div>
    </section>
  );
}
