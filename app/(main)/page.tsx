"use client";

import { useRouter } from "next/navigation";
import React, { FC, ReactNode } from "react";

// --- Reusable Card Component ---
interface CardProps {
  title: string | ReactNode;
  description?: string | ReactNode;
  ctaText?: string;
  ctaLink?: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
  children?: ReactNode;
}

const Card: FC<CardProps> = ({
  title,
  description,
  ctaText,
  ctaLink,
  bgColor = "bg-white",
  borderColor = "border-[#E7E4E1]",
  textColor = "text-[#1F1B18]",
  children,
}) => {
  const router = useRouter();

  return (
    <section
      className={`w-full ${bgColor} border ${borderColor} px-6 sm:px-10 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center rounded-xl`}
    >
      <div className="space-y-4">
        <h2
          className={`text-2xl sm:text-3xl font-medium leading-snug tracking-wide ${textColor}`}
        >
          {title}
        </h2>

        {description && (
          <div
            className={`text-sm sm:text-base leading-relaxed tracking-wide max-w-md mx-auto ${textColor}/90 space-y-2`}
          >
            {description}
          </div>
        )}
      </div>

      {children}

      {ctaText && ctaLink && (
        <div className="mt-8 sm:mt-10">
          <button
            onClick={() => router.push(ctaLink)}
            className={`
              inline-flex items-center gap-2 sm:gap-3 text-sm sm:text-base uppercase tracking-widest
              ${textColor} border-b ${textColor}/40 pb-1 px-4 py-2
              transition-colors duration-200
              hover:border-current hover:text-[#000]
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1F1B18] rounded
            `}
          >
            {ctaText}
            <span className="text-base leading-none">→</span>
          </button>
        </div>
      )}
    </section>
  );
};

// --- Main Component ---
export default function Home() {
  return (
    <main className="flex grow flex-col items-center bg-white px-4 sm:px-0 py-12">
      <div className="w-full max-w-md space-y-10">
        {/* Menu Card */}
        <Card
          title="Menú"
          description="Descubre nuestras opciones de café y bebidas disponibles hoy."
          ctaText="Ver menú"
          ctaLink="/menu"
          bgColor="bg-[#5f4633]"
          textColor="text-[#d1d1aa]"
          borderColor="border-[#5f4633]/40"
        />
        {/* Experience / Info Card */}
        <Card
          title="Nuestra experiencia"
          description={
            <>
              <p className="text-base sm:text-lg font-medium text-[#3B2F2F] leading-relaxed tracking-wide">
                Preparamos cada bebida con dedicación, buscando el equilibrio perfecto en cada taza.
              </p>

              <p className="text-sm text-[#6A5A5A] leading-relaxed max-w-md mx-auto">
                Después de cinco bebidas, la siguiente es un pequeño regalo de nuestra parte.
              </p>

              <span className="inline-flex items-center gap-1 text-xs tracking-wide text-[#5A4A4A] border border-[#EADADA] rounded-full px-4 py-1 bg-[#F7EEEE]">
                💛 Solo menciónalo al ordenar
              </span>
            </>
          }
          bgColor="bg-[#FFF8F8]"
          borderColor="border-[#F3E6E6]"
          textColor="text-[#3B2F2F]"
        />
        {/* Loyalty Card (opcional) */}
        {/* <Card
          title={
            <>
              Registra tus visitas <br className="hidden sm:block" />
              y recibe beneficios
            </>
          }
          description="Cada vez que vengas, suma un sello en tu tarjeta digital."
          ctaText="Ver tarjeta"
          ctaLink="/card"
          bgColor="bg-[#5f4633]"
          textColor="text-[#d1d1aa]"
          borderColor="border-[#5f4633]/40"
        /> */}
      </div>
    </main>
  );
}