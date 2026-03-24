import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi Perfil · La Commune",
  description: "Gestiona tu cuenta, preferencias y ajustes en La Commune.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
