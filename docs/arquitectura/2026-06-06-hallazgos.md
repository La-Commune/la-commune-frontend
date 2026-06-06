# Hallazgos de arquitectura — la-commune-frontend (censo global) · 2026-06-06

> Primera corrida de `improve-codebase-architecture` en este repo. Censo global con un
> agente explorador + diseños en competencia (3 para sesión, 2 para admin) evaluados con
> los criterios de Ousserhout/interfaces.md (tamaño de interfaz, estabilidad, information
> hiding, costo de migración, testeabilidad).
>
> Los candidatos 3 y 6 (bajo riesgo) se implementaron HOY en la branch
> `arquitectura-mejoras`. El resto espera aprobación de David (checkbox).

## Resumen del censo (fricción encontrada)

| # | Fricción | Evidencia | Dolor |
|---|----------|-----------|-------|
| 1 | Sesión regada (localStorage crudo) | ~23 call-sites en 5 páginas + cookie aparte; resolución copy-paste con 4 variantes | ALTO |
| 2 | Flujo de sellos del admin sin tests | `admin/page.tsx` 1557 líneas, ~20 useState interdependientes en StampView, 0 tests del flujo más crítico | ALTO |
| 3 | Mapeos fila→modelo duplicados | `mapTarjetaToCard` existe pero 5 sitios mapean inline; `mapClienteRow` definido DENTRO de una página | MEDIO |
| 4 | Páginas con queries Supabase inline | 42 `.from()` en `app/(main)/*` vs ~8 en services | MEDIO |
| 5 | Patrón fetch+realtime+cleanup copy-paste | 6+ instancias del mismo esqueleto de suscripción | MEDIO-BAJO |
| 6 | `stamp.service.ts` muerto | @deprecated, 0 importadores | BAJO |
| 7 | Reward fetch repetido | 4 páginas piden el default por separado (sobreestimado: no son concurrentes); lo real: card page + StampCardFront duplican el fetch de LA MISMA reward por vista | BAJO |

---

## Candidato 1: Sesión unificada — `lib/session.ts` (módulo deep sin React)

**Fricción que elimina:** ~23 call-sites de `localStorage.getItem/setItem("cardId"/"customerId")`
crudo en 5 páginas + la escalera de resolución (localStorage → cookie → lookup de tarjeta
activa → /recover) copiada con variaciones en `card/[cardId]/page.tsx:341-417`,
`card/page.tsx`, `redeem`, `history`, `profile`. Cero tests de la costura más transitada
de la app. Cada página re-decide el orden de fallback y puede divergir (ya divergen).

**Esfuerzo estimado:** M (7 rebanadas, cada una shippeable; R0 = módulo+tests sin usuarios)

**Diseño ganador (A, module-level puro):**
```ts
// lib/session.ts — único dueño de las keys + cookie + lookup
export interface Session { customerId: string; cardId: string }
export type Resolution =
  | { state: "ok"; session: Session }
  | { state: "redirect"; cardId: string }
  | { state: "recover" };

export function getStored(): Partial<Session>;            // sync, SSR-safe
export async function setSession(s: Session): Promise<void>;  // localStorage + cookie
export async function clearSession(): Promise<void>;
export async function resolveSession(cardIdParam?: string): Promise<Resolution>;
// (colapsa resolveSession/requireSession del diseño original en una sola función
//  con param opcional — feedback del juez)
```
- Encapsula: las 4 keys literales, el orden de fallback, la regla "cookie solo vale si su
  cardId coincide", la degradación de errores a `recover` (nunca throw al call-site), el
  guard SSR. Call-site de la página grande: ~75 líneas → ~13 (switch de 3 casos).
- Absorbe del diseño C: `Promise.race` con timeout ~2.5s sobre la server action de cookie
  para que la resolución no cuelgue offline (PWA) — degrada a localStorage.
- **Por qué ganó:** testeable HOY con happy-dom (localStorage real, solo se mockea
  cookie+lookup), cero dependencias nuevas, las páginas migradas y no migradas conviven
  (mismas keys), interfaz que habla dominio.

**Alternativas descartadas:**
- *Hook `useCustomerSession` (B):* el information hiding más fuerte, pero acopla la
  resolución al ciclo de render (frame de "mismatch conocido pero redirect pendiente" →
  footgun por página), bifurca la API (hook + helper no-React para onboarding) y exige
  instalar `@testing-library/react`.
- *Cookie-first con reconciliación inversa (C):* la auto-reconciliación cache→cookie
  contradice su propio invariante "cookie = verdad" y depende de heurísticas frágiles
  (cookie ausente ≠ cookie nunca escrita). Se rescata solo su timeout offline.

