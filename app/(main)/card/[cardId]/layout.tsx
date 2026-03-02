import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    openGraph: {
      images: [{ url: `/api/og`, width: 1200, height: 630 }],
      title: "La Commune · Tarjeta de Fidelidad",
      description: "Acumula visitas y desbloquea tu bebida de cortesía.",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default function CardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
