/**
 * Tests para card.service.ts — el servicio mas critico de la app.
 *
 * Cada test sigue el patron AAA (Arrange-Act-Assert):
 *   1. ARRANGE: preparar datos fake y configurar mocks
 *   2. ACT:     llamar la funcion real del servicio
 *   3. ASSERT:  verificar que hizo lo esperado
 *
 * Los tests no tocan Firebase real. Todo pasa por los mocks de firestore.mock.ts.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  firestoreMocks,
  createMockTransaction,
  setupRunTransaction,
  mockDocSnap,
  mockDocRef,
  mockQuerySnap,
  mockTimestamp,
} from "./firestore.mock";

import {
  createCard,
  addStamp,
  undoStamp,
  redeemCard,
  getStampEventsByCard,
  getCardByCustomer,
} from "@/services/card.service";

// Firestore fake: un objeto vacio que los servicios reciben como primer argumento.
// Los servicios lo pasan a doc(), collection(), etc., pero como esos estan mockeados,
// no importa que sea un objeto vacio — nunca se usa realmente.
const firestore = {} as any;

describe("card.service", () => {
  /**
   * beforeEach se ejecuta ANTES de cada test individual.
   * Limpiamos los contadores de los mocks para que cada test empiece limpio.
   * Sin esto, si el test A llamo addDoc 2 veces, el test B veria 2 llamadas previas.
   */
  beforeEach(() => {
    Object.values(firestoreMocks).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) fn.mockClear();
    });
  });

  // ==========================================================================
  // createCard — Crea una tarjeta nueva para un cliente
  // ==========================================================================

  describe("createCard", () => {
    it("creates a card with correct initial data", async () => {
      // ARRANGE: crear refs fake de cliente y reward
      const customerRef = mockDocRef("customers/c1");
      const rewardRef = mockDocRef("rewards/default");

      // ACT: llamar la funcion real
      const result = await createCard(firestore, { customerRef, rewardRef });

      // ASSERT: verificar que addDoc fue llamado 1 vez
      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);

      // Acceder al 2do argumento de la 1ra llamada a addDoc (los datos de la tarjeta)
      // mock.calls es un array de llamadas, cada una es un array de argumentos:
      //   calls[0] = primera llamada
      //   calls[0][0] = primer argumento (la coleccion)
      //   calls[0][1] = segundo argumento (los datos)
      const data = firestoreMocks.addDoc.mock.calls[0][1];
      expect(data.stamps).toBe(0);          // empieza sin sellos
      expect(data.maxStamps).toBe(5);       // 5 sellos para completar
      expect(data.status).toBe("active");   // estado inicial
      expect(data.schemaVersion).toBe(1);   // version del esquema
      expect(result.id).toBe("new-doc-id"); // ID que retorna nuestro mock de addDoc
    });
  });

  // ==========================================================================
  // addStamp — Agrega un sello a una tarjeta (usa transaccion)
  //
  // Esta es la funcion mas compleja: lee la tarjeta dentro de una transaccion,
  // incrementa sellos, crea un stamp-event, y opcionalmente actualiza stats del cliente.
  // ==========================================================================

  describe("addStamp", () => {
    it("increments stamps on an active card", async () => {
      // ARRANGE: crear transaccion fake y configurar runTransaction para usarla
      const tx = createMockTransaction();
      setupRunTransaction(tx);

      // Cuando addStamp haga tx.get(cardRef), devolver una tarjeta con 2 sellos
      tx.get.mockResolvedValue(
        mockDocSnap({ stamps: 2, maxStamps: 5, status: "active" }, "card1"),
      );

      // ACT
      const result = await addStamp(firestore, "card1");

      // ASSERT
      expect(result.stamps).toBe(3);          // 2 + 1 = 3
      expect(result.status).toBe("active");   // aun no se completa (necesita 5)
      expect(result.eventId).toBeTruthy();     // se creo un evento de sello
      expect(tx.update).toHaveBeenCalled();    // se actualizo la tarjeta
      expect(tx.set).toHaveBeenCalled();       // se creo el stamp-event
    });

    it("marks card as completed when reaching maxStamps", async () => {
      // ARRANGE: tarjeta con 4/5 sellos — el proximo sello la completa
      const tx = createMockTransaction();
      setupRunTransaction(tx);
      tx.get.mockResolvedValue(
        mockDocSnap({ stamps: 4, maxStamps: 5, status: "active" }, "card1"),
      );

      // ACT
      const result = await addStamp(firestore, "card1");

      // ASSERT
      expect(result.stamps).toBe(5);          // 4 + 1 = 5 (completa!)
      expect(result.status).toBe("completed");

      // Verificar que tx.update recibio los campos correctos:
      // tx.update.mock.calls[0] = primera llamada a update
      // [0] = primer arg (el ref), [1] = segundo arg (los datos)
      const updateCall = tx.update.mock.calls[0][1];
      expect(updateCall.status).toBe("completed");
      expect(updateCall.completedAt).toBeDefined(); // debe tener timestamp de completado
    });

    it("does not add stamp if card is already full", async () => {
      // ARRANGE: tarjeta ya completa (5/5)
      const tx = createMockTransaction();
      setupRunTransaction(tx);
      tx.get.mockResolvedValue(
        mockDocSnap({ stamps: 5, maxStamps: 5, status: "completed" }, "card1"),
      );

      // ACT
      const result = await addStamp(firestore, "card1");

      // ASSERT: no debe hacer nada, solo retornar el estado actual
      expect(result.stamps).toBe(5);
      expect(result.eventId).toBe("");             // sin evento porque no se agrego sello
      expect(tx.update).not.toHaveBeenCalled();    // NO actualizo la tarjeta
      expect(tx.set).not.toHaveBeenCalled();       // NO creo stamp-event
    });

    it("throws if card does not exist", async () => {
      // ARRANGE: simular que el documento no existe (data = null)
      const tx = createMockTransaction();
      setupRunTransaction(tx);
      tx.get.mockResolvedValue(mockDocSnap(null, "nope"));

      // ASSERT: debe lanzar error "Card not found"
      // rejects.toThrow verifica que la promesa fue rechazada con ese mensaje
      await expect(addStamp(firestore, "nope")).rejects.toThrow(
        "Card not found",
      );
    });

    it("updates customer stats when customerId is provided", async () => {
      // ARRANGE: tarjeta con 0 sellos + customer ref
      const tx = createMockTransaction();
      setupRunTransaction(tx);
      tx.get.mockResolvedValue(
        mockDocSnap({ stamps: 0, maxStamps: 5, status: "active" }, "card1"),
      );

      // addStamp llama awardReferralBonusIfNeeded despues del primer sello,
      // que internamente usa getDoc. Le damos un snap vacio para que no haga nada.
      firestoreMocks.getDoc.mockResolvedValue(mockDocSnap(null));

      const customerRef = mockDocRef("customers/c1");

      // ACT
      const result = await addStamp(firestore, "card1", {
        customerId: customerRef,
      });

      // ASSERT
      expect(result.stamps).toBe(1);

      // tx.update se llamo 2 veces: una para la tarjeta y otra para el customer.
      // Buscamos la llamada que recibio nuestro customerRef como primer argumento.
      const customerUpdate = tx.update.mock.calls.find(
        (call: any[]) => call[0] === customerRef,
      );
      expect(customerUpdate).toBeDefined();

      // Verificar que uso increment(1) para totalStamps y totalVisits.
      // Nuestro mock de increment retorna { type: "increment", value: n }
      expect(customerUpdate![1].totalStamps).toEqual({
        type: "increment",
        value: 1,
      });
      expect(customerUpdate![1].totalVisits).toEqual({
        type: "increment",
        value: 1,
      });
    });

    it("includes drinkType and size in stamp event when provided", async () => {
      // ARRANGE
      const tx = createMockTransaction();
      setupRunTransaction(tx);
      tx.get.mockResolvedValue(
        mockDocSnap({ stamps: 1, maxStamps: 5, status: "active" }, "card1"),
      );

      // ACT: pasar drinkType y size como opciones
      await addStamp(firestore, "card1", { drinkType: "Latte", size: "12oz" });

      // ASSERT: el stamp-event (creado con tx.set) debe incluir esos campos.
      // tx.set.mock.calls[0][1] = datos del evento
      const setCall = tx.set.mock.calls[0][1];
      expect(setCall.drinkType).toBe("Latte");
      expect(setCall.size).toBe("12oz");
    });
  });

  // ==========================================================================
  // undoStamp — Revierte el ultimo sello (usa transaccion)
  // ==========================================================================

  describe("undoStamp", () => {
    it("decrements stamps and deletes the event", async () => {
      // ARRANGE: tarjeta con 3 sellos
      const tx = createMockTransaction();
      setupRunTransaction(tx);
      tx.get.mockResolvedValue(
        mockDocSnap({ stamps: 3, maxStamps: 5, status: "active" }, "card1"),
      );

      // ACT
      await undoStamp(firestore, "card1", "evt1");

      // ASSERT
      const updateCall = tx.update.mock.calls[0][1];
      expect(updateCall.stamps).toBe(2);        // 3 - 1 = 2
      expect(tx.delete).toHaveBeenCalled();      // borro el stamp-event
    });

    it("reverts completed status when undoing last stamp", async () => {
      // ARRANGE: tarjeta completada (5/5) — al quitar un sello debe volver a "active"
      const tx = createMockTransaction();
      setupRunTransaction(tx);
      tx.get.mockResolvedValue(
        mockDocSnap({ stamps: 5, maxStamps: 5, status: "completed" }, "card1"),
      );

      // ACT
      await undoStamp(firestore, "card1", "evt1");

      // ASSERT
      const updateCall = tx.update.mock.calls[0][1];
      expect(updateCall.stamps).toBe(4);         // 5 - 1 = 4
      expect(updateCall.status).toBe("active");  // revertido de "completed" a "active"
    });

    it("does not go below 0 stamps", async () => {
      // ARRANGE: tarjeta con 0 sellos — Math.max(0, 0-1) = 0
      const tx = createMockTransaction();
      setupRunTransaction(tx);
      tx.get.mockResolvedValue(
        mockDocSnap({ stamps: 0, maxStamps: 5, status: "active" }, "card1"),
      );

      // ACT
      await undoStamp(firestore, "card1", "evt1");

      // ASSERT: no puede bajar de 0
      const updateCall = tx.update.mock.calls[0][1];
      expect(updateCall.stamps).toBe(0);
    });

    it("throws if card does not exist", async () => {
      const tx = createMockTransaction();
      setupRunTransaction(tx);
      tx.get.mockResolvedValue(mockDocSnap(null));

      await expect(undoStamp(firestore, "nope", "evt1")).rejects.toThrow(
        "Card not found",
      );
    });
  });

  // ==========================================================================
  // redeemCard — Canjea una tarjeta completada y crea una nueva
  //
  // Flujo: marcar vieja como "redeemed" -> log de evento -> crear tarjeta nueva
  // ==========================================================================

  describe("redeemCard", () => {
    it("marks old card as redeemed and creates a new one", async () => {
      // ARRANGE
      const customerRef = mockDocRef("customers/c1");
      const rewardRef = mockDocRef("rewards/default");

      // ACT
      const newCard = await redeemCard(firestore, {
        oldCardId: "old1",
        customerRef,
        rewardRef,
      });

      // ASSERT: updateDoc se llamo 1 vez para marcar la vieja como "redeemed"
      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
      const updateArgs = firestoreMocks.updateDoc.mock.calls[0][1];
      expect(updateArgs.status).toBe("redeemed");

      // addDoc se llamo 2 veces:
      //   1ra: crear el evento de redencion (stamp-event con source "redemption")
      //   2da: crear la nueva tarjeta limpia (via createCard internamente)
      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(2);

      // La nueva tarjeta tiene el ID que retorna nuestro mock de addDoc
      expect(newCard.id).toBe("new-doc-id");
    });
  });

  // ==========================================================================
  // getStampEventsByCard — Obtiene historial de sellos de una tarjeta
  // ==========================================================================

  describe("getStampEventsByCard", () => {
    it("returns events sorted by createdAt descending", async () => {
      // ARRANGE: 3 eventos con timestamps desordenados
      firestoreMocks.getDocs.mockResolvedValue(
        mockQuerySnap([
          {
            id: "e1",
            data: { createdAt: mockTimestamp(1000), source: "manual" },  // mas viejo
          },
          {
            id: "e2",
            data: { createdAt: mockTimestamp(3000), source: "manual" },  // mas reciente
          },
          {
            id: "e3",
            data: { createdAt: mockTimestamp(2000), source: "manual" },  // intermedio
          },
        ]),
      );

      // ACT
      const events = await getStampEventsByCard(firestore, "card1");

      // ASSERT: deben estar ordenados del mas reciente al mas viejo
      // El servicio ordena en cliente (no en Firestore) usando sort()
      expect(events.map((e) => e.id)).toEqual(["e2", "e3", "e1"]);
    });

    it("returns empty array when no events exist", async () => {
      firestoreMocks.getDocs.mockResolvedValue(mockQuerySnap([]));

      const events = await getStampEventsByCard(firestore, "card1");
      expect(events).toEqual([]);
    });
  });

  // ==========================================================================
  // getCardByCustomer — Busca la tarjeta activa de un cliente
  // ==========================================================================

  describe("getCardByCustomer", () => {
    it("returns the active card for a customer", async () => {
      // ARRANGE: simular que la query devuelve 1 tarjeta activa
      const customerRef = mockDocRef("customers/c1");
      firestoreMocks.getDocs.mockResolvedValue(
        mockQuerySnap([{ id: "card1", data: { stamps: 2, status: "active" } }]),
      );

      // ACT
      const card = await getCardByCustomer(firestore, customerRef);

      // ASSERT
      expect(card).not.toBeNull();
      expect(card!.id).toBe("card1");
    });

    it("returns null if no active card", async () => {
      // ARRANGE: query sin resultados (cliente sin tarjeta activa)
      const customerRef = mockDocRef("customers/c1");
      firestoreMocks.getDocs.mockResolvedValue(mockQuerySnap([]));

      // ACT
      const card = await getCardByCustomer(firestore, customerRef);

      // ASSERT
      expect(card).toBeNull();
    });
  });
});
