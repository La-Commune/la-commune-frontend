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
