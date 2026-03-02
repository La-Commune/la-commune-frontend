"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, DocumentReference } from "firebase/firestore";
import { useFirestore, useFirestoreDocData } from "reactfire";
import { Card } from "@/models/card.model";
import { Customer } from "@/models/customer.model";
import { QrScanner } from "@/components/ui/QrScanner";
import { MenuAdmin } from "@/components/ui/MenuAdmin";
import { CustomerDirectory } from "@/components/ui/CustomerDirectory";
import { AnalyticsDashboard } from "@/components/ui/AnalyticsDashboard";
import { verifyAdminPin, checkBaristaSession, logoutBarista } from "@/app/actions/verifyAdminPin";
import { addStamp, redeemCard, undoStamp } from "@/services/card.service";
import { getFullMenu } from "@/services/menu.service";
import { timeAgo } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  enqueue,
  removeFromQueue,
  markFailed,
  getQueue,
  resetFailed,
  QueuedStamp,
} from "@/lib/offlineQueue";

type Screen = "pin" | "stamp" | "success" | "redeemed" | "queued";

interface AdminConfig {
  pinLength?: number;
  pinHmac?: string;
}

interface LoadedCard {
  id: string;
  stamps: number;
  maxStamps: number;
  status: string;
  customerId: DocumentReference | undefined;
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
  lockoutSeconds = 0,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  error: string;
  loading?: boolean;
  pinLength?: number;
  lockoutSeconds?: number;
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
        disabled={value.length < pinLength || loading || lockoutSeconds > 0}
        className="mt-2 w-full max-w-[220px] py-3 rounded-full bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-white transition-colors duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
      >
        {loading
          ? "Verificando…"
          : lockoutSeconds > 0
          ? `Bloqueado ${String(Math.floor(lockoutSeconds / 60)).padStart(2, "0")}:${String(lockoutSeconds % 60).padStart(2, "0")}`
          : "Entrar"}
      </button>
    </div>
  );
}

interface StampEntry {
  customerName: string;
  stamps: number;
  maxStamps: number;
  time: Date;
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
  const [stampHistory, setStampHistory] = useState<StampEntry[]>([]);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo countdown
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number | null>(null);
  const undoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Bebida
  const [selectedDrink, setSelectedDrink] = useState("");
  const [customDrink, setCustomDrink] = useState("");
  const [stampSize, setStampSize] = useState("");
  const [menuDrinks, setMenuDrinks] = useState<string[]>([]);

