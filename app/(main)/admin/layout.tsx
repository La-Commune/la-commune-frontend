import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin · La Commune",
  description: "Panel de administración de La Commune.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
