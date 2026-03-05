"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function StampCardBack({ cardId }: { cardId: string }) {
  const [origin, setOrigin] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    setOrigin(window.location.origin);
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!origin) return null;

  return (
    <div
      id="stamp-card-back"
      className="absolute inset-0 backface-hidden rotate-y-180 rounded-[24px] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.14)] flex flex-col items-center justify-between px-5 py-4"
      style={{
        background: isDark
          ? "linear-gradient(145deg, #1A1412 0%, #2A2220 100%)"
          : "linear-gradient(145deg, #FAF7F4 0%, #F0E9E0 100%)",
        color: isDark ? "#E8DDD5" : "#2B2B2B",
      }}
    >
      {/* Marca */}
      <div className="text-center space-y-1.5">
        <p
          className="text-[15px] font-light tracking-[0.45em] uppercase"
          style={{ fontFamily: "var(--font-display)", color: isDark ? "#D4C8BE" : "#2B2B2B" }}
        >
          La Commune
        </p>
        <div className="w-5 h-px mx-auto" style={{ background: isDark ? "#4A3F3A" : "#C7B7A3" }} />
      </div>

      {/* QR */}
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-2xl bg-white p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <QRCodeCanvas
            data-qr
            value={`${origin}/card/${cardId}`}
            size={96}
            bgColor="#FFFFFF"
            fgColor="#2B2B2B"
          />
        </div>
        <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: isDark ? "#7A706A" : "#A89E97" }}>
          {isOffline ? "Sin conexion" : "Escanea en barra"}
        </p>
        {isOffline && (
          <p className="text-[9px] tracking-wide" style={{ color: "#A0522D" }}>
            Requiere conexion para escanear
          </p>
        )}
      </div>

      {/* Footer */}
      <p
        className="text-[11px] tracking-wide"
        style={{ fontFamily: "var(--font-display)", color: isDark ? "#7A706A" : "#8A817A" }}
      >
        Gracias por volver
      </p>
    </div>
  );
}