  // Offline queue
  const { isOnline } = useNetworkStatus();
  const [pendingQueue, setPendingQueue] = useState<QueuedStamp[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");

  // Cargar bebidas disponibles del menú
  useEffect(() => {
    getFullMenu(firestore)
      .then((sections) => {
        const drinks = sections
          .filter((s) => s.type === "drink" && s.active)
          .flatMap((s) => s.items ?? [])
          .filter((item) => item.available !== false)
          .map((item) => item.name);
        setMenuDrinks(drinks);
      })
      .catch(() => {
        toast({ variant: "destructive", title: "No se pudo cargar el menú de bebidas" });
      });
  }, [firestore]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, []);

  // Cargar queue al montar
  useEffect(() => {
    setPendingQueue(getQueue());
  }, []);

  const syncQueue = useCallback(async () => {
    const pending = getQueue().filter((q) => q.status === "pending");
    if (pending.length === 0) return;
    setSyncStatus("syncing");
    let hasError = false;
    for (const item of pending) {
      try {
        const customerIdRef = item.customerId
          ? doc(firestore, item.customerId)
          : undefined;
        await addStamp(firestore, item.cardId, {
          customerId: customerIdRef,
          addedBy: "barista",
          drinkType: item.drinkType,
          size: item.size,
        });
        removeFromQueue(item.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        markFailed(item.id, msg);
        hasError = true;
      }
    }
    setPendingQueue(getQueue());
    setSyncStatus(hasError ? "error" : "idle");
  }, [firestore]);

  // Auto-sync al recuperar conexión
  useEffect(() => {
    if (isOnline) {
      const pending = getQueue().filter((q) => q.status === "pending");
      if (pending.length > 0) syncQueue();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const clearUndoCountdown = useCallback(() => {
    if (undoIntervalRef.current) {
      clearInterval(undoIntervalRef.current);
      undoIntervalRef.current = null;
    }
    setLastEventId(null);
    setUndoSecondsLeft(null);
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
        if (custSnap.exists()) customerName = (custSnap.data() as Customer)?.name ?? "";
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
      setError(
        !navigator.onLine
          ? "Sin conexión. Si ya cargaste esta tarjeta antes, inténtalo de nuevo."
          : "Error al cargar la tarjeta",
      );
    }
    setLoading(false);
  }, [firestore]);

  const handleQrScan = useCallback((value: string) => {
    setScanning(false);
    setCardInput(value);
    loadCard(value);
  }, [loadCard]);

  const resetStampForm = useCallback(() => {
    setScreen("stamp");
    setCardInput("");
    setCard(null);
    setSelectedDrink("");
    setCustomDrink("");
    setStampSize("");
  }, []);

  const handleAddStamp = useCallback(async () => {
    if (!card) return;
    clearUndoCountdown();
    if (resetTimer.current) clearTimeout(resetTimer.current);

    const finalDrink = selectedDrink === "otro"
      ? (customDrink.trim() || undefined)
      : (selectedDrink || undefined);

    // Offline path: enqueue and show queued screen
    if (!isOnline) {
      const optimisticStamps = Math.min(card.stamps + 1, card.maxStamps);
      enqueue({
        cardId: card.id,
        customerId: card.customerId?.path,
        customerName: card.customerName,
        drinkType: finalDrink,
        size: stampSize || undefined,
      });
      setCard({ ...card, stamps: optimisticStamps });
      setStampHistory((prev) => [
        { customerName: card.customerName || "Cliente", stamps: optimisticStamps, maxStamps: card.maxStamps, time: new Date() },
        ...prev,
      ].slice(0, 5));
      setPendingQueue(getQueue());
      setScreen("queued");
      resetTimer.current = setTimeout(() => resetStampForm(), 3000);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await addStamp(firestore, card.id, {
        customerId: card.customerId ?? undefined,
        addedBy: "barista",
        drinkType: finalDrink,
        size: stampSize || undefined,
      });
      setCard({ ...card, stamps: result.stamps, status: result.status });
      setStampHistory((prev) => [
        { customerName: card.customerName || "Cliente", stamps: result.stamps, maxStamps: card.maxStamps, time: new Date() },
        ...prev,
      ].slice(0, 5));
      setScreen("success");

      // Iniciar countdown de undo (30s)
      setLastEventId(result.eventId);
      setUndoSecondsLeft(30);
      undoIntervalRef.current = setInterval(() => {
        setUndoSecondsLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(undoIntervalRef.current!);
            undoIntervalRef.current = null;
            setLastEventId(null);
            // Auto-reset al terminar el countdown
            resetStampForm();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError("Error al añadir el sello. Intenta de nuevo.");
    }
    setLoading(false);
  }, [card, firestore, selectedDrink, customDrink, stampSize, clearUndoCountdown, isOnline, resetStampForm]);

  const handleUndo = useCallback(async () => {
    if (!card || !lastEventId) return;
    setLoading(true);
    try {
      await undoStamp(firestore, card.id, lastEventId);
      clearUndoCountdown();
      setCard({ ...card, stamps: Math.max(0, card.stamps - 1), status: "active" });
      setScreen("stamp");
      if (resetTimer.current) clearTimeout(resetTimer.current);
    } catch {
      setError("Error al deshacer el sello.");
    }
    setLoading(false);
  }, [card, lastEventId, firestore, clearUndoCountdown]);

  const handleRedeem = useCallback(async () => {
    if (!card) return;
    clearUndoCountdown();
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setLoading(true);
    setError("");
    try {
      const rewardRef = doc(firestore, "rewards", "default");
      if (!card.customerId) throw new Error("Cliente no encontrado");
      await redeemCard(firestore, {
        oldCardId: card.id,
        customerRef: card.customerId,
        rewardRef,
      });
      setScreen("redeemed");
      resetTimer.current = setTimeout(() => {
        setScreen("stamp");
        setCardInput("");
        setCard(null);
      }, 4000);
    } catch {
      setError("Error al canjear. Intenta de nuevo.");
    }
    setLoading(false);
  }, [card, firestore, clearUndoCountdown]);

  const isComplete = card ? card.stamps >= card.maxStamps : false;
  const progress = card ? (card.stamps / card.maxStamps) * 100 : 0;

  const pendingCount = pendingQueue.filter((q) => q.status === "pending").length;
  const failedCount = pendingQueue.filter((q) => q.status === "failed").length;

  return (
    <div className="flex flex-col gap-8 w-full max-w-sm mx-auto">

      {/* Banner offline */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-800/40 bg-amber-900/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-amber-500 shrink-0">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
              <circle cx="12" cy="20" r="1" fill="currentColor"/>
            </svg>
            <span className="text-[11px] uppercase tracking-[0.2em] text-amber-400">
              Sin conexión
              {pendingCount > 0 && ` · ${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de sincronización */}
      <AnimatePresence>
        {isOnline && pendingQueue.length > 0 && (
          <motion.div
            key="sync-bar"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border ${
              syncStatus === "error"
                ? "border-red-800/40 bg-red-900/10"
                : "border-stone-800 bg-stone-900/50"
            }`}
          >
            <span className={`text-[11px] uppercase tracking-[0.2em] ${
              syncStatus === "error" ? "text-red-400" : "text-stone-400"
            }`}>
              {syncStatus === "syncing"
                ? "Sincronizando…"
                : syncStatus === "error"
                ? `Error al sincronizar ${failedCount}`
                : "Todo sincronizado"}
            </span>
            {syncStatus === "error" && (
              <button
                onClick={() => { resetFailed(); setPendingQueue(getQueue()); syncQueue(); }}
                className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-white transition-colors"
              >
                Reintentar
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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

            {/* Selector de bebida — solo al agregar sello */}
            {!isComplete && (
              <div className="space-y-3 pt-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-stone-600">
                  ¿Qué pidió?{" "}
                  <span className="text-stone-800">· opcional</span>
                </p>

                {/* Chips de bebidas */}
                <div className="flex flex-wrap gap-2">
                  {menuDrinks.length === 0 && (
                    <p className="text-[10px] text-stone-800 uppercase tracking-widest">
                      Sin bebidas en el menú
                    </p>
                  )}
                  {menuDrinks.map((drink) => (
                    <button
                      key={drink}
                      onClick={() => setSelectedDrink((prev) => prev === drink ? "" : drink)}
                      className={`px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-widest transition-all duration-150 ${
                        selectedDrink === drink
                          ? "border-stone-400 text-stone-100 bg-stone-800"
                          : "border-stone-800 text-stone-600 hover:border-stone-700 hover:text-stone-400"
                      }`}
                    >
                      {drink}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedDrink((prev) => prev === "otro" ? "" : "otro")}
                    className={`px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-widest transition-all duration-150 ${
                      selectedDrink === "otro"
                        ? "border-stone-400 text-stone-100 bg-stone-800"
                        : "border-stone-800 text-stone-600 hover:border-stone-700 hover:text-stone-400"
                    }`}
                  >
                    Otro
                  </button>
                </div>

                {/* Input libre para "Otro" */}
                {selectedDrink === "otro" && (
                  <input
                    type="text"
                    value={customDrink}
                    onChange={(e) => setCustomDrink(e.target.value)}
                    placeholder="Nombre de la bebida"
                    autoFocus
                    className="w-full bg-neutral-950 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-stone-700 focus:outline-none focus:border-stone-600 transition-colors"
                  />
                )}

                {/* Tamaño — solo si hay bebida seleccionada */}
                {selectedDrink && selectedDrink !== "otro" && (
                  <div className="flex gap-2">
                    {(["10oz", "12oz"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStampSize((prev) => prev === s ? "" : s)}
                        className={`px-4 py-1.5 rounded-full border text-[10px] uppercase tracking-widest transition-all duration-150 ${
                          stampSize === s
                            ? "border-stone-400 text-stone-100 bg-stone-800"
                            : "border-stone-800 text-stone-600 hover:border-stone-700 hover:text-stone-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Banner umbral: a 1 sello de la cortesía */}
            {!isComplete && card.stamps === card.maxStamps - 1 && (
              <div className="px-4 py-3 rounded-xl border border-amber-800/40 bg-amber-900/10 flex items-center gap-2">
                <span className="text-base leading-none">⚡</span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-amber-400">
                  ¡Este cliente está a 1 sello de su bebida gratis!
                </span>
              </div>
            )}

            {/* Botón — sello o canje según estado */}
            {isComplete ? (
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 text-[11px] uppercase tracking-[0.35em] hover:bg-amber-500/20 hover:border-amber-400 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Canjeando…" : "Canjear cortesía · Nueva tarjeta"}
              </button>
            ) : (
              <button
                onClick={handleAddStamp}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-stone-200 text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Guardando…" : "Añadir sello"}
              </button>
            )}
          </motion.div>
        )}

        {screen === "redeemed" && (
          <motion.div
            key="redeemed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-amber-800/40 bg-amber-900/10 p-8 text-center space-y-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-4xl"
            >
              ☕
            </motion.div>
            <p
              className="text-xl font-light text-amber-300"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cortesía entregada
            </p>
            <p className="text-[10px] uppercase tracking-widest text-amber-700">
              {card?.customerName || "Cliente"} · Nueva tarjeta lista
            </p>
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
            {undoSecondsLeft !== null && lastEventId && (
              <button
                onClick={handleUndo}
                disabled={loading}
                className="mt-1 text-[10px] uppercase tracking-[0.3em] text-stone-600 hover:text-stone-400 transition-colors disabled:opacity-40"
              >
                Deshacer ({undoSecondsLeft}s)
              </button>
            )}
          </motion.div>
        )}

        {screen === "queued" && (
          <motion.div
            key="queued"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-amber-800/40 bg-amber-900/10 p-8 text-center space-y-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-4xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-amber-400 mx-auto">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
                <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                <circle cx="12" cy="20" r="1" fill="currentColor"/>
              </svg>
            </motion.div>
            <p
              className="text-xl font-light text-amber-300"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Guardado sin conexión
            </p>
            <p className="text-[10px] uppercase tracking-widest text-amber-700">
              {card?.customerName || "Cliente"} · Se sincronizará al recuperar conexión
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

      {/* Historial de sellos de sesión */}
      {stampHistory.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-stone-700 text-center">
            Sellos de esta sesión
          </p>
          <div className="space-y-1.5">
            {stampHistory.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-stone-900 bg-neutral-950 text-stone-500"
              >
                <span className="text-[11px] text-stone-400 truncate max-w-[140px]">
                  {entry.customerName}
                </span>
                <span className="text-[10px] tracking-widest">
                  {entry.stamps}/{entry.maxStamps}
                </span>
                <span className="text-[10px] text-stone-700">
                  {timeAgo(entry.time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Página principal ─────────────────────────────────── */
export default function AdminPage() {
  const firestore = useFirestore();
  const configRef = doc(firestore, "config", "admin");
  const { data: adminConfig } = useFirestoreDocData(configRef, { suspense: false });
  const pinLength = (adminConfig as AdminConfig)?.pinLength ?? 4;

  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<"stamps" | "menu" | "customers" | "analytics">("stamps");
  const [lockout, setLockout] = useState(0);
  const pinLoadingRef = useRef(false);

  // Countdown del lockout
  useEffect(() => {
    if (lockout <= 0) return;
    const id = setInterval(() => {
      setLockout((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [lockout]);

  // Auto-auth si la cookie de sesión sigue siendo válida
  useEffect(() => {
    checkBaristaSession().then((valid) => {
      if (valid) setAuthed(true);
    });
  }, []);

  const handlePinSubmit = useCallback(async (pinValue: string) => {
    if (pinLoadingRef.current) return;
    pinLoadingRef.current = true;
    setPinLoading(true);
    try {
      const result = await verifyAdminPin(pinValue);
      if (result.ok) {
        setAuthed(true);
        setPinError("");
      } else if (result.blocked) {
        setLockout(result.retryAfter);
        setPinError("");
        setPin("");
      } else {
        setPinError("PIN incorrecto");
        setPin("");
      }
    } catch {
      setPinError("Error al verificar. Intenta de nuevo.");
      setPin("");
    }
    setPinLoading(false);
    pinLoadingRef.current = false;
  }, []);

  // Auto-submit al completar todos los dígitos
  useEffect(() => {
    if (pin.length === pinLength && !authed && lockout <= 0) {
      handlePinSubmit(pin);
    }
  }, [pin, pinLength, authed, lockout, handlePinSubmit]);

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
      <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6 sm:px-10 pb-16">

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
                onSubmit={() => handlePinSubmit(pin)}
                error={pinError}
                loading={pinLoading}
                pinLength={pinLength}
                lockoutSeconds={lockout}
              />
            </motion.div>
          ) : (
            <motion.div
              key="stamp"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`flex flex-col items-center gap-6 w-full ${adminTab === "menu" ? "justify-start" : ""}`}
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <p className="text-[10px] uppercase tracking-[0.4em] text-stone-600">
                  Barista
                </p>
                <h1
                  className="text-4xl font-light tracking-wide text-stone-200"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {adminTab === "stamps" ? "Añadir sello"
                    : adminTab === "menu" ? "Gestionar menú"
                    : adminTab === "customers" ? "Clientes"
                    : "Analytics"}
                </h1>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-neutral-900 border border-stone-800 rounded-xl flex-wrap justify-center">
                {(["stamps", "menu", "customers", "analytics"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAdminTab(tab)}
                    className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.3em] transition-all duration-200 ${
                      adminTab === tab
                        ? "bg-stone-200 text-neutral-900"
                        : "text-stone-600 hover:text-stone-300"
                    }`}
                  >
                    {tab === "stamps" ? "Sellos"
                      : tab === "menu" ? "Menú"
                      : tab === "customers" ? "Clientes"
                      : "Analytics"}
                  </button>
                ))}
              </div>

              {/* Contenido */}
              <AnimatePresence mode="wait">
                {adminTab === "stamps" && (
                  <motion.div
                    key="stamps-view"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <StampView onLogout={() => { logoutBarista(); setAuthed(false); setPin(""); }} />
                  </motion.div>
                )}
                {adminTab === "menu" && (
                  <motion.div
                    key="menu-view"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <MenuAdmin />
                  </motion.div>
                )}
                {adminTab === "customers" && (
                  <motion.div
                    key="customers-view"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <CustomerDirectory />
                  </motion.div>
                )}
                {adminTab === "analytics" && (
                  <motion.div
                    key="analytics-view"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <AnalyticsDashboard />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
