import { describe, it, expect } from "vitest";
import { mapTarjetaToCard, type TarjetaRow } from "../card.model";
import { mapClienteToCustomer, type ClienteRow } from "../customer.model";
import { mapRecompensaToReward, type RecompensaRow } from "../reward.model";

/**
 * Los mappers fila-Supabase → modelo son la única frontera que conoce los
 * nombres de columnas. Estos tests protegen las migraciones de schema:
 * si cambia una columna, truena AQUÍ y no en 5 páginas.
 */

describe("mapTarjetaToCard", () => {
  const row: TarjetaRow = {
    id: "tar-1",
    negocio_id: "neg-1",
    cliente_id: "cli-1",
    recompensa_id: "rew-1",
    sellos: 3,
    sellos_maximos: 5,
    estado: "activa",
    creado_en: "2026-05-01T10:00:00",
    actualizado_en: "2026-05-02T10:00:00",
    completada_en: null,
    canjeada_en: null,
  };

  it("mapea todos los campos al modelo Card", () => {
    const card = mapTarjetaToCard(row);
    expect(card.id).toBe("tar-1");
    expect(card.customerId).toBe("cli-1");
    expect(card.rewardId).toBe("rew-1");
    expect(card.stamps).toBe(3);
    expect(card.maxStamps).toBe(5);
    expect(card.status).toBe("activa");
    expect(card.createdAt).toBe("2026-05-01T10:00:00");
  });

  it("completada_en/canjeada_en null → undefined", () => {
    const card = mapTarjetaToCard(row);
    expect(card.completedAt).toBeUndefined();
    expect(card.redeemedAt).toBeUndefined();
  });

  it("preserva fechas de completado/canje cuando existen", () => {
    const card = mapTarjetaToCard({
      ...row,
      estado: "canjeada",
      completada_en: "2026-05-03T10:00:00",
      canjeada_en: "2026-05-04T10:00:00",
    });
    expect(card.completedAt).toBe("2026-05-03T10:00:00");
    expect(card.redeemedAt).toBe("2026-05-04T10:00:00");
  });
});

describe("mapClienteToCustomer", () => {
  const row: ClienteRow = {
    nombre: "Carol",
    telefono: "7711234567",
    email: null,
    activo: true,
    total_visitas: 12,
    total_sellos: 47,
    creado_en: "2026-01-15T09:00:00",
    ultima_visita: "2026-06-01T08:30:00",
    consentimiento_whatsapp: true,
    consentimiento_email: null,
    pin_hmac: null,
    notas: null,
    id_referidor: "cli-9",
    bono_referido_entregado: false,
  };

  it("mapea campos básicos y métricas", () => {
    const c = mapClienteToCustomer(row);
    expect(c.name).toBe("Carol");
    expect(c.phone).toBe("7711234567");
    expect(c.active).toBe(true);
    expect(c.totalVisits).toBe(12);
    expect(c.totalStamps).toBe(47);
    expect(c.schemaVersion).toBe(1);
  });

  it("convierte fechas a Date y null → undefined", () => {
    const c = mapClienteToCustomer(row);
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.lastVisitAt).toBeInstanceOf(Date);
    expect(c.email).toBeUndefined();
    expect(c.consentEmail).toBeUndefined();
    expect(c.notes).toBeUndefined();
  });

  it("ultima_visita null → lastVisitAt undefined", () => {
    const c = mapClienteToCustomer({ ...row, ultima_visita: null });
    expect(c.lastVisitAt).toBeUndefined();
  });

  it("preserva referidos", () => {
    const c = mapClienteToCustomer(row);
    expect(c.referrerCustomerId).toBe("cli-9");
    expect(c.referralBonusGiven).toBe(false);
  });
});

describe("mapRecompensaToReward", () => {
  const row: RecompensaRow = {
    id: "rew-1",
    negocio_id: "neg-1",
    nombre: "Bebida de cortesía",
    descripcion: "Cualquier bebida",
    sellos_requeridos: 5,
    tipo: "drink",
    activa: true,
    es_default: true,
    expira_en: null,
    ilustracion: "rol-canela",
    creado_en: "2026-03-01T00:00:00",
    actualizado_en: "2026-03-01T00:00:00",
  };

  it("mapea al modelo Reward", () => {
    const r = mapRecompensaToReward(row);
    expect(r.id).toBe("rew-1");
    expect(r.name).toBe("Bebida de cortesía");
    expect(r.requiredStamps).toBe(5);
    expect(r.illustration).toBe("rol-canela");
    expect(r.active).toBe(true);
  });

  it("ilustración vacía cae al default", () => {
    const r = mapRecompensaToReward({ ...row, ilustracion: "" });
    expect(r.illustration).toBe("flat-white-cenital");
  });
});
