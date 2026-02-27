import type { Metadata } from "next";
import { Work_Sans, Cormorant_Garamond } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import { MyFirebaseProvider } from "@/components/firebase-providers";
import { Toaster } from "@/components/ui/toaster";
import { ReactNode } from "react";

const sans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "La commune",
  description:
    "La commune, tu cafetería de barrio. Junta sellos y canjea tu recompensa en tu próxima visita.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={cn(sans.variable, display.variable, sans.className)}>
        <MyFirebaseProvider>
          {children}
          <Toaster />
        </MyFirebaseProvider>
      </body>
    </html>
  );
}