**Riesgo:** medio-bajo. R2 (la página grande) es el punto delicado; el diseño es
fetch-and-forget (no reactivo) — los cambios en vivo siguen siendo trabajo del realtime
existente, que NO se toca. Migración: R0 módulo+tests → R1 `card/page.tsx` → R2 página
grande → R3-R6 resto → R7 regla lint que prohíbe localStorage crudo fuera del módulo.

- [ ] Aprobar para convertir en issue

---

## Candidato 2: Flujo de sellos del admin como máquina de estados testeable

**Fricción que elimina:** el flujo MÁS crítico del negocio (escanear → sellar → deshacer
con countdown → canjear, con cola offline) vive en ~700 líneas de `StampView` dentro de
`admin/page.tsx` (1557 líneas), con ~20 `useState` interdependientes y CERO tests. Los
bugs reales son transiciones inválidas (doble-tap = doble sello, countdown que no limpia,
redeem sin customerId) que hoy nadie puede testear sin levantar DOM + red.

**Esfuerzo estimado:** L (4-5 rebanadas; las 2 primeras aditivas de riesgo bajo)

**Diseño ganador (B, profundizar la orquestación):**
- `lib/stamp-flow.ts`: reducer PURO `reduce(state, event)` con `Phase` explícita
  (idle/loading/loaded/stamping/success/redeeming/redeemed/queued/error), eventos tipados
  (SCAN/LOAD_OK/STAMP/STAMP_OK/STAMP_QUEUED/UNDO/UNDO_TICK/REDEEM/RESET…), selectors
  (`isComplete`, `finalDrink`, `resolveCardId`). Invariantes garantizadas por el reducer:
  undo solo en ventana de 30s, STAMP no-op fuera de `loaded` (anti doble-sello), REDEEM
  exige `customerId` sin tocar red, optimistic queue capado a maxStamps.
- `hooks/useStampFlow.ts`: efectos de borde (red, timers inyectables, cola offline) con
  `deps` inyectables para tests.
- `StampView` queda como render puro del state.
- **Por qué ganó:** ataca dónde viven los bugs (la orquestación), no solo el tamaño del
  archivo. Desbloquea ~20 tests deterministas sin DOM (reducer) — de 0 a cubierto.

**Preludio mecánico (rebanadas del diseño A, riesgo casi nulo, hacer primero):**
1. `components/admin/admin-tabs.ts` (constantes de tabs/roles)
2. `components/admin/RewardConfig.tsx` (vista aislada, 0 props)
3. `components/admin/PinGate.tsx` (1 prop: `onAuthenticated`)
4. Extraer las 2 queries inline al service (`getCardForStamp`, ya no la de reward default
   — esa la resolvió DAV-67)

**Alternativas descartadas:**
- *Extracción por vistas sola (A):* baja el line-count pero los bugs de orquestación
  siguen sin tests; su seam `deps?: Partial<StampDeps>` como prop de producción es deuda
  de testing en la interfaz real. Sus rebanadas 1-3 sí se rescatan como preludio.

**Riesgo:** medio-alto en la rebanada final (reescribir StampView para consumir el hook)
— mitigado porque las rebanadas 1-3 son aditivas y el flujo queda cubierto por tests
ANTES de la reescritura. La cola offline/sync NO entra al reducer (es una máquina aparte,
segunda iteración — debilidad reconocida del diseño).

- [ ] Aprobar para convertir en issue (preludio 1-4)
- [ ] Aprobar para convertir en issue (reducer + hook + reescritura StampView)

---

## Candidato 3: Mappers fila→modelo unificados ✅ IMPLEMENTADO HOY (parcial)

**Fricción que elimina:** `mapTarjetaToCard` existe en `models/card.model.ts` pero
`card/[cardId]/page.tsx` mapeaba inline en 3 lugares (fetch inicial, realtime handler,
visibilitychange) y `redeem/page.tsx` en 2; `mapClienteRow` estaba definido DENTRO de la
página en vez del modelo (asimetría: reward y card tienen mapper en el modelo, customer
no). Si cambia el schema de `tarjetas`, hay que cazar 5+ lugares.

**Esfuerzo:** S · **Riesgo:** bajo (funciones puras + tests nuevos de los 3 mappers)

**Hecho hoy (branch `arquitectura-mejoras`):**
- `mapClienteToCustomer` movido a `models/customer.model.ts` (exportado + test)
- `card/[cardId]/page.tsx`: 3 mapeos inline → `mapTarjetaToCard` / `mapClienteToCustomer`
- Tests nuevos de los 3 mappers (card, customer, reward) — protegen futuras migraciones
- `redeem/page.tsx` y `admin/page.tsx` NO se tocaron a propósito: ambos están siendo
  modificados en la branch `fix-tarjeta-diseno` (DAV-67) — aplicar el mapper ahí DESPUÉS
  del merge para evitar conflictos. Pendiente chico, anotado abajo.

