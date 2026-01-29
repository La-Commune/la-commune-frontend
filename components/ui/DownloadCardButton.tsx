"use client";

import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";

export function DownloadCardButton() {
    const handleDownload = async () => {
        const node = document.getElementById("stamp-card-back");
        if (!node) return;
      
        const wrapper = document.createElement("div");
        wrapper.style.position = "fixed";
        wrapper.style.left = "-10000px";
        wrapper.style.top = "0";
        wrapper.style.width = "320px";
        wrapper.style.height = "210px";
      
        const clone = node.cloneNode(true) as HTMLElement;
      
        const originalCanvas = node.querySelector("canvas");
        const clonedCanvas = clone.querySelector("canvas");
        
        if (originalCanvas && clonedCanvas) {
          const rect = originalCanvas.getBoundingClientRect();
        
          const img = document.createElement("img");
          img.src = originalCanvas.toDataURL("image/png");
        
          img.style.width = `${rect.width}px`;
          img.style.height = `${rect.height}px`;
        
          // importante para layout
          img.style.display = "block";
        
          clonedCanvas.replaceWith(img);
        }
      
        clone.style.transform = "none";
        clone.style.backfaceVisibility = "visible";
      
        wrapper.appendChild(clone);
        document.body.appendChild(wrapper);
      
        try {
          const dataUrl = await toPng(clone, {
            pixelRatio: 3,
            cacheBust: true,
          });
      
          const link = document.createElement("a");
          link.download = "mi-tarjeta-cafe.png";
          link.href = dataUrl;
          link.click();
        } finally {
          document.body.removeChild(wrapper);
        }
      };
      

  return (
    <Button
    onClick={handleDownload}
    className="
        rounded-full
        bg-[#2B2B2B]
        text-[#FAF7F4]
        px-6 py-2
        text-sm
        shadow-md
        active:scale-95
        transition
    "
    >
    Guardar mi tarjeta
    </Button>
  );
}
