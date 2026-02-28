"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";

export function StampCardBack({ cardId }: { cardId: string }) {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) return null;

  return (
    <div
      id="stamp-card-back"
      className="absolute inset-0 backface-hidden rotate-y-180 rounded-[24px] overflow-hidden text-[#2B2B2B] shadow-[0_12px_40px_rgba(0,0,0,0.14)] flex flex-col items-center justify-between px-5 py-4"
      style={{ background: "linear-gradient(145deg, #FAF7F4 0%, #F0E9E0 100%)" }}
    >
      {/* Marca */}
      <div className="text-center space-y-1.5">
        <p
          className="text-[15px] font-light tracking-[0.45em] uppercase text-[#2B2B2B]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          La Commune
        </p>
        <div className="w-5 h-px bg-[#C7B7A3] mx-auto" />
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
        <p className="text-[9px] tracking-[0.2em] uppercase text-[#A89E97]">
          Escanea en barra
        </p>
      </div>

      {/* Footer */}
      <p
        className="text-[11px] tracking-wide text-[#8A817A]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Gracias por volver
      </p>
    </div>
  );
}
