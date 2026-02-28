import type { Metadata } from "next";
import { Work_Sans, Cormorant_Garamond } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { MyFirebaseProvider } from "@/components/firebase-providers";
import { Toaster } from "@/components/ui/toaster";
import { PwaRegister } from "@/components/ui/PwaRegister";
import { ReactNode } from "react";

const sans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "La Commune",
  description:
    "Tu tarjeta de fidelidad digital. Acumula visitas y desbloquea tu bebida de cortesía en La Commune, Pachuca.",
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
    <html lang="en">
      <body className={cn(sans.variable, display.variable, sans.className)}>
        <MyFirebaseProvider>
          {children}
          <Toaster />
          <PwaRegister />
        </MyFirebaseProvider>
      </body>
    </html>
  );
}
