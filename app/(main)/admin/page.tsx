"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/models/card.model";
import { Customer } from "@/models/customer.model";
import { QrScanner } from "@/components/ui/QrScanner";
import { MenuAdmin } from "@/components/ui/MenuAdmin";
import { PromosAdmin } from "@/components/ui/promos/PromosAdmin";
import { CustomerDirectory } from "@/components/ui/CustomerDirectory";
import { AnalyticsDashboard } from "@/components/ui/AnalyticsDashboard";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { verifyAdminPin, checkBaristaSession, logoutBarista, type SessionResult } from "@/app/actions/verifyAdminPin";
import { addStamp, redeemCard, undoStamp } from "@/services/card.service";
import { getDefaultReward, upsertDefaultReward } from "@/services/reward.service";
import { Reward } from "@/models/reward.model";
import { getFullMenu } from "@/services/menu.service";
import { timeAgo } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getSupabase, NEGOCIO_ID } from "@/lib/supabase";
import {
  enqueue,
  removeFromQueue,
  markFailed,
  getQueue,
  resetFailed,
  hasPending,
  requestBackgroundSync,
  requestPeriodicSync,
  QueuedStamp,
} from "@/lib/offlineQueue";

type Screen = "pin" | "stamp" | "success" | "redeemed" | "queued";

type AdminTabId = "stamps" | "menu" | "promos" | "customers" | "analytics" | "config";

const ADMIN_ROLE_ACCESS: Record<AdminTabId, string[]> = {
  stamps:    ["admin", "barista", "camarero"],
  menu:      ["admin"],
  promos:    ["admin"],
  customers: ["admin", "barista"],
  analytics: ["admin"],
  config:    ["admin"],
};

const TAB_LABELS: Record<AdminTabId, string> = {
  stamps: "Sellos",
  menu: "Menu",
  promos: "Promos",
  customers: "Clientes",
  analytics: "Analytics",
  config: "Config",
};

const TAB_TITLES: Record<AdminTabId, string> = {
  stamps: "Añadir sello",
  menu: "Gestionar menu",
  promos: "Promociones",
  customers: "Clientes",
  analytics: "Analytics",
  config: "Configuracion",
};

function getTabsForRole(rol: string): AdminTabId[] {
  return (Object.keys(ADMIN_ROLE_ACCESS) as AdminTabId[]).filter(
    (tab) => ADMIN_ROLE_ACCESS[tab].includes(rol)
  );
}

function getRoleLabel(rol: string): string {
  switch (rol) {
    case "admin": return "Administrador";
    case "barista": return "Barista";
    case "camarero": return "Camarero";
    case "cocina": return "Cocina";
    default: return rol;
  }
}

interface LoadedCard {
  id: string;
  stamps: number;
  maxStamps: number;
  status: string;
  customerId: string | undefined;
  customerName: string;
}

/* -- Teclado numerico ----------------------------------------- */
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lockoutSeconds > 0 || loading) return;
      if (e.key >= "0" && e.key <= "9") {
        if (value.length < pinLength) onChange(value + e.key);
      } else if (e.key === "Backspace") {
        onChange(value.slice(0, -1));
      } else if (e.key === "Enter" && value.length >= pinLength) {
        onSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, pinLength, onChange, onSubmit, loading, lockoutSeconds]);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Indicadores dinamicos */}
      <div className="flex gap-3 flex-wrap justify-center max-w-[260px]">
        {Array.from({ length: pinLength }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border transition-all duration-200 ${
              i < value.length
                ? "bg-stone-700 border-stone-700 dark:bg-stone-200 dark:border-stone-200"
                : "bg-transparent border-stone-300 dark:border-stone-700"
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
            className="text-[10px] uppercase tracking-widest text-red-500 dark:text-red-400"
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
              className="w-16 h-16 rounded-2xl border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 text-lg font-light hover:border-stone-400 dark:hover:border-stone-600 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900 active:scale-95 transition-all duration-150"
            >
              {k}
            </button>
          );
        })}
      </div>

      <button
        onClick={onSubmit}
        disabled={value.length < pinLength || loading || lockoutSeconds > 0}
        className="mt-2 w-full max-w-[220px] py-3 rounded-full bg-stone-800 text-white dark:bg-stone-200 dark:text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-stone-900 dark:hover:bg-white transition-colors duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
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

