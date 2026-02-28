import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "La Commune",
    short_name: "La Commune",
    description:
      "Tu tarjeta de fidelidad digital. Acumula visitas y desbloquea tu bebida de cortesía.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#111111",
    theme_color: "#111111",
    categories: ["food", "lifestyle"],
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
    ],
    shortcuts: [
      {
        name: "Mi tarjeta",
        short_name: "Tarjeta",
        description: "Ver mi tarjeta de sellos",
        url: "/card/preview",
        icons: [{ src: "/icons/icon.svg", sizes: "any" }],
      },
      {
        name: "Menú",
        short_name: "Menú",
        description: "Ver el menú de La Commune",
        url: "/menu",
        icons: [{ src: "/icons/icon.svg", sizes: "any" }],
      },
    ],
  };
}
