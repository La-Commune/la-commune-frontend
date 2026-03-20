import type { Metadata } from "next";
import { Roboto_Mono, Instrument_Serif } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { PwaRegister } from "@/components/ui/PwaRegister";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ReactNode } from "react";

const mono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-mono",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "La Commune",
  description:
    "Tu tarjeta de fidelidad digital. Acumula visitas y desbloquea tu bebida de cortesía en La Commune.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La Commune",
  },
  icons: {
    apple: [
      { url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn(mono.variable, display.variable, mono.className)}>
        <ThemeProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-commune-carbon focus:text-commune-cream focus:text-xs focus:uppercase focus:tracking-widest">
            Saltar al contenido
          </a>
          {children}
          <Toaster />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
