import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ILLUSTRATION_CATALOG,
  StampIllustration,
  type IllustrationId,
} from "../stamp-illustrations";

/**
 * Smoke tests del catálogo de ilustraciones de la tarjeta de sellos.
 * Renderiza cada ilustración en sus estados clave — atrapa errores de
 * runtime (vars indefinidas, props mal usadas) sin probar píxeles.
 */

const baseProps = {
  stamps: 3,
  maxStamps: 5,
  displayedStamps: 3,
  animatedStamps: 3,
  isComplete: false,
  isNewStamp: false,
  isDark: false,
  fillRadius: 30,
  realStamps: 3,
  realMaxStamps: 5,
};

function render(id: IllustrationId, overrides: Partial<typeof baseProps> = {}) {
  return renderToStaticMarkup(
    React.createElement(StampIllustration, { id, ...baseProps, ...overrides }),
  );
}

describe("ILLUSTRATION_CATALOG", () => {
  it("no tiene ids duplicados", () => {
    const ids = ILLUSTRATION_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("incluye las 4 ilustraciones nuevas (batch DAV-67)", () => {
    const ids = ILLUSTRATION_CATALOG.map((e) => e.id);
    expect(ids).toContain("rol-canela");
    expect(ids).toContain("v60-goteo");
    expect(ids).toContain("dos-tazas-brindis");
    expect(ids).toContain("corazon-latte-art");
  });

  it("cada entrada tiene name, category y emoji", () => {
    for (const entry of ILLUSTRATION_CATALOG) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
      expect(entry.emoji.length).toBeGreaterThan(0);
    }
  });
});

describe("StampIllustration — render de todo el catálogo", () => {
  for (const { id, name } of ILLUSTRATION_CATALOG) {
    it(`${name} (${id}) renderiza en progreso, completa y dark`, () => {
      // En progreso (light)
      const inProgress = render(id);
      expect(inProgress).toContain("<svg");

      // Estado vacío (0 sellos)
      const empty = render(id, { stamps: 0, displayedStamps: 0, animatedStamps: 0, realStamps: 0 });
      expect(empty).toContain("<svg");

      // Completa
      const complete = render(id, {
        stamps: 5,
        displayedStamps: 5,
        animatedStamps: 5,
        realStamps: 5,
        isComplete: true,
      });
      expect(complete).toContain("<svg");

      // Dark mode con sello nuevo
      const dark = render(id, { isDark: true, isNewStamp: true });
      expect(dark).toContain("<svg");
    });
  }
});

describe("StampIllustration — fallback", () => {
  it("id desconocido cae a flat-white-cenital sin tronar", () => {
    const html = renderToStaticMarkup(
      React.createElement(StampIllustration, {
        id: "no-existe" as IllustrationId,
        ...baseProps,
      }),
    );
    expect(html).toContain("<svg");
  });
});
