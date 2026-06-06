# Auditoría de Accesibilidad WCAG 2.1 AA — Frontend · 2026-06-06

> Auditoría con agente (código real, ratios calculados con fórmula WCAG sobre los hex de
> Tailwind). El pase de 24-Mar ya cubrió: focus-visible copper global, aria-labels en
> EmptyState, tap feedback, skip link, `lang="es"`. Esto es lo que FALTA.
>
> **Buena noticia:** el modo oscuro (default) pasa contraste casi por completo, y NO hay
> problema de zoom (no existe `user-scalable=no` — WCAG 1.4.4 ✓). Los problemas se
> concentran en MODO CLARO, semántica de modales, y status messages.
>
> Top 10 fixes seguros: APLICADOS HOY en branch `a11y-fixes` (no cambian el look — solo
> el lado claro sube un paso de tono donde es texto de contenido; el oscuro queda igual).

## 🔴 Bloquea uso con AT o lectura

| # | Hallazgo | WCAG | Evidencia | Estado |
|---|----------|------|-----------|--------|
| 1 | `text-stone-400` como texto de CUERPO en claro = **2.41:1** (mínimo 4.5:1) | 1.4.3 | ingredientes del menú, descripciones de sección, labels de onboarding, texto de referidos, cuerpo/links de /nosotros | ✅ subido a `stone-500` (4.59:1) SOLO en claro |
| 2 | `text-stone-300` como texto = **1.43:1** (ilegible) | 1.4.3 | copyright /nosotros, separador "o" del admin, timestamps de sesión | ✅ `stone-500` claro / `stone-500` oscuro |
| 3 | `text-amber-500/600` sobre claro en banners = ~2:1 | 1.4.3 | admin "✓ Tarjeta completada", banner umbral | ✅ `amber-700` claro / `dark:amber-500` igual |
| 4 | Sheets/modales sin `role="dialog"`/`aria-modal`, sin Escape, sin manejo de foco | 4.1.2, 2.1.2, 2.4.3 | 6 sheets de menú/promos + overlay QR | ✅ role+aria-modal+Escape+foco inicial (focus trap completo → David) |
| 5 | QR expandible (desktop): trigger `div onClick` sin teclado — usuario de teclado NO puede ampliar el QR | 2.1.1, 4.1.2 | stamp-card.tsx ExpandableQR | ✅ semántica de botón + Enter/Espacio + aria-label |

## 🟡 Degrada la experiencia

| # | Hallazgo | WCAG | Estado |
|---|----------|------|--------|
| 6 | Toasts custom sin `aria-live`/`role="status"`; errores de form sin `role="alert"` | 4.1.3 | ✅ InAppToast, ProfileToast, notificación de sello, errores de onboarding/admin |
| 7 | `aria-live="polite"` envolviendo el HERO animado del landing (ruido para SR) | 4.1.3 | ✅ removido |
| 8 | Inputs de identidad sin `autocomplete` | 1.3.5 | ✅ tel/email/name en onboarding y profile; PIN → `one-time-code` |
| 9 | Confetti (canvas) ignora `prefers-reduced-motion` (la regla CSS no afecta canvas) | 2.3.3 | ✅ guard en fireCelebration/fireAchievement + stamp-card |
| 10 | Toggles de preferencias sin `role="switch"`/`aria-checked` | 4.1.2 | ✅ 3 toggles de profile |
| 11 | `HowItWorksAnimation` loop infinito que reduced-motion no detiene (JS sigue ciclando) | 2.2.2 | ⏸️ REQUIERE-DAVID (cambia la experiencia del landing para ese subset) |
| 12 | Botones de ilustración (admin) sin `aria-pressed` | 4.1.2 | ✅ aria-label + aria-pressed |

## 🟢 Pulido (no aplicado hoy — opcional)

- Flip de tarjeta móvil sin alternativa de teclado (el frente ya muestra lo esencial; QR
  accesible vía flujo) — agregar `role="button"` si se quiere AAA.
- Touch targets de footer/`Deshacer` < 44px (cumplen el AA de 24px; AAA es 44) —
  `min-h-[44px]` opcional.
- Borde de foco del `<select>` de filtros sutil en claro (`focus:border-stone-600`).

## REQUIERE-DAVID

- [ ] Focus trap completo en sheets (ciclar Tab) — sugiere `focus-trap-react` o migrar a Radix Dialog. Escape+role ya da el 80%.
- [ ] `HowItWorksAnimation` estática bajo reduced-motion (decisión de producto).
- [ ] Eyebrows/labels decorativos en `stone-400` claro: cumplir estricto implicaría
  oscurecerlos — son parte del look. Hoy SOLO se subió el texto de contenido.

## Sin problemas (verificado)

Skip link · lang=es · viewport/zoom · ThemeToggle · DownloadCardButton (modelo correcto
de dialog) · PIN pad operable por teclado · Radix Toaster (aria built-in) · inputs con
focus ring propio.
