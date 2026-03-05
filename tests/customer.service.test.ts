/**
 * Tests para customer.service.ts
 *
 * Cubren las operaciones CRUD de clientes:
 * crear, buscar por telefono, listar todos, actualizar notas, soft-delete,
 * y buscar tarjeta activa del cliente.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { firestoreMocks, mockDocRef, mockQuerySnap, mockTimestamp } from "./firestore.mock";

import {
  createCustomer,
  getCustomerByPhone,
  getAllCustomers,
  updateCustomerNotes,
  deleteCustomer,
  getCardByCustomer,
} from "@/services/customer.service";

const firestore = {} as any;

describe("customer.service", () => {
  // Limpiar contadores de mocks antes de cada test
  beforeEach(() => {
    Object.values(firestoreMocks).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) fn.mockClear();
    });
  });

  // ==========================================================================
  // createCustomer — Registra un nuevo cliente en Firestore
  // ==========================================================================

  describe("createCustomer", () => {
    it("creates a customer with required fields", async () => {
      // ACT: crear con los campos minimos (phone + consent)
      const result = await createCustomer(firestore, {
        phone: "5551234567",
        consentWhatsApp: true,
      });

      // ASSERT: verificar que addDoc recibio los datos correctos
      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
      const data = firestoreMocks.addDoc.mock.calls[0][1];
      expect(data.phone).toBe("5551234567");
      expect(data.consentWhatsApp).toBe(true);
      expect(data.active).toBe(true);         // siempre empieza activo
      expect(data.totalVisits).toBe(0);        // sin visitas iniciales
      expect(data.totalStamps).toBe(0);        // sin sellos iniciales
      expect(data.schemaVersion).toBe(1);      // version del esquema
      expect(result.id).toBe("new-doc-id");
    });

    it("includes name when provided", async () => {
      // ACT: pasar nombre opcional
      await createCustomer(firestore, {
        name: "Ana",
        phone: "5551234567",
        consentWhatsApp: false,
      });

      // ASSERT: el nombre debe estar en los datos
      const data = firestoreMocks.addDoc.mock.calls[0][1];
      expect(data.name).toBe("Ana");
    });

    it("includes referrerCustomerId when provided", async () => {
      // Caso: cliente referido por otro cliente
      await createCustomer(firestore, {
        phone: "5551234567",
        consentWhatsApp: true,
        referrerCustomerId: "ref123",
      });

      const data = firestoreMocks.addDoc.mock.calls[0][1];
      expect(data.referrerCustomerId).toBe("ref123");
    });

    it("does not include referrerCustomerId when not provided", async () => {
      // Caso: cliente sin referido — el campo NO debe existir en los datos
      // (en Firestore es mejor no guardar campos vacios/undefined)
      await createCustomer(firestore, {
        phone: "5551234567",
        consentWhatsApp: true,
      });

      const data = firestoreMocks.addDoc.mock.calls[0][1];
      expect(data).not.toHaveProperty("referrerCustomerId");
    });
  });

  // ==========================================================================
  // getCustomerByPhone — Busca un cliente activo por numero de telefono
  // ==========================================================================

  describe("getCustomerByPhone", () => {
    it("returns customer data when found", async () => {
      // ARRANGE: simular que getDocs devuelve 1 cliente
      firestoreMocks.getDocs.mockResolvedValue(
        mockQuerySnap([
          { id: "c1", data: { phone: "5551234567", name: "Ana", active: true } },
        ])
      );

      // ACT
      const customer = await getCustomerByPhone(firestore, "5551234567");

      // ASSERT: debe retornar el cliente con id, ref y datos
      expect(customer).not.toBeNull();
      expect(customer!.id).toBe("c1");
      expect(customer!.phone).toBe("5551234567");
      expect(customer!.ref).toBeDefined();  // incluye un DocumentReference para uso posterior
    });

    it("returns null when no customer found", async () => {
      // ARRANGE: query sin resultados
      firestoreMocks.getDocs.mockResolvedValue(mockQuerySnap([]));

      // ACT & ASSERT
      const customer = await getCustomerByPhone(firestore, "0000000000");
      expect(customer).toBeNull();
    });
  });

  // ==========================================================================
  // getAllCustomers — Lista todos los clientes activos, ordenados por fecha
  // ==========================================================================

  describe("getAllCustomers", () => {
    it("returns customers sorted by createdAt descending", async () => {
      // ARRANGE: 3 clientes con timestamps desordenados
      firestoreMocks.getDocs.mockResolvedValue(
        mockQuerySnap([
          { id: "c1", data: { active: true, createdAt: mockTimestamp(1000) } },  // mas viejo
          { id: "c2", data: { active: true, createdAt: mockTimestamp(3000) } },  // mas reciente
          { id: "c3", data: { active: true, createdAt: mockTimestamp(2000) } },  // intermedio
        ])
      );

      // ACT
      const customers = await getAllCustomers(firestore);

      // ASSERT: el servicio ordena en cliente (no en Firestore query),
      // asi que verificamos que el orden es del mas reciente al mas viejo
      expect(customers.map((c) => c.id)).toEqual(["c2", "c3", "c1"]);
    });

    it("returns empty array when no customers", async () => {
      firestoreMocks.getDocs.mockResolvedValue(mockQuerySnap([]));

      const customers = await getAllCustomers(firestore);
      expect(customers).toEqual([]);
    });
  });

  // ==========================================================================
  // updateCustomerNotes — Actualiza las notas de un cliente
  // ==========================================================================

  describe("updateCustomerNotes", () => {
    it("calls updateDoc with the notes", async () => {
      // ACT
      await updateCustomerNotes(firestore, "c1", "Le gusta el latte");

      // ASSERT: updateDoc fue llamado con { notes: "Le gusta el latte" }
      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
      expect(firestoreMocks.updateDoc.mock.calls[0][1]).toEqual({
        notes: "Le gusta el latte",
      });
    });
  });

  // ==========================================================================
  // deleteCustomer — Soft delete (NO borra el documento, solo pone active=false)
  //
  // Esto es importante: en la app nunca se borran datos realmente,
  // solo se marcan como inactivos para mantener historial.
  // ==========================================================================

  describe("deleteCustomer", () => {
    it("soft-deletes by setting active to false", async () => {
      // ACT
      await deleteCustomer(firestore, "c1");

      // ASSERT: solo cambia active a false, no llama deleteDoc
      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
      expect(firestoreMocks.updateDoc.mock.calls[0][1]).toEqual({ active: false });
    });
  });

  // ==========================================================================
  // getCardByCustomer — Busca la tarjeta activa de un cliente
  //
  // Nota: esta funcion tambien existe en card.service.ts (duplicada).
  // Aqui testeamos la version del customer.service.
  // ==========================================================================

  describe("getCardByCustomer", () => {
    it("returns active card for customer", async () => {
      const customerRef = mockDocRef("customers/c1");
      firestoreMocks.getDocs.mockResolvedValue(
        mockQuerySnap([{ id: "card1", data: { stamps: 3, status: "active" } }])
      );

      const card = await getCardByCustomer(firestore, customerRef);

      expect(card).not.toBeNull();
      expect(card!.id).toBe("card1");
    });

    it("returns null when no active card", async () => {
      const customerRef = mockDocRef("customers/c1");
      firestoreMocks.getDocs.mockResolvedValue(mockQuerySnap([]));

      const card = await getCardByCustomer(firestore, customerRef);
      expect(card).toBeNull();
    });
  });
});
