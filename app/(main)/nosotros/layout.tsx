import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nosotros · La Commune",
  description: "Conoce la historia, filosofía y el equipo detrás de La Commune en Mineral de la Reforma, Hidalgo.",
};

export default function NosotrosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
