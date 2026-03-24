import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registro · La Commune",
  description: "Únete al programa de fidelidad de La Commune y empieza a acumular sellos para tu bebida de cortesía.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
