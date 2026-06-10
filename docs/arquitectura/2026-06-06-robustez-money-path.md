# Robustez del money-path — sellar / deshacer / canjear / bono referido · 2026-06-06

> Auditoría de un ángulo NO cubierto por los otros informes: no "quién puede llamar" (eso
> es la auditoría de seguridad/RLS), sino "qué pasa con un doble-tap, un corte de red a
> media operación, o dos acciones concurrentes" en el camino donde un bug cuesta
> **cortesías/bebidas gratis reales**. Solo lectura. Verificado a mano (grep + lectura),
> no solo por el agente auditor.

## Lo que SÍ está bien (no tocar)

- **Doble-tap online de sellar/canjear/deshacer:** los tres botones tienen `disabled={loading}`
  y `setLoading(true)` al inicio. El doble-tap humano normal está cubierto.
- **Pantalla de canje del cliente** (`card/[cardId]/redeem/page.tsx`): es **solo-lectura** —
  solo muestra el QR y escucha realtime. El cliente NO puede dispararse su propio canje ni
  duplicarlo. Bien diseñado.
- La RPC de Postgres se asume atómica para **cada** operación individual.

## 🔴 1 — La cola offline puede sellar dos veces la misma visita

**Verificado:** `syncQueue` (`app/(main)/admin/page.tsx:324`) **no tiene guard de
re-entrancia**. Hace `const all = await getQueue()` → filtra `pending` → por cada item
`await addStamp(...)` y *luego* `await removeFromQueue(item.id)` (líneas 333-339). El
`removeFromQueue` ocurre DESPUÉS de que la RPC resuelve.

Hay **4+ disparadores** que pueden invocar `syncQueue` casi a la vez cuando vuelve la red:
- efecto `isOnline` (`:375`)
- efecto on-mount con `navigator.onLine` (`:383`)
- listener del evento `flush-offline-stamps` (`:392`) — lo emite el SW vía
  `PwaRegister.tsx:25` cuando hace Background/Periodic Sync (`public/sw.js`)
- botón "Reintentar" (`:657`)

**Carrera concreta:** vuelve la conexión → `useNetworkStatus` pone `isOnline=true`
(dispara `:375`) y casi al mismo tiempo el SW postea `FLUSH_OFFLINE_STAMPS` (dispara
`:392`). Ambas corridas hacen `getQueue()`, **ambas ven el mismo item `pending`** (la
primera aún no llegó a `removeFromQueue`), y ambas llaman `addStamp` →
**2 sellos para 1 visita**. La RPC `agregar_sello_a_tarjeta` es atómica para un insert
pero **no idempotente** entre llamadas: el `id` del `QueuedStamp` nunca se le pasa como
clave de dedup.

**Impacto:** un cliente a falta de 1 sello recibe 2 → completa antes y se gana una bebida
no merecida. En un café con WiFi intermitente, ocurre de verdad.

**Fix mínimo seguro (solo cliente, recomendado):** guard de re-entrancia con `useRef`:
```ts
const syncingRef = useRef(false);
const syncQueue = useCallback(async () => {
  if (syncingRef.current) return;
  syncingRef.current = true;
  try { /* … cuerpo actual … */ }
  finally { syncingRef.current = false; }
}, []);
```
Cierra el 99% de la ventana. Defensa en profundidad ideal (requiere SQL, decisión de
David): pasar `item.id` a la RPC como clave de idempotencia + `ON CONFLICT DO NOTHING`.

**Por qué no lo apliqué solo:** es el money-path y el cambio de comportamiento del sync no
es unit-testeable en aislamiento (`syncQueue` es un `useCallback` sobre estado/hooks); no
puedo satisfacer "valida con npm test" para el cambio. Merece los ojos de David. El patrón
del guard ya existe en el repo para el PIN (`pinLoadingRef`).

## 🔴 2 — El bono de referido NUNCA se otorga (código muerto)

**Verificado con grep en todo el repo:** `awardReferralBonusIfNeeded`
(`services/card.service.ts:114`) tiene **0 call-sites**. La única ocurrencia es su
definición. No lo llama `handleAddStamp`, ni el onboarding, ni el SW, ni nadie.

**Contradice el CLAUDE.md**, que afirma: *"Cuando B recibe su primer sello →
`awardReferralBonusIfNeeded()` da sello bonus a A (ya existía)"*. El `id_referidor` SÍ se
guarda al crear el cliente y el badge "X invitados" SÍ se muestra (cuenta `id_referidor`),
así que la feature **parece** funcionar de cara al UI — pero el sello extra prometido al
referidor (*"ambos reciben un sello extra"*, `card/[cardId]/page.tsx`) **nunca se da**.

**Impacto:** promesa al cliente incumplida, silenciosa. No cuesta cortesías de más —
cuesta credibilidad y el incentivo de referidos no opera.

**Riesgo extra si se llega a conectar tal cual:** no es idempotente de forma segura. Su
único guard es la bandera `bono_referido_entregado`, escrita en un UPDATE **separado y
posterior** a la RPC del sello (no atómico). Dos "primeros sellos" casi simultáneos (p.ej.
el doble-sync del Hallazgo 1, o dos dispositivos) leerían ambos `false` → **doble bono**.

**Fix (decisión de David):** (1) decidir si la feature debe existir; (2) si sí, invocarla
desde `handleAddStamp` tras un `addStamp` exitoso **solo cuando sea el primer sello**
(`result.stamps === 1`); (3) mover "marcar bono + dar sello" a UNA sola RPC atómica
(`UPDATE clientes SET bono_referido_entregado=true WHERE id=? AND bono_referido_entregado=false RETURNING …`
y solo si afectó 1 fila, insertar el sello) para garantizar idempotencia.

## 🟡 3 — "Deshacer" usa cálculo optimista sobre estado potencialmente stale

`handleUndo` (`:543`) está cubierto contra doble-tap (`disabled={loading}`). El matiz: tras
`undoStamp` hace `setCard({ ...card, stamps: Math.max(0, card.stamps - 1) })` con el `card`
del closure. La pantalla de admin **no** se suscribe a realtime de la tarjeta (la del
cliente sí), así que si otro dispositivo selló entre medias, el número mostrado puede
quedar stale hasta el próximo escaneo. **Recuperable, no toca BD de más** (la RPC valida el
`eventId`). Fix: releer la tarjeta desde BD tras cada acción, o suscribir a realtime.

## 🟡 4 — Canje/sellar: el guard depende de `setLoading` (asíncrono), no de un ref

`handleRedeem` (`:558`) y `handleAddStamp` (`:471`) dependen de `disabled={loading}` +
`setLoading(true)`. Cubre el doble-tap humano real, pero `setLoading` no aplica hasta el
próximo render: dos clicks sintéticos en el mismísimo frame (antes del primer `await`)
teóricamente pasarían. Con un dedo en tablet, no ocurre. **Defensa en profundidad:** usar
el patrón `useRef` que el PIN ya usa bien (`pinLoadingRef`, `:1278/1307/1337`) —
`if (xRef.current) return; xRef.current = true` en la primera línea del handler.

## Prioridad

1. **🔴 1** — el más caro y probable (WiFi malo). Fix barato y bien acotado (guard `useRef`).
2. **🔴 2** — promesa rota silenciosa; decidir feature + idempotencia vía RPC.
3. **🟡 3, 4** — defensa en profundidad con `useRef` + relectura tras acciones.

Ninguno corregido en código: el money-path sin poder validar el cambio con tests merece la
revisión de David. Fixes precisos arriba.