/* -- Vista de anadir sello ----------------------------------- */
function StampView({ onLogout }: { onLogout: () => void }) {
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

  // Cargar bebidas disponibles del menu
  useEffect(() => {
    getFullMenu()
      .then((sections) => {
        const drinks = sections
          .filter((s) => s.type === "drink" && s.active)
          .flatMap((s) => s.items ?? [])
          .filter((item) => item.available !== false)
          .map((item) => item.name);
        setMenuDrinks(drinks);
      })
      .catch(() => {
        toast({ variant: "destructive", title: "No se pudo cargar el menu de bebidas" });
      });
  }, []);

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
    let syncedCount = 0;
    for (const item of pending) {
      try {
        await addStamp(item.cardId, {
          customerId: item.customerId,
          addedBy: "barista",
          drinkType: item.drinkType,
          size: item.size,
        });
        removeFromQueue(item.id);
        syncedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        markFailed(item.id, msg);
        hasError = true;
      }
    }
    setPendingQueue(getQueue());
    setSyncStatus(hasError ? "error" : "idle");

    // Notificar al SW para que muestre notificacion si la app no esta enfocada
    if (syncedCount > 0 && "serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SYNC_COMPLETE",
        synced: syncedCount,
        failed: hasError ? getQueue().filter((q) => q.status === "failed").length : 0,
      });
    }

    if (syncedCount > 0 && !hasError) {
      toast({
        title: `${syncedCount} sello${syncedCount !== 1 ? "s" : ""} sincronizado${syncedCount !== 1 ? "s" : ""}`,
        variant: "default",
      });
      // Limpiar la barra de sync despues de 3s si todo salio bien
      setTimeout(() => {
        setPendingQueue(getQueue());
      }, 3000);
    }
  }, []);

  // Auto-sync al recuperar conexion o al montar con pendientes
  useEffect(() => {
    if (isOnline && hasPending()) {
      syncQueue();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Sync on mount si hay pendientes (cubre el caso donde la app se cerro y reabre con conexion)
  useEffect(() => {
    if (navigator.onLine && hasPending()) {
      syncQueue();
    }
    // Registrar periodic sync como fallback para reintentos automaticos
    requestPeriodicSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escuchar peticion del SW (Background Sync) para flush de sellos
  useEffect(() => {
    const handler = () => syncQueue();
    window.addEventListener("flush-offline-stamps", handler);
    return () => window.removeEventListener("flush-offline-stamps", handler);
  }, [syncQueue]);

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
      const supabase = getSupabase();
      const { data: cardData, error: cardError } = await supabase
        .from("tarjetas")
        .select("*")
        .eq("id", id)
        .eq("negocio_id", NEGOCIO_ID)
        .single();

      if (cardError || !cardData) {
        setError("Tarjeta no encontrada");
        setLoading(false);
        return;
      }

      let customerName = "";
      if (cardData.cliente_id) {
        const { data: custData } = await supabase
          .from("clientes")
          .select("nombre")
          .eq("id", cardData.cliente_id)
          .eq("negocio_id", NEGOCIO_ID)
          .single();
        customerName = custData?.nombre ?? "";
      }

      setCard({
        id: cardData.id,
        stamps: cardData.sellos,
        maxStamps: cardData.sellos_maximos,
        status: cardData.estado,
        customerId: cardData.cliente_id,
        customerName,
      });
    } catch {
      setError(
        !navigator.onLine
          ? "Sin conexion. Si ya cargaste esta tarjeta antes, intentalo de nuevo."
          : "Error al cargar la tarjeta",
      );
    }
    setLoading(false);
  }, []);

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
        customerId: card.customerId,
        customerName: card.customerName,
        drinkType: finalDrink,
        size: stampSize || undefined,
      });
      // Registrar Background Sync para que el SW sincronice al volver la red
      requestBackgroundSync();
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
      const result = await addStamp(card.id, {
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
      setError("Error al anadir el sello. Intenta de nuevo.");
    }
    setLoading(false);
  }, [card, selectedDrink, customDrink, stampSize, clearUndoCountdown, isOnline, resetStampForm]);

  const handleUndo = useCallback(async () => {
    if (!card || !lastEventId) return;
    setLoading(true);
    try {
      await undoStamp(card.id, lastEventId);
      clearUndoCountdown();
      setCard({ ...card, stamps: Math.max(0, card.stamps - 1), status: "activa" });
      setScreen("stamp");
      if (resetTimer.current) clearTimeout(resetTimer.current);
    } catch {
      setError("Error al deshacer el sello.");
    }
    setLoading(false);
  }, [card, lastEventId, clearUndoCountdown]);

  const handleRedeem = useCallback(async () => {
    if (!card) return;
    clearUndoCountdown();
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setLoading(true);
    setError("");
    try {
      if (!card.customerId) throw new Error("Cliente no encontrado");
      await redeemCard({
        oldCardId: card.id,
        customerId: card.customerId,
        rewardRef: "default",
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
  }, [card, clearUndoCountdown]);

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
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-300/40 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10"
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
            <span className="text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
              Sin conexion
              {pendingCount > 0 && ` · ${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de sincronizacion */}
      <AnimatePresence>
        {isOnline && pendingQueue.length > 0 && (
          <motion.div
            key="sync-bar"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border ${
              syncStatus === "error"
                ? "border-red-300/40 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10"
                : "border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/50"
            }`}
          >
            <span className={`text-[11px] uppercase tracking-[0.2em] ${
              syncStatus === "error" ? "text-red-500 dark:text-red-400" : "text-stone-500 dark:text-stone-400"
            }`}>
              {syncStatus === "syncing"
                ? `Sincronizando ${pendingCount} sello${pendingCount !== 1 ? "s" : ""}…`
                : syncStatus === "error"
                ? `Error al sincronizar ${failedCount}`
                : "Todo sincronizado"}
            </span>
            {syncStatus === "error" && (
              <button
                onClick={() => { resetFailed(); setPendingQueue(getQueue()); syncQueue(); }}
                className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              >
                Reintentar
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buscador de tarjeta */}
      <div className="space-y-3">
        {/* Boton principal: escanear con camara */}
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
              className="w-full py-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-500 hover:text-stone-900 dark:hover:text-white transition-all duration-200 flex items-center justify-center gap-3 group"
            >
              {/* Icono camara */}
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
            <div aria-hidden="true" className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
            <span className="text-[10px] uppercase tracking-widest text-stone-300 dark:text-stone-700">o</span>
            <div aria-hidden="true" className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
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
              className="flex-1 bg-white dark:bg-neutral-900 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors"
            />
            <button
              onClick={() => loadCard(cardInput)}
              disabled={loading || !cardInput.trim()}
              className="px-4 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors duration-200 disabled:opacity-30 text-sm"
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
              className="text-[10px] uppercase tracking-widest text-red-500 dark:text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Info de tarjeta + accion */}
      <AnimatePresence mode="wait">
        {card && screen === "stamp" && (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-neutral-900 p-6 space-y-5"
          >
            {/* Cliente */}
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">Cliente</p>
              <p
                className="text-2xl font-light text-stone-800 dark:text-stone-100"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {card.customerName || "Sin nombre"}
              </p>
            </div>

            {/* Sellos */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-stone-400 dark:text-stone-600">
                <span>Sellos</span>
                <span>{card.stamps} / {card.maxStamps}</span>
              </div>
              <div className="h-[2px] bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
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
                  ✓ Tarjeta completada — cortesia lista
                </p>
              )}
            </div>

            {/* Selector de bebida — solo al agregar sello */}
            {!isComplete && (
              <div className="space-y-3 pt-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">
                  ¿Que pidio?{" "}
                  <span className="text-stone-200 dark:text-stone-800">· opcional</span>
                </p>

                {/* Chips de bebidas */}
                <div className="flex flex-wrap gap-2">
                  {menuDrinks.length === 0 && (
                    <p className="text-[10px] text-stone-200 dark:text-stone-800 uppercase tracking-widest">
                      Sin bebidas en el menu
                    </p>
                  )}
                  {menuDrinks.map((drink) => (
                    <button
                      key={drink}
                      onClick={() => setSelectedDrink((prev) => prev === drink ? "" : drink)}
                      className={`px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-widest transition-all duration-150 ${
                        selectedDrink === drink
                          ? "border-stone-500 dark:border-stone-400 text-stone-800 dark:text-stone-100 bg-stone-200 dark:bg-stone-800"
                          : "border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 hover:border-stone-300 dark:hover:border-stone-700 hover:text-stone-600 dark:hover:text-stone-400"
                      }`}
                    >
                      {drink}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedDrink((prev) => prev === "otro" ? "" : "otro")}
                    className={`px-3 py-1.5 rounded-full border text-[10px] uppercase tracking-widest transition-all duration-150 ${
                      selectedDrink === "otro"
                        ? "border-stone-500 dark:border-stone-400 text-stone-800 dark:text-stone-100 bg-stone-200 dark:bg-stone-800"
                        : "border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 hover:border-stone-300 dark:hover:border-stone-700 hover:text-stone-600 dark:hover:text-stone-400"
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
                    className="w-full bg-stone-50 dark:bg-neutral-950 border border-stone-200 dark:border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-stone-700 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors"
                  />
                )}

                {/* Tamano — solo si hay bebida seleccionada */}
                {selectedDrink && selectedDrink !== "otro" && (
                  <div className="flex gap-2">
                    {(["10oz", "12oz"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStampSize((prev) => prev === s ? "" : s)}
                        className={`px-4 py-1.5 rounded-full border text-[10px] uppercase tracking-widest transition-all duration-150 ${
                          stampSize === s
                            ? "border-stone-500 dark:border-stone-400 text-stone-800 dark:text-stone-100 bg-stone-200 dark:bg-stone-800"
                            : "border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-600 hover:border-stone-300 dark:hover:border-stone-700 hover:text-stone-600 dark:hover:text-stone-400"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Banner umbral: a 1 sello de la cortesia */}
            {!isComplete && card.stamps === card.maxStamps - 1 && (
              <div className="px-4 py-3 rounded-xl border border-amber-300/40 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10 flex items-center gap-2">
                <span className="text-base leading-none">⚡</span>
                <span className="text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                  ¡Este cliente esta a 1 sello de su bebida gratis!
                </span>
              </div>
            )}

            {/* Boton — sello o canje segun estado */}
            {isComplete ? (
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 text-[11px] uppercase tracking-[0.35em] hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:border-amber-400 dark:hover:border-amber-400 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Canjeando…" : "Canjear cortesia · Nueva tarjeta"}
              </button>
            ) : (
              <button
                onClick={handleAddStamp}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-stone-800 text-white dark:bg-stone-200 dark:text-neutral-900 text-[11px] uppercase tracking-[0.35em] hover:bg-stone-900 dark:hover:bg-white transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
              >
                {loading ? "Guardando…" : "Anadir sello"}
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
            className="rounded-2xl border border-amber-300/40 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10 p-8 text-center space-y-3"
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
              className="text-xl font-light text-amber-700 dark:text-amber-300"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cortesia entregada
            </p>
            <p className="text-[10px] uppercase tracking-widest text-amber-500 dark:text-amber-700">
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
            className="rounded-2xl border border-emerald-300/40 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-900/20 p-8 text-center space-y-3"
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
              className="text-xl font-light text-emerald-700 dark:text-emerald-300"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sello anadido
            </p>
            <p className="text-[10px] uppercase tracking-widest text-emerald-500 dark:text-emerald-600">
              {card?.customerName || "Cliente"} · {card?.stamps} / {card?.maxStamps} visitas
            </p>
            {undoSecondsLeft !== null && lastEventId && (
              <button
                onClick={handleUndo}
                disabled={loading}
                className="mt-1 text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600 hover:text-stone-600 dark:hover:text-stone-400 transition-colors disabled:opacity-40"
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
            className="rounded-2xl border border-amber-300/40 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10 p-8 text-center space-y-3"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="text-4xl"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto">
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
              className="text-xl font-light text-amber-700 dark:text-amber-300"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Guardado sin conexion
            </p>
            <p className="text-[10px] uppercase tracking-widest text-amber-500 dark:text-amber-700">
              {card?.customerName || "Cliente"} · Se sincronizara al recuperar conexion
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cerrar sesion */}
      <button
        onClick={onLogout}
        className="text-[10px] uppercase tracking-[0.3em] text-stone-300 dark:text-stone-700 hover:text-stone-600 dark:hover:text-stone-400 transition-colors duration-200 mx-auto"
      >
        Cerrar sesion
      </button>

      {/* Historial de sellos de sesion */}
      {stampHistory.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-stone-300 dark:text-stone-700 text-center">
            Sellos de esta sesion
          </p>
          <div className="space-y-1.5">
            {stampHistory.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-stone-100 dark:border-stone-900 bg-stone-50 dark:bg-neutral-950 text-stone-400 dark:text-stone-500"
              >
                <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate max-w-[140px]">
                  {entry.customerName}
                </span>
                <span className="text-[10px] tracking-widest">
                  {entry.stamps}/{entry.maxStamps}
                </span>
                <span className="text-[10px] text-stone-300 dark:text-stone-700">
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

/* -- Config del reward ---------------------------------------- */
function RewardConfig() {
  const [reward, setReward] = useState<(Reward & { id: string }) | null>(null);
  const [loadingReward, setLoadingReward] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stamps, setStamps] = useState(5);
  const [rewardName, setRewardName] = useState("");
  const [rewardDesc, setRewardDesc] = useState("");

  useEffect(() => {
    getDefaultReward().then((r) => {
      if (r) {
        setReward(r);
        setStamps(r.requiredStamps);
        setRewardName(r.name);
        setRewardDesc(r.description);
      }
      setLoadingReward(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await upsertDefaultReward({
        name: rewardName || "Bebida gratis",
        description: rewardDesc || "Completa tu tarjeta y recibe una bebida gratis",
        requiredStamps: stamps,
        type: "drink",
        active: true,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently fail
    }
    setSaving(false);
  };

  if (loadingReward) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 border-2 border-stone-300 dark:border-stone-700 border-t-stone-700 dark:border-t-stone-300 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-8">
      {/* Reward principal */}
      <div className="space-y-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">
          Recompensa principal
        </p>

        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">
            Nombre
          </label>
          <input
            type="text"
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
            placeholder="Bebida gratis"
            className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-stone-200 dark:border-stone-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">
            Descripcion
          </label>
          <input
            type="text"
            value={rewardDesc}
            onChange={(e) => setRewardDesc(e.target.value)}
            placeholder="Completa tu tarjeta y recibe una bebida gratis"
            className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-stone-200 dark:border-stone-800 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:border-stone-400 dark:focus:border-stone-600 transition-colors"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600">
            Sellos para completar tarjeta
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStamps(Math.max(1, stamps - 1))}
              className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-neutral-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-neutral-800 transition-colors text-lg"
            >
              -
            </button>
            <span className="text-3xl font-light tracking-wide text-stone-700 dark:text-stone-200 min-w-[3ch] text-center tabular-nums">
              {stamps}
            </span>
            <button
              onClick={() => setStamps(Math.min(20, stamps + 1))}
              className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-neutral-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-neutral-800 transition-colors text-lg"
            >
              +
            </button>
          </div>
          <p className="text-[11px] text-stone-400 dark:text-stone-600">
            Las tarjetas nuevas usaran este numero. Las existentes no se afectan.
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl bg-stone-100 dark:bg-neutral-900 border border-stone-200 dark:border-stone-800">
        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 dark:text-stone-600 mb-3">
          Vista previa de la tarjeta
        </p>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: stamps }).map((_, i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded-full border-2 transition-colors ${
                i < Math.floor(stamps / 2)
                  ? "bg-stone-700 border-stone-700 dark:bg-stone-300 dark:border-stone-300"
                  : "bg-transparent border-stone-300 dark:border-stone-700"
              }`}
            />
          ))}
        </div>
        <p className="text-[11px] text-stone-500 dark:text-stone-500 mt-2">
          {Math.floor(stamps / 2)} de {stamps} sellos
        </p>
      </div>

      {/* Guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-full text-sm tracking-wide transition-all duration-300 ${
          saved
            ? "bg-emerald-600 text-white"
            : "bg-stone-800 text-white dark:bg-stone-200 dark:text-neutral-900 hover:bg-stone-900 dark:hover:bg-stone-100"
        } disabled:opacity-50`}
      >
        {saving ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
      </button>
    </div>
  );
}

/* -- Pagina principal ---------------------------------------- */
export default function AdminPage() {
  const pinLength = 4;

  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTabId>("stamps");
  const [lockout, setLockout] = useState(0);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const pinLoadingRef = useRef(false);

  // Tabs disponibles segun el rol
  const allowedTabs = userRole ? getTabsForRole(userRole) : [];

  // Countdown del lockout
  useEffect(() => {
    if (lockout <= 0) return;
    const id = setInterval(() => {
      setLockout((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [lockout]);

  // Auto-auth si la cookie de sesion sigue siendo valida
  useEffect(() => {
    checkBaristaSession().then((session) => {
      if (session.valid) {
        setAuthed(true);
        setUserName(session.nombre);
        setUserRole(session.rol);
        // Set initial tab to first allowed
        const tabs = getTabsForRole(session.rol);
        if (tabs.length > 0) setAdminTab(tabs[0]);
      }
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
        setUserName(result.nombre);
        setUserRole(result.rol);
        setPinError("");
        // Set initial tab to first allowed
        const tabs = getTabsForRole(result.rol);
        if (tabs.length > 0) setAdminTab(tabs[0]);
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

  // Auto-submit al completar todos los digitos
  useEffect(() => {
    if (pin.length === pinLength && !authed && lockout <= 0) {
      handlePinSubmit(pin);
    }
  }, [pin, pinLength, authed, lockout, handlePinSubmit]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-neutral-950 dark:text-white flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors duration-300 group"
        >
          <span aria-hidden="true" className="w-4 h-px bg-stone-400 dark:bg-stone-500 group-hover:w-7 group-hover:bg-stone-900 dark:group-hover:bg-white transition-all duration-500" />
          Inicio
        </Link>
        <span className="text-[10px] uppercase tracking-[0.45em] text-stone-400 dark:text-stone-500">
          La Commune
        </span>
        <ThemeToggle />
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
                <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">
                  Ingresa tu PIN
                </p>
                <h1
                  className="text-4xl font-light tracking-wide text-stone-700 dark:text-stone-200"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Panel Admin
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
              className={`flex flex-col items-center gap-6 w-full ${adminTab === "menu" || adminTab === "promos" || adminTab === "config" ? "justify-start" : ""}`}
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <p className="text-[10px] uppercase tracking-[0.4em] text-stone-400 dark:text-stone-600">
                  {userName ? `Hola, ${userName}` : "Panel"} {userRole ? `· ${getRoleLabel(userRole)}` : ""}
                </p>
                <h1
                  className="text-4xl font-light tracking-wide text-stone-700 dark:text-stone-200"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {TAB_TITLES[adminTab] ?? "Panel"}
                </h1>
              </div>

              {/* Tabs — solo mostrar si hay mas de 1 tab */}
              {allowedTabs.length > 1 && (
                <div className="flex gap-1 p-1 bg-stone-100 dark:bg-neutral-900 border border-stone-200 dark:border-stone-800 rounded-xl flex-wrap justify-center">
                  {allowedTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAdminTab(tab)}
                      className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-[0.3em] transition-all duration-200 ${
                        adminTab === tab
                          ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-neutral-900"
                          : "text-stone-400 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-300"
                      }`}
                    >
                      {TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>
              )}

              {/* Contenido — solo renderiza tabs permitidas */}
              <AnimatePresence mode="wait">
                {adminTab === "stamps" && allowedTabs.includes("stamps") && (
                  <motion.div
                    key="stamps-view"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <StampView onLogout={() => { logoutBarista(); setAuthed(false); setPin(""); setUserName(null); setUserRole(null); }} />
                  </motion.div>
                )}
                {adminTab === "menu" && allowedTabs.includes("menu") && (
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
                {adminTab === "promos" && allowedTabs.includes("promos") && (
                  <motion.div
                    key="promos-view"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <PromosAdmin />
                  </motion.div>
                )}
                {adminTab === "customers" && allowedTabs.includes("customers") && (
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
                {adminTab === "analytics" && allowedTabs.includes("analytics") && (
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
                {adminTab === "config" && allowedTabs.includes("config") && (
                  <motion.div
                    key="config-view"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="w-full"
                  >
                    <RewardConfig />
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
