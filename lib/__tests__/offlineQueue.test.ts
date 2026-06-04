// Tests de la cola offline dual (IndexedDB + localStorage)
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach } from "vitest";
import {
  getQueue,
  getQueueSync,
  enqueue,
  removeFromQueue,
  markFailed,
  resetFailed,
  hasPending,
} from "../offlineQueue";

const LS_KEY = "offline-stamp-queue";

beforeEach(() => {
  // IndexedDB limpia y localStorage limpio en cada test
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});

describe("enqueue", () => {
  it("agrega el sello con id, timestamp y status pending", async () => {
    const entry = await enqueue({ cardId: "card-1", customerName: "Carol", drinkType: "Latte" });

    expect(entry.id).toBeTruthy();
    expect(entry.status).toBe("pending");
    expect(entry.queuedAt).toBeGreaterThan(0);

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].cardId).toBe("card-1");
  });

  it("escribe también en localStorage como backup", async () => {
    await enqueue({ cardId: "card-1" });

    const ls = JSON.parse(localStorage.getItem(LS_KEY)!);
    expect(ls).toHaveLength(1);
    expect(getQueueSync()).toHaveLength(1);
  });
});

describe("removeFromQueue", () => {
  it("elimina el sello de IDB y de localStorage", async () => {
    const a = await enqueue({ cardId: "card-1" });
    await enqueue({ cardId: "card-2" });

    await removeFromQueue(a.id);

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].cardId).toBe("card-2");
    expect(getQueueSync()).toHaveLength(1);
  });
});

describe("markFailed / resetFailed", () => {
  it("marca un sello como failed con mensaje", async () => {
    const a = await enqueue({ cardId: "card-1" });
    await markFailed(a.id, "network down");

    const queue = await getQueue();
    expect(queue[0].status).toBe("failed");
    expect(queue[0].errorMessage).toBe("network down");
  });

  it("resetFailed regresa los failed a pending y limpia el error", async () => {
    const a = await enqueue({ cardId: "card-1" });
    await enqueue({ cardId: "card-2" });
    await markFailed(a.id, "boom");

    await resetFailed();

    const queue = await getQueue();
    expect(queue.every((q) => q.status === "pending")).toBe(true);
    expect(queue.find((q) => q.id === a.id)?.errorMessage).toBeUndefined();
  });
});

describe("hasPending", () => {
  it("true cuando hay pendientes, false cuando todos fallaron o está vacía", async () => {
    expect(await hasPending()).toBe(false);

    const a = await enqueue({ cardId: "card-1" });
    expect(await hasPending()).toBe(true);

    await markFailed(a.id, "x");
    expect(await hasPending()).toBe(false);
  });
});

describe("fallback a localStorage cuando IndexedDB no está disponible", () => {
  beforeEach(() => {
    // Simular navegador con IDB rota
    // @ts-expect-error — forzar indisponibilidad
    globalThis.indexedDB = undefined;
  });

  it("enqueue y getQueue siguen funcionando vía localStorage", async () => {
    await enqueue({ cardId: "card-ls" });

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].cardId).toBe("card-ls");
  });

  it("markFailed y hasPending funcionan vía localStorage", async () => {
    const a = await enqueue({ cardId: "card-ls" });
    await markFailed(a.id, "ios bug");

    expect(getQueueSync()[0].status).toBe("failed");
    expect(await hasPending()).toBe(false);
  });
});
