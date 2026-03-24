import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar Cuenta · La Commune",
  description: "Recupera el acceso a tu tarjeta de fidelidad en La Commune.",
};

export default function RecoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
