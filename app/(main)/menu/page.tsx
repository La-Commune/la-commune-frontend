"use client";

type Drink = {
  name: string;
  price: number;
};

type Section = {
  title: string;
  drinks: Drink[];
};

const sections: Section[] = [
  {
    title: "Base espresso",
    drinks: [
      { name: "Espresso", price: 30 },
      { name: "Espresso con panna", price: 35 },
      { name: "Americano", price: 35 },
      { name: "Long Black", price: 35 },
    ],
  },
  {
    title: "Con leche",
    drinks: [
      { name: "Cappuccino", price: 40 },
      { name: "Latte", price: 40 },
      { name: "Leche vaporizada", price: 30 },
    ],
  },
  {
    title: "Especiales",
    drinks: [
      { name: "Mocha", price: 45 },
      { name: "Latte Praliné", price: 45 },
      { name: "Chocolate caliente", price: 40 },
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
          flex gap-6 overflow-x-auto snap-x snap-mandatory snap-center pb-4
          md:grid md:grid-cols-3 md:gap-8 md:overflow-visible
          scroll-smooth
        "
      >
        {sections.map((section) => (
          <div
            key={section.title}
            className="
              min-w-[260px] sm:min-w-[280px]
              md:min-w-0
              rounded-3xl
              bg-[#1F1F1F]
              p-8
              shadow-lg
              flex-shrink-0
            "
          >
            <h2 className="text-xs uppercase tracking-widest text-stone-400 mb-6">
              {section.title}
            </h2>

            <ul className="space-y-4">
              {section.drinks.map((drink) => (
                <li
                  key={drink.name}
                  className="flex items-baseline justify-between text-stone-100"
                >
                  <span className="text-sm tracking-wide leading-snug">
                    {drink.name}
                  </span>
                  <span className="text-sm tracking-wide tabular-nums text-stone-300">
                    ${drink.price}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Extras */}
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
            +$5 MXN por jarabe
          </p>
        </div>
      </div>
    </section>
  );
}
