/**
 * Mock centralizado de firebase/firestore para tests.
 *
 * En vez de conectar a Firebase real, interceptamos TODAS las funciones de
 * "firebase/firestore" con versiones fake (vi.fn). Esto permite:
 *   1. Correr tests sin internet ni proyecto Firebase
 *   2. Controlar exactamente que datos "existen" en cada test
 *   3. Verificar que las funciones del servicio llaman a Firestore correctamente
 *
 * La linea clave esta al final del archivo:
 *   vi.mock("firebase/firestore", () => firestoreMocks)
 *
 * Eso le dice a Vitest: "cuando algun archivo haga
 * `import { addDoc, doc, ... } from 'firebase/firestore'`,
 * devuelvele mis funciones fake en vez de las reales".
 */
import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Helpers: construyen objetos fake que imitan la forma de los objetos de Firestore
// ---------------------------------------------------------------------------

/**
 * Simula un DocumentReference de Firestore.
 * En Firestore real, un DocumentReference tiene { id, path, ... }.
 * Aqui solo necesitamos `id` (ultimo segmento del path) y `path`.
 *
 * Ejemplo: mockDocRef("customers/c1") => { id: "c1", path: "customers/c1" }
 */
export function mockDocRef(path: string) {
  return { id: path.split("/").pop(), path } as any;
}

/**
 * Simula un DocumentSnapshot de Firestore.
 * Es lo que te devuelve getDoc() o tx.get():
 *   - exists() => true/false (si el documento existe)
 *   - data()   => los datos del documento (o null si no existe)
 *
 * Ejemplo: mockDocSnap({ stamps: 3, status: "active" }, "card1")
 * Simula un documento con id "card1" que tiene stamps=3.
 *
 * Ejemplo: mockDocSnap(null) => documento que NO existe (exists() retorna false)
 */
export function mockDocSnap(data: Record<string, any> | null, id = "doc1") {
  return {
    exists: () => data !== null,
    data: () => data,
    id,
    ref: mockDocRef(`col/${id}`),
  };
}

/**
 * Simula un QuerySnapshot de Firestore.
 * Es lo que te devuelve getDocs(): una lista de documentos.
 *   - empty  => true si no hay resultados
 *   - docs[] => array de snapshots con { id, ref, data() }
 *
 * Ejemplo: mockQuerySnap([
 *   { id: "c1", data: { name: "Ana" } },
 *   { id: "c2", data: { name: "Luis" } },
 * ])
 * Simula una query que devolvio 2 documentos.
 *
 * Ejemplo: mockQuerySnap([]) => query sin resultados
 */
export function mockQuerySnap(docs: { id: string; data: Record<string, any> }[]) {
  return {
    empty: docs.length === 0,
    docs: docs.map((d) => ({
      id: d.id,
      ref: mockDocRef(`col/${d.id}`),
      data: () => d.data,
    })),
  };
}

/**
 * Simula un Timestamp de Firestore.
 * En Firestore real, Timestamp tiene { seconds, nanoseconds, toMillis() }.
 * Pasas milisegundos para controlar el orden de los timestamps en tests.
 *
 * Ejemplo: mockTimestamp(1000) => timestamp que representa 1 segundo (1000ms)
 * Util para verificar ordenamiento: mockTimestamp(3000) > mockTimestamp(1000)
 */
export function mockTimestamp(ms = Date.now()) {
  return { toMillis: () => ms, seconds: Math.floor(ms / 1000), nanoseconds: 0 };
}

// ---------------------------------------------------------------------------
// Transaction mock
// ---------------------------------------------------------------------------

/**
 * Crea un mock de Transaction de Firestore.
 *
 * En Firestore real, runTransaction(firestore, async (tx) => { ... }) te da
 * un objeto `tx` con metodos get/set/update/delete. Aqui creamos versiones
 * fake para:
 *   - tx.get(ref)           => configurar con tx.get.mockResolvedValue(...)
 *   - tx.set(ref, data)     => verificar con expect(tx.set).toHaveBeenCalled()
 *   - tx.update(ref, data)  => verificar que datos se actualizaron
 *   - tx.delete(ref)        => verificar que se borro un documento
 */
