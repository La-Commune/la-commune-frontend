"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

// -------------------------------------------------------------------
// Canvas-based card image: just brand + QR.
// Vertical (1080x1920) on mobile, horizontal (1200x630) on desktop.
// Minimal, timeless — no data that expires.
// -------------------------------------------------------------------

function isMobileDevice() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getQRDataUrl(): string | null {
  const qrCanvas = document.querySelector("[data-qr]") as HTMLCanvasElement | null;
  if (!qrCanvas) return null;
  return qrCanvas.toDataURL("image/png");
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0A0908");
  bg.addColorStop(0.4, "#141110");
  bg.addColorStop(0.6, "#141110");
  bg.addColorStop(1, "#0A0908");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle horizontal texture
  ctx.strokeStyle = "rgba(196,149,74,0.025)";
  ctx.lineWidth = 1;
  for (let i = 0; i < h; i += 4) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(w, i);
    ctx.stroke();
  }
}

async function generateVerticalCard(): Promise<string> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  drawBackground(ctx, W, H);
  ctx.textAlign = "center";

  // Brand
  ctx.fillStyle = "#E8DDD5";
  ctx.font = "300 32px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "16px";
  ctx.fillText("LA COMMUNE", W / 2 + 8, H / 2 - 340);

  // Separator
  ctx.fillStyle = "#2A2523";
  ctx.fillRect(W / 2 - 30, H / 2 - 300, 60, 1);

  // Subtitle
  ctx.fillStyle = "#5A504A";
  ctx.font = "300 18px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "8px";
  ctx.fillText("CAFE EN COMUN", W / 2 + 4, H / 2 - 260);

  // QR
  const qrDataUrl = getQRDataUrl();
  if (qrDataUrl) {
    const qrSize = 400;
    const qrPadding = 44;
    const qrBoxSize = qrSize + qrPadding * 2;
    const qrX = (W - qrBoxSize) / 2;
    const qrY = H / 2 - 160;

    drawRoundedRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 40);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qrX + qrPadding, qrY + qrPadding, qrSize, qrSize);

    // Label
    ctx.fillStyle = "#5A504A";
    ctx.font = "400 18px system-ui, -apple-system, sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText("ESCANEA EN BARRA", W / 2 + 3, qrY + qrBoxSize + 50);
  }

  // Bottom
  ctx.fillStyle = "#2A2523";
  ctx.fillRect(W / 2 - 30, H / 2 + 440, 60, 1);

  ctx.fillStyle = "#3A3533";
  ctx.font = "300 15px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText("MINERAL DE LA REFORMA, HGO", W / 2 + 2, H / 2 + 485);

  return canvas.toDataURL("image/png", 1.0);
}

async function generateHorizontalCard(): Promise<string> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  drawBackground(ctx, W, H);

  // Left side: brand
  ctx.textAlign = "left";

  ctx.fillStyle = "#E8DDD5";
  ctx.font = "300 26px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "14px";
  ctx.fillText("LA COMMUNE", 80, H / 2 - 40);

  ctx.fillStyle = "#2A2523";
  ctx.fillRect(80, H / 2 - 10, 50, 1);

  ctx.fillStyle = "#5A504A";
  ctx.font = "300 14px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("CAFE EN COMUN", 80, H / 2 + 25);

  // Bottom left
  ctx.fillStyle = "#3A3533";
  ctx.font = "300 11px system-ui, -apple-system, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("MINERAL DE LA REFORMA, HGO", 80, H - 40);

  // Right side: QR
  const qrDataUrl = getQRDataUrl();
  if (qrDataUrl) {
    const qrSize = 280;
    const qrPadding = 34;
    const qrBoxSize = qrSize + qrPadding * 2;
    const qrX = W - qrBoxSize - 80;
    const qrY = (H - qrBoxSize - 36) / 2;

    drawRoundedRect(ctx, qrX, qrY, qrBoxSize, qrBoxSize, 28);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qrX + qrPadding, qrY + qrPadding, qrSize, qrSize);

    ctx.fillStyle = "#5A504A";
    ctx.font = "400 12px system-ui, -apple-system, sans-serif";
    ctx.letterSpacing = "4px";
    ctx.textAlign = "center";
    ctx.fillText("ESCANEA EN BARRA", qrX + qrBoxSize / 2 + 2, qrY + qrBoxSize + 32);
  }

  return canvas.toDataURL("image/png", 1.0);
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------

export function DownloadCardButton({}: {
  cardId: string;
  customerName?: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);

    try {
      const mobile = isMobileDevice();
      const dataUrl = mobile
        ? await generateVerticalCard()
        : await generateHorizontalCard();

      if (isIOS()) {
        setPreviewUrl(dataUrl);
      } else {
        const link = document.createElement("a");
        link.download = `la-commune-tarjeta${mobile ? "-story" : ""}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch {
      // Silent fail
    } finally {
      setGenerating(false);
    }
  }, [generating]);

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={generating}
        aria-label="Guardar tarjeta como imagen"
        className="flex flex-col items-center gap-1.5 group"
      >
        <span className="w-10 h-10 rounded-full border border-stone-300 dark:border-stone-700 flex items-center justify-center group-hover:border-stone-500 dark:group-hover:border-stone-500 transition-colors">
          {generating ? (
            <svg className="animate-spin w-4 h-4 text-stone-400 dark:text-stone-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-stone-400 dark:text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
        </span>
        <span className="text-[9px] uppercase tracking-[0.25em] text-stone-400 dark:text-stone-600 group-hover:text-stone-600 dark:group-hover:text-stone-400 transition-colors">
          Guardar
        </span>
      </button>

      {/* iOS preview overlay — long press to save to gallery */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-label="Vista previa de tarjeta"
            className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center gap-6 p-6"
            onClick={() => setPreviewUrl(null)}
          >
            <p className="text-[10px] uppercase tracking-[0.35em] text-stone-400 text-center">
              Manten presionada la imagen para guardar en tu galeria
            </p>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              src={previewUrl}
              alt="Tarjeta La Commune"
              className="max-h-[70vh] max-w-[90vw] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewUrl(null)}
              aria-label="Cerrar vista previa"
              className="text-[10px] uppercase tracking-[0.3em] text-stone-500 hover:text-white transition-colors"
            >
              Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
