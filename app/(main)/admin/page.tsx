"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Card } from "@/models/card.model";
import { QrScanner } from "@/components/ui/QrScanner";
import { verifyAdminPin } from "@/app/actions/verifyAdminPin";
import { addStamp } from "@/services/card.service";

type Screen = "pin" | "stamp" | "success";

interface LoadedCard {
  id: string;
  stamps: number;
  maxStamps: number;
  status: string;
  customerId: any;
  customerName: string;
}

/* ── Teclado numérico ─────────────────────────────────── */
function PinPad({
  value,
  onChange,
  onSubmit,
  error,
  loading,
  pinLength = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error: string;
  loading?: boolean;
  pinLength?: number;
}) {
  const press = (digit: string) => {
    if (value.length < pinLength) onChange(value + digit);
  };
  const del = () => onChange(value.slice(0, -1));

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Indicadores dinámicos */}
      <div className="flex gap-3 flex-wrap justify-center max-w-[260px]">
        {Array.from({ length: pinLength }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border transition-all duration-200 ${
              i < value.length
                ? "bg-stone-200 border-stone-200"
                : "bg-transparent border-stone-700"
            }`}
          />
        ))}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] uppercase tracking-widest text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Teclado */}
      <div className="grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => {
          if (k === "") return <div key={i} />;
          return (
            <button
              key={i}
              onClick={() => (k === "⌫" ? del() : press(k))}
              className="w-16 h-16 rounded-2xl border border-stone-800 text-stone-300 text-lg font-light hover:border-stone-600 hover:text-white hover:bg-stone-900 active:scale-95 transition-all duration-150"
            >
              {k}
            </button>
          );
        })}
      </div>

      <button
        onClick={onSubmit}
        disabled={value.length < pinLength || loading}
        className="mt-2 w-full max-w-[220px] py-3 rounded-full bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-white transition-colors duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
      >
        {loading ? "Verificando…" : "Entrar"}
      </button>
    </div>
  );
}

/* ── Vista de añadir sello ────────────────────────────── */
function StampView({ onLogout }: { onLogout: () => void }) {
  const firestore = useFirestore();
  const [cardInput, setCardInput] = useState("");
  const [card, setCard] = useState<LoadedCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>("stamp");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup del timer al desmontar el componente
  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const resolveCardId = (raw: string) =>
    raw.trim().replace(/^.*\/card\//, "").split("?")[0].split("#")[0];

  const loadCard = useCallback(async (rawId: string) => {
    const id = resolveCardId(rawId);
    if (!id) return;
    setLoading(true);
    setError("");
    setCard(null);
    try {
      const snap = await getDoc(doc(firestore, "cards", id));
      if (!snap.exists()) {
        setError("Tarjeta no encontrada");
        setLoading(false);
        return;
      }
      const data = snap.data() as Card;
      let customerName = "";
      if (data.customerId) {
        const custSnap = await getDoc(data.customerId);
        if (custSnap.exists()) customerName = (custSnap.data() as any).name || "";
      }
      setCard({
        id: snap.id,
        stamps: data.stamps,
        maxStamps: data.maxStamps,
        status: data.status,
        customerId: data.customerId,
        customerName,
      });
    } catch {
      setError("Error al cargar la tarjeta");
    }
    setLoading(false);
  }, [firestore]);

  const handleQrScan = useCallback((value: string) => {
    setScanning(false);
    setCardInput(value);
    loadCard(value);
  }, [loadCard]);

  const handleAddStamp = useCallback(async () => {
    if (!card) return;
    setLoading(true);
    setError("");
    try {
      const result = await addStamp(firestore, card.id, {
        customerId: card.customerId ?? undefined,
        addedBy: "barista",
      });
      setCard({ ...card, stamps: result.stamps, status: result.status });
      setScreen("success");
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        setScreen("stamp");
        setCardInput("");
        setCard(null);
      }, 3000);
    } catch {
      setError("Error al añadir el sello. Intenta de nuevo.");
    }
    setLoading(false);
  }, [card, firestore]);

  const isComplete = card ? card.stamps >= card.maxStamps : false;
  const progress = card ? (card.stamps / card.maxStamps) * 100 : 0;

  return (
    <div className="flex flex-col gap-8 w-full max-w-sm mx-auto">

      {/* Buscador de tarjeta */}
      <div className="space-y-3">
        {/* Botón principal: escanear con cámara */}
        <AnimatePresence mode="wait">
          {scanning ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <QrScanner
                onScan={handleQrScan}
                onClose={() => setScanning(false)}
              />
            </motion.div>
          ) : (
            <motion.button
              key="scan-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setCard(null); setError(""); setScanning(true); }}
              className="w-full py-4 rounded-xl border border-stone-700 text-stone-300 hover:border-stone-500 hover:text-white transition-all duration-200 flex items-center justify-center gap-3 group"
            >
              {/* Ícono cámara */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
              <span className="text-[11px] uppercase tracking-[0.35em]">Escanear QR</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Separador */}
        {!scanning && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-stone-800" />
            <span className="text-[10px] uppercase tracking-widest text-stone-700">o</span>
            <div className="flex-1 h-px bg-stone-800" />
          </div>
        )}

        {/* Input manual (fallback) */}
        {!scanning && (
          <div className="flex gap-2">
            <input
              type="text"
              value={cardInput}
              onChange={(e) => setCardInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadCard(cardInput)}
              placeholder="ID o URL completa del QR"
              className="flex-1 bg-neutral-900 border border-stone-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors"
            />
            <button
              onClick={() => loadCard(cardInput)}
              disabled={loading || !cardInput.trim()}
              className="px-4 rounded-xl border border-stone-700 text-stone-400 hover:border-stone-500 hover:text-white transition-colors duration-200 disabled:opacity-30 text-sm"
            >
              {loading ? "…" : "Buscar"}
            </button>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] uppercase tracking-widest text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Info de tarjeta + acción */}
      <AnimatePresence mode="wait">
        {card && screen === "stamp" && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-stone-800 bg-neutral-900 p-6 space-y-5"
          >
            {/* Cliente */}
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">Cliente</p>
              <p
                className="text-2xl font-light text-stone-100"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {card.customerName || "Sin nombre"}
              </p>
            </div>

            {/* Sellos */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-stone-600">
                <span>Sellos</span>
                <span>{card.stamps} / {card.maxStamps}</span>
              </div>
              <div className="h-[2px] bg-stone-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: isComplete
                      ? "linear-gradient(90deg, #8A6A3A, #C4954A)"
                      : "#E8E0D8",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              {isComplete && (
                <p className="text-[10px] uppercase tracking-widest text-amber-500">
                  ✓ Tarjeta completada — cortesía lista
                </p>
              )}
            </div>

            {/* Botón */}
            <button
              onClick={handleAddStamp}
              disabled={loading || isComplete}
              className="w-full py-4 rounded-xl bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Guardando…" : isComplete ? "Tarjeta completada" : "Añadir sello"}
            </button>
          </motion.div>
        )}

        {screen === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-emerald-800/40 bg-emerald-900/20 p-8 text-center space-y-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-4xl"
            >
              ✓
            </motion.div>
            <p
              className="text-xl font-light text-emerald-300"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sello añadido
            </p>
            <p className="text-[10px] uppercase tracking-widest text-emerald-600">
              {card?.customerName || "Cliente"} · {card?.stamps} / {card?.maxStamps} visitas
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cerrar sesión */}
      <button
        onClick={onLogout}
        className="text-[10px] uppercase tracking-[0.3em] text-stone-700 hover:text-stone-400 transition-colors duration-200 mx-auto"
      >
        Cerrar sesión
      </button>
    </div>
  );
}

/* ── Página principal ─────────────────────────────────── */
export default function AdminPage() {
  const firestore = useFirestore();
  const configRef = doc(firestore, "config", "admin");
  const { data: adminConfig } = useFirestoreDocData(configRef, { suspense: false });
  const pinLength = (adminConfig as any)?.pinLength ?? 4;

  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const handlePinSubmit = async () => {
    setPinLoading(true);
    try {
      const ok = await verifyAdminPin(pin);
      if (ok) {
        setAuthed(true);
        setPinError("");
      } else {
        setPinError("PIN incorrecto");
        setPin("");
      }
    } catch {
      setPinError("Error al verificar. Intenta de nuevo.");
      setPin("");
    }
    setPinLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-white transition-colors duration-300 group"
        >
          <span className="w-4 h-px bg-stone-500 group-hover:w-7 group-hover:bg-white transition-all duration-500" />
          Inicio
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-500">
          La Commune
        </span>
        <div className="w-16" />
      </nav>

      {/* Contenido */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 pb-16">

        <AnimatePresence mode="wait">
          {!authed ? (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              <div className="text-center space-y-2">
                <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">
                  Acceso barista
                </p>
                <h1
                  className="text-4xl font-light tracking-wide text-stone-200"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Panel de sellos
                </h1>
              </div>

              <PinPad
                value={pin}
                onChange={(v) => { setPin(v); setPinError(""); }}
                onSubmit={handlePinSubmit}
                error={pinError}
                loading={pinLoading}
                pinLength={pinLength}
              />
            </motion.div>
          ) : (
            <motion.div
              key="stamp"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center gap-6 w-full"
            >
              <div className="text-center space-y-2">
                <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">
                  Barista
                </p>
                <h1
                  className="text-4xl font-light tracking-wide text-stone-200"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Añadir sello
                </h1>
                <p className="text-[11px] text-stone-600 tracking-wide">
                  Escanea el QR del cliente y copia el ID de la URL
                </p>
              </div>

              <StampView onLogout={() => { setAuthed(false); setPin(""); }} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
