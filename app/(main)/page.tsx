"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="flex grow flex-col items-center bg-white px-0 py-12">
      <div className="w-full max-w-sm space-y-10">

        {/* Menu Card */}
        <section className="w-full border border-[#E7E4E1] bg-white px-8 sm:px-10 pt-24 pb-20 text-center">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1F1B18] leading-snug tracking-wide">
              Menú
            </h2>

            <p className="text-sm sm:text-base text-[#6B6460] leading-relaxed tracking-wide max-w-md mx-auto">
              Café y opciones disponibles hoy.
            </p>
          </div>

          <div className="mt-10">
            <button
              onClick={() => router.push("/menu")}
              className="
                inline-flex
                items-center
                gap-3
                text-sm
                uppercase
                tracking-widest
                text-[#1F1B18]
                border-b border-[#1F1B18]/40
                pb-1
                transition-all
                hover:border-[#1F1B18]
                hover:gap-4
              "
            >
              Ver menú
              <span className="text-base leading-none">→</span>
            </button>
          </div>
        </section>


        {/* Loyalty Card */}
        <section className="w-full bg-[#5f4633] px-8 sm:px-10 pt-24 pb-20 text-center">
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#d1d1aa] leading-snug tracking-wide">
              Registra tus visitas <br className="hidden sm:block" />
              y recibe beneficios
            </h2>

            <p className="text-sm sm:text-base text-[#d1d1aa]/90 leading-relaxed tracking-wide max-w-md mx-auto">
              Cada vez que vengas, suma un sello en tu tarjeta digital.
            </p>
          </div>

          <div className="mt-10">
            <button
              onClick={() => router.push("/card")}
              className="
                inline-flex
                items-center
                gap-3
                text-sm
                uppercase
                tracking-widest
                text-[#d1d1aa]
                border-b border-[#d1d1aa]/40
                pb-1
                transition-all
                hover:border-[#d1d1aa]
                hover:gap-4
              "
            >
              Ver tarjeta
              <span className="text-base leading-none">→</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
