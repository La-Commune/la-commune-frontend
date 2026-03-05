const STORAGE_KEY = "offline-stamp-queue";

export interface QueuedStamp {
  id: string;
  cardId: string;
  customerId?: string; // DocumentReference path, e.g. "customers/ABC123"
  customerName?: string;
  drinkType?: string;
  size?: string;
  queuedAt: number; // Date.now()
  status: "pending" | "failed";
  errorMessage?: string;
}

export function getQueue(): QueuedStamp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedStamp[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueue(item: Omit<QueuedStamp, "id" | "queuedAt" | "status">): QueuedStamp {
  const entry: QueuedStamp = {
    ...item,
    id: crypto.randomUUID(),
    queuedAt: Date.now(),
    status: "pending",
  };
  const queue = getQueue();
  queue.push(entry);
  saveQueue(queue);
  return entry;
}

export function removeFromQueue(id: string): void {
  saveQueue(getQueue().filter((q) => q.id !== id));
}

export function markFailed(id: string, errorMessage: string): void {
  const queue = getQueue().map((q) =>
    q.id === id ? { ...q, status: "failed" as const, errorMessage } : q,
  );
  saveQueue(queue);
}

export function resetFailed(): void {
  const queue = getQueue().map((q) =>
    q.status === "failed" ? { ...q, status: "pending" as const, errorMessage: undefined } : q,
  );
  saveQueue(queue);
}

export function hasPending(): boolean {
  return getQueue().some((q) => q.status === "pending");
}

/**
 * Registra Background Sync para que el SW procese la cola
 * cuando vuelva la conexion, incluso si la app esta cerrada.
 */
export async function requestBackgroundSync(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await (registration as any).sync.register("flush-stamps");
  } catch {
    // SyncManager no soportado o permiso denegado — el auto-sync online sera el fallback
  }
}

/**
 * Registra Periodic Background Sync para reintentos periodicos.
 * Solo funciona si la app esta instalada como PWA.
 */
export async function requestPeriodicSync(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("periodicSync" in ServiceWorkerRegistration.prototype)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const status = await navigator.permissions.query({ name: "periodic-background-sync" as any });
    if (status.state === "granted") {
      await (registration as any).periodicSync.register("retry-stamps", {
        minInterval: 5 * 60 * 1000, // 5 minutos
      });
    }
  } catch {
    // Periodic Sync no soportado
  }
}