export function createMockTransaction() {
  const tx = {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return tx;
}

// ---------------------------------------------------------------------------
// Mock completo del modulo firebase/firestore
// ---------------------------------------------------------------------------

/** Referencia fake que retorna addDoc (simula el doc recien creado) */
const _addDocRef = { id: "new-doc-id" };

/**
 * Objeto con TODAS las funciones de firebase/firestore reemplazadas por mocks.
 * Cada vi.fn() es un "espia" que:
 *   - Registra cuantas veces fue llamado y con que argumentos
 *   - Retorna un valor por defecto (o uno que tu configures con mockResolvedValue)
 *
 * En los tests accedes a los datos de las llamadas asi:
 *   firestoreMocks.addDoc.mock.calls[0]    => argumentos de la 1ra llamada
 *   firestoreMocks.addDoc.mock.calls[0][1] => 2do argumento de la 1ra llamada (los datos)
 */
export const firestoreMocks = {
  /**
   * Mock de doc(). Dos comportamientos:
   * 1. doc(firestore, "cards", "card1") => retorna ref con path "cards/card1"
   * 2. doc(collectionRef)               => simula auto-ID (como en addStamp donde
   *    se crea un ref con ID automatico antes de la transaccion)
   */
  doc: vi.fn((_fs: any, ...segments: string[]) => {
    if (segments.length === 0) {
      // Caso auto-ID: doc(collectionRef) sin path segments
      const autoId = "auto-" + Math.random().toString(36).slice(2, 10);
      return { id: autoId, path: `${_fs?.path ?? "col"}/${autoId}` } as any;
    }
    return mockDocRef(segments.join("/"));
  }),

  /** Mock de collection(). Retorna un objeto con path para identificar la coleccion */
  collection: vi.fn((_fs: any, ...segments: string[]) => ({ path: segments.join("/") })),

  /** Mock de addDoc(). Siempre retorna un ref con id "new-doc-id" */
  addDoc: vi.fn(async () => _addDocRef),

  /** Mock de updateDoc(). No hace nada, pero puedes verificar sus argumentos */
  updateDoc: vi.fn(async () => {}),

  /** Mock de deleteDoc(). No hace nada, pero puedes verificar que se llamo */
  deleteDoc: vi.fn(async () => {}),

  /** Mock de getDoc(). Debes configurarlo en cada test con mockResolvedValue() */
  getDoc: vi.fn(),

  /** Mock de getDocs(). Debes configurarlo con mockResolvedValue(mockQuerySnap([...])) */
  getDocs: vi.fn(),

  /**
   * Mock de deleteField(). Retorna un string centinela "__DELETE__".
   * En Firestore real, deleteField() retorna un token especial que borra el campo.
   * Aqui usamos "__DELETE__" para poder verificar en el test que se aplico.
   */
  deleteField: vi.fn(() => "__DELETE__"),

  /** Mock de query(). Solo retorna los argumentos que recibio */
  query: vi.fn((...args: any[]) => args),

  /** Mock de where(). Retorna un objeto descriptor del filtro */
  where: vi.fn((...args: any[]) => ({ type: "where", args })),

  /** Mock de orderBy(). Retorna un objeto descriptor del orden */
  orderBy: vi.fn((...args: any[]) => ({ type: "orderBy", args })),

  /**
   * Mock de runTransaction(). Se configura con setupRunTransaction() abajo.
   * Por defecto no hace nada — debes llamar setupRunTransaction(tx) en cada test
   * que use transacciones para que ejecute el callback con tu tx fake.
   */
  runTransaction: vi.fn(),

  /** Mock de Timestamp.now(). Retorna un timestamp fake */
  Timestamp: { now: vi.fn(() => mockTimestamp()) },

  /**
   * Mock de increment(). En Firestore real, increment(1) retorna un token
   * especial que suma 1 al valor actual. Aqui retornamos un objeto descriptivo
   * para poder verificarlo en los tests:
   *   expect(data.totalStamps).toEqual({ type: "increment", value: 1 })
   */
  increment: vi.fn((n: number) => ({ type: "increment", value: n })),
};

/**
 * Conecta runTransaction con un mock de Transaction.
 *
 * Sin esto, runTransaction no haria nada. Al llamar setupRunTransaction(tx),
 * le decimos: "cuando el servicio llame runTransaction(firestore, async (tx) => {...}),
 * ejecuta ese callback pasandole MI transaction fake".
 *
 * Esto permite que el codigo real del servicio se ejecute normalmente,
 * pero tx.get/set/update/delete son nuestros mocks.
 */
export function setupRunTransaction(tx: ReturnType<typeof createMockTransaction>) {
  firestoreMocks.runTransaction.mockImplementation(async (_fs: any, cb: any) => {
    return cb(tx);
  });
}

/**
 * LINEA CLAVE: intercepta el modulo real de firebase/firestore.
 *
 * Cuando cualquier archivo importado en los tests haga:
 *   import { addDoc, runTransaction, ... } from "firebase/firestore"
 *
 * Vitest le entregara las funciones de `firestoreMocks` en vez de las reales.
 * Esto se aplica a TODOS los archivos importados en el contexto del test.
 */
vi.mock("firebase/firestore", () => firestoreMocks);