- [x] Implementado (parcial — resto tras merge de DAV-67)
- [ ] Aprobar follow-up: mapper en redeem + admin tras merge

---

## Candidato 4: Hook de suscripción realtime `useSupabaseRow`

**Fricción que elimina:** el esqueleto fetch-inicial + `channel().on("postgres_changes",
filter).subscribe()` + `removeChannel` en cleanup está copiado 6+ veces (card page ×2,
redeem, StampCardFront ×2, useRealtimeToasts) con variaciones sutiles (¿maneja DELETE?
¿revalida en visibilitychange?). Un hook
`useSupabaseRow<T>(table, id, mapRow, opts?)` → `{ data, gone }` encapsularía fetch +
realtime + visibility + cleanup en un solo lugar.

**Esfuerzo estimado:** M · **Riesgo:** medio (toca todos los caminos realtime; probar en
dispositivo real). Recomendación: hacerlo DESPUÉS del candidato 1 (la página grande queda
mucho más chica y el hook se ve claro).

**Diseño (1 propuesta, no ameritó competencia):** interfaz
`useSupabaseRow(table, rowId, { map, onDelete?: "gone" | callback, revalidateOnVisible })`.
Information hiding: nombre de canal, payload casting, cleanup. Estabilidad alta.

- [ ] Aprobar para convertir en issue

---

## Candidato 5: Reward por vista — pasar la reward del card page a StampCardFront

**Fricción que elimina:** en la vista de tarjeta, la MISMA recompensa se busca dos veces
(página por `rewardId` + `StampCardFront` por su cuenta, con su propia suscripción
realtime). No es el "4 páginas piden el default" del censo (eso está bien: son páginas
distintas en momentos distintos y cachearlo cross-página introduce staleness) — lo real
es la duplicación DENTRO de una vista.

**Esfuerzo estimado:** S · **Riesgo:** bajo, PERO toca `StampCardFront.tsx` que está
siendo modificado en `fix-tarjeta-diseno` → hacer tras el merge.

- [ ] Aprobar para convertir en issue (tras merge DAV-67)

---

## Candidato 6: Eliminar `services/stamp.service.ts` ✅ IMPLEMENTADO HOY

**Fricción que elimina:** módulo @deprecated de 26 líneas con CERO importadores —
"helper que solo reenvía a otro módulo" (tabla de interfaces.md: eliminarlo).

- [x] Implementado

---

## Refactors de profundización ✅ IMPLEMENTADOS (testability deepening)

Más allá de los 6 candidatos del censo, durante la fase de profundización se extrajeron
funciones puras enterradas en componentes shallow (untesteables inline) a `lib/`,
ganando cobertura sin cambiar comportamiento — el patrón "deepening" de interfaces.md:

| Refactor | Branch · commit | Fricción eliminada |
|----------|-----------------|--------------------|
| `resolveCardId` (parser de QR del admin) → `lib/card-id.ts` | `arquitectura-mejoras` `aa4b4ba` | Frontera crítica escáner→sellado, antes inline y sin tests. +13 tests |
| `lib/utils` (timeAgo, formatDate, cn) testeados | `arquitectura-mejoras` `9c96eeb` | Funciones puras usadas en todo el repo, sin cobertura. +13 tests |
| `getMilestoneType` (gamificación) → `lib/milestones.ts` | `fix-tarjeta-diseno` `a30f98a` | Lógica de hitos con fronteras de redondeo, inline. +12 tests. Destapó que los hitos 25%/75% no disparan en tarjetas de 5 sellos (correcto por anti-colisión — ver RESUMEN) |

- [x] Implementados (bajo riesgo: extracciones puras byte-idénticas + archivos de test nuevos)

---

## No-acción deliberada (anti-objetivos)

- **Mover los 42 `.from()` de páginas a services indiscriminadamente:** queries one-off
  que solo usa una página no ganan nada envueltas en un service de paso (sería crear
  módulos shallow). Solo se mueven las que el candidato 1/2 absorben o las repetidas.
- **Cachear `getDefaultReward()` cross-página:** introduce staleness real (admin edita →
  landing muestra viejo) por un ahorro de 1 query por navegación. No vale.
- **Partir `admin/page.tsx` en archivos chicos sin el reducer:** archivos chicos no son
  la meta; interfaces chicas sí.

## Orden de merge sugerido (evita conflictos)

1. `fix-tarjeta-diseno` (DAV-67 — toca redeem, admin, StampCardFront, reward.service)
2. `lint-fix` (toca ~30 archivos, solo tipos/limpieza)
3. `arquitectura-mejoras` (esta branch — mappers en card page + modelo + borrado de
   stamp.service; conflicto esperable solo en imports de card/[cardId]/page.tsx, trivial)
4. Follow-ups de candidatos 3/5 tras esos merges
