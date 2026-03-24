import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Menú · La Commune",
  description: "Descubre nuestras bebidas de especialidad, alimentos y más en La Commune.",
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
