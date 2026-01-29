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
        className="
        absolute inset-0 backface-hidden rotate-y-180
        rounded-[24px]
        bg-[#FAF7F4]
        text-[#2B2B2B]
        shadow-[0_10px_30px_rgba(0,0,0,0.08)]
        flex flex-col justify-between
        px-5 py-4
        "
        >
            <div className="text-center">
                <p className="text-[10px] text-[#8A817A]">
                    Tu recompensa
                </p>
                <h3 className="text-sm font-medium">
                    Muéstrala en barra
                </h3>
            </div>

            <div className="flex justify-center">
                <div className="rounded-2xl bg-white p-2">
                <QRCodeCanvas
                    data-qr
                    value={`${origin}/card/${cardId}`}
                    size={104}
                    />

                </div>
            </div>

            <p className="text-[11px] text-center text-[#8A817A]">
            Gracias por volver 🤍
            </p>
        </div>
    );
  }
  
