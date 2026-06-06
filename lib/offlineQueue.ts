/**
 * Cola offline para sellos — con doble almacenamiento:
 *   1. IndexedDB (primario, más robusto y persistente)
 *   2. localStorage (fallback, para navegadores con IndexedDB roto — ej. iOS Safari bugs)
 *
 * ¿Por qué no solo localStorage?
 *   - localStorage es síncrono y bloquea el main thread
 *   - iOS Safari puede borrar localStorage sin aviso después de 7 días de inactividad
 *   - IndexedDB tiene mejor soporte para datos estructurados y es más persistente
 *
 * ¿Por qué mantener localStorage como fallback?
 *   - IndexedDB en iOS Safari tiene bugs conocidos (transacciones que cuelgan, corrupción)
 *   - Mejor tener ambos y que al menos 1 funcione, a no tener nada
 */

const DB_NAME = "la-commune-offline";
const DB_VERSION = 1;
const STORE_NAME = "stamp-queue";
const LS_KEY = "offline-stamp-queue";

export interface QueuedStamp {
  id: string;
  cardId: string;
  customerId?: string;
  customerName?: string;
  drinkType?: string;
  size?: string;
  queuedAt: number;
  status: "pending" | "failed";
  errorMessage?: string;
}

// ─── IndexedDB helpers ───

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => reject(request.error);

    // Timeout para iOS Safari donde IDB puede colgarse
    setTimeout(() => reject(new Error("IndexedDB timeout")), 3000);
  });
}

async function idbGetAll(): Promise<QueuedStamp[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbPut(item: QueuedStamp): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function idbPutAll(items: QueuedStamp[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// ─── localStorage helpers (fallback) ───

function lsGet(): QueuedStamp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function lsSave(queue: QueuedStamp[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(queue));
  } catch {
    // localStorage lleno o no disponible
  }
}

// ─── API pública (usa IDB primero, LS como fallback) ───

export async function getQueue(): Promise<QueuedStamp[]> {
  try {
    const items = await idbGetAll();
    // Sincronizar LS como backup
    lsSave(items);
    return items;
  } catch {
    // IDB falló — usar localStorage
    return lsGet();
  }
}

/**
 * Versión síncrona para compatibilidad con código que no puede ser async.
 * Solo lee de localStorage (el backup).
 */
export function getQueueSync(): QueuedStamp[] {
  return lsGet();
}

export async function enqueue(
  item: Omit<QueuedStamp, "id" | "queuedAt" | "status">
): Promise<QueuedStamp> {
  const entry: QueuedStamp = {
    ...item,
    id: crypto.randomUUID(),
    queuedAt: Date.now(),
    status: "pending",
  };

  try {
    await idbPut(entry);
  } catch {
    // Fallback a LS
  }

  // Siempre guardar en LS también
  const lsQueue = lsGet();
  lsQueue.push(entry);
  lsSave(lsQueue);

  return entry;
}

export async function removeFromQueue(id: string): Promise<void> {
  try {
    await idbDelete(id);
  } catch {
    // Fallback
  }
  lsSave(lsGet().filter((q) => q.id !== id));
}

export async function markFailed(id: string, errorMessage: string): Promise<void> {
  const updater = (q: QueuedStamp) =>
    q.id === id ? { ...q, status: "failed" as const, errorMessage } : q;

  try {
    const items = await idbGetAll();
    const updated = items.map(updater);
    await idbPutAll(updated);
    lsSave(updated);
  } catch {
    const lsQueue = lsGet().map(updater);
    lsSave(lsQueue);
  }
}

export async function resetFailed(): Promise<void> {
  const updater = (q: QueuedStamp) =>
    q.status === "failed"
      ? { ...q, status: "pending" as const, errorMessage: undefined }
      : q;

  try {
    const items = await idbGetAll();
    const updated = items.map(updater);
    await idbPutAll(updated);
    lsSave(updated);
  } catch {
    const lsQueue = lsGet().map(updater);
    lsSave(lsQueue);
  }
}

export async function hasPending(): Promise<boolean> {
  try {
    const items = await idbGetAll();
    return items.some((q) => q.status === "pending");
  } catch {
    return lsGet().some((q) => q.status === "pending");
  }
}

/**
 * Registra Background Sync para que el SW procese la cola
 * cuando vuelva la conexión, incluso si la app está cerrada.
 */
// Experimental Background Sync APIs no presentes en los tipos estándar del DOM
interface SyncRegistration {
  register: (tag: string) => Promise<void>;
}
interface PeriodicSyncRegistration {
  register: (tag: string, options?: { minInterval: number }) => Promise<void>;
}

export async function requestBackgroundSync(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("SyncManager" in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sync = (registration as unknown as { sync?: SyncRegistration }).sync;
    await sync?.register("flush-stamps");
  } catch {
    // SyncManager no soportado o permiso denegado
  }
}

/**
 * Registra Periodic Background Sync para reintentos periódicos.
 * Solo funciona si la app está instalada como PWA.
 */
export async function requestPeriodicSync(): Promise<void> {
  if (
    !("serviceWorker" in navigator) ||
    !("periodicSync" in ServiceWorkerRegistration.prototype)
  )
    return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });
    if (status.state === "granted") {
      const periodicSync = (
        registration as unknown as { periodicSync?: PeriodicSyncRegistration }
      ).periodicSync;
      await periodicSync?.register("retry-stamps", {
        minInterval: 5 * 60 * 1000,
      });
    }
  } catch {
    // Periodic Sync no soportado
  }
}
