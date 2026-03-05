/**
 * Tests para menu.service.ts
 *
 * Cubren la gestion del menu del cafe:
 * obtener menu completo, CRUD de items y secciones.
 *
 * Patron importante a entender aqui:
 *   - mockResolvedValue:     siempre retorna ese valor (para todas las llamadas)
 *   - mockResolvedValueOnce: retorna ese valor solo la PRIMERA vez, luego el siguiente
 *
 * Esto es clave en getFullMenu donde getDocs se llama multiples veces:
 * 1ra vez para secciones, 2da y 3ra para items de cada seccion.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { firestoreMocks, mockQuerySnap } from "./firestore.mock";

import {
  getFullMenu,
  updateMenuItem,
  addMenuItem,
  deleteMenuItem,
  addMenuSection,
  updateMenuSection,
  deleteMenuSection,
} from "@/services/menu.service";

const firestore = {} as any;

describe("menu.service", () => {
  beforeEach(() => {
    Object.values(firestoreMocks).forEach((fn) => {
      if (typeof fn === "function" && "mockClear" in fn) fn.mockClear();
    });
  });

  // ==========================================================================
  // getFullMenu — Obtiene todas las secciones con sus items anidados
  //
  // Esta funcion hace multiples llamadas a getDocs:
  //   1. Primero obtiene las secciones (menu-sections)
  //   2. Luego, por cada seccion, obtiene sus items (subcoleccion)
  //
  // Usamos mockResolvedValueOnce para controlar que retorna cada llamada.
  // ==========================================================================

  describe("getFullMenu", () => {
    it("returns sections with their items", async () => {
      // ARRANGE: encadenar 3 llamadas a getDocs con datos distintos
      firestoreMocks.getDocs
        // 1ra llamada: retorna las secciones del menu
        .mockResolvedValueOnce(
          mockQuerySnap([
            { id: "s1", data: { title: "Bebidas", order: 0, active: true } },
            { id: "s2", data: { title: "Comida", order: 1, active: true } },
          ])
        )
        // 2da llamada: items de la seccion "Bebidas"
        .mockResolvedValueOnce(
          mockQuerySnap([
            { id: "i1", data: { name: "Latte", order: 0, available: true } },
          ])
        )
        // 3ra llamada: items de la seccion "Comida"
        .mockResolvedValueOnce(
          mockQuerySnap([
            { id: "i2", data: { name: "Croissant", order: 0, available: true } },
          ])
        );

      // ACT
      const menu = await getFullMenu(firestore);

      // ASSERT: 2 secciones, cada una con 1 item
      expect(menu).toHaveLength(2);
      expect(menu[0].title).toBe("Bebidas");
      expect(menu[0].items).toHaveLength(1);
      expect(menu[0].items![0].name).toBe("Latte");
      expect(menu[1].items![0].name).toBe("Croissant");
    });

    it("returns empty array when no sections", async () => {
      firestoreMocks.getDocs.mockResolvedValue(mockQuerySnap([]));

      const menu = await getFullMenu(firestore);
      expect(menu).toEqual([]);
    });
  });

  // ==========================================================================
  // updateMenuItem — Actualiza campos de un item del menu
  //
  // Caso especial: clearFields usa deleteField() de Firestore para BORRAR
  // un campo del documento. Esto es necesario cuando cambias de precio unico
  // a tamanios (o viceversa) — no basta con poner null, hay que eliminarlo.
  // ==========================================================================

  describe("updateMenuItem", () => {
    it("updates item fields", async () => {
      // ACT: marcar un item como no disponible
      await updateMenuItem(firestore, "s1", "i1", { available: false });

      // ASSERT
      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
      const updateData = firestoreMocks.updateDoc.mock.calls[0][1];
      expect(updateData.available).toBe(false);
    });

    it("uses deleteField for clearFields", async () => {
      // ACT: agregar tamanios Y borrar precio unico (son mutuamente exclusivos)
      // clearFields: ["price"] le dice al servicio que use deleteField() en "price"
      await updateMenuItem(
        firestore,
        "s1",
        "i1",
        { sizes: [{ label: "12oz", price: 65 }] },
        ["price"]  // <-- campos a BORRAR del documento
      );

      // ASSERT
      const updateData = firestoreMocks.updateDoc.mock.calls[0][1];
      expect(updateData.sizes).toEqual([{ label: "12oz", price: 65 }]);  // nuevo campo
      expect(updateData.price).toBe("__DELETE__");  // nuestro mock de deleteField retorna "__DELETE__"
    });
  });

  // ==========================================================================
  // addMenuItem — Agrega un nuevo item a una seccion
  // ==========================================================================

  describe("addMenuItem", () => {
    it("adds an item and returns its id", async () => {
      // ACT: agregar un Mocha a la seccion s1
      const id = await addMenuItem(firestore, "s1", {
        name: "Mocha",
        price: 55,
        ingredients: ["Espresso", "Chocolate", "Leche"],
        available: true,
        tags: ["Dulce"],
        highlight: false,
        seasonal: false,
        order: 2,
        schemaVersion: 1,
      });

      // ASSERT
      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
      expect(id).toBe("new-doc-id");  // ID retornado por nuestro mock
    });
  });

  // ==========================================================================
  // deleteMenuItem — Elimina un item del menu
  // ==========================================================================

  describe("deleteMenuItem", () => {
    it("deletes the item document", async () => {
      await deleteMenuItem(firestore, "s1", "i1");

      // Verificar que deleteDoc fue llamado (borra el documento de Firestore)
      expect(firestoreMocks.deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // addMenuSection — Agrega una nueva seccion al menu
  // ==========================================================================

  describe("addMenuSection", () => {
    it("adds a section and returns its id", async () => {
      const id = await addMenuSection(firestore, {
        title: "Postres",
        description: "Dulces artesanales",
        type: "food",
        order: 3,
        active: true,
        schemaVersion: 1,
      });

      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
      expect(id).toBe("new-doc-id");
    });
  });

  // ==========================================================================
  // updateMenuSection — Actualiza una seccion (sin tocar sus items)
  //
  // Punto clave: si le pasas `items` en los datos, los IGNORA.
  // Los items son una subcoleccion separada, no un campo de la seccion.
  // El servicio hace destructuring { items: _items, ...rest } para quitarlos.
  // ==========================================================================

  describe("updateMenuSection", () => {
    it("updates section without including items", async () => {
      // ACT: pasar items intencionalmente para verificar que los filtra
      await updateMenuSection(firestore, "s1", {
        title: "Bebidas Calientes",
        items: [{ name: "Latte" } as any],  // esto debe ser ignorado
      });

      // ASSERT
      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
      const data = firestoreMocks.updateDoc.mock.calls[0][1];
      expect(data.title).toBe("Bebidas Calientes");  // titulo si se actualiza
      expect(data).not.toHaveProperty("items");        // items NO se incluyen
    });
  });

  // ==========================================================================
  // deleteMenuSection — Borra una seccion Y todos sus items
  //
  // En Firestore, borrar un documento NO borra sus subcolecciones automaticamente.
  // Por eso el servicio primero obtiene todos los items (getDocs), los borra uno
  // por uno (deleteDoc), y finalmente borra la seccion.
  // ==========================================================================

  describe("deleteMenuSection", () => {
    it("deletes all items then the section", async () => {
      // ARRANGE: seccion con 2 items
      firestoreMocks.getDocs.mockResolvedValue(
        mockQuerySnap([
          { id: "i1", data: { name: "Latte" } },
          { id: "i2", data: { name: "Mocha" } },
        ])
      );

      // ACT
      await deleteMenuSection(firestore, "s1");

      // ASSERT: 3 llamadas a deleteDoc = 2 items + 1 seccion
      expect(firestoreMocks.deleteDoc).toHaveBeenCalledTimes(3);
    });

    it("deletes section even when it has no items", async () => {
      // ARRANGE: seccion vacia
      firestoreMocks.getDocs.mockResolvedValue(mockQuerySnap([]));

      // ACT
      await deleteMenuSection(firestore, "s1");

      // ASSERT: solo 1 llamada a deleteDoc (la seccion)
      expect(firestoreMocks.deleteDoc).toHaveBeenCalledTimes(1);
    });
  });
});
