# Robustez del onboarding + recuperación de sesión · 2026-06-06

> Tercer ángulo de robustez (tras money-path): registro y recuperación de sesión del
> cliente. **Un agente auditor marcó 3 🔴; la verificación directa los bajó a 🟡 y CORRIGIÓ
> uno que estaba mal.** Lo dejo documentado con la corrección porque la lección —no aplicar
> el "fix" del agente— vale tanto como los hallazgos. Verificado a mano (DB dev + lectura).

## Veredicto: el flujo es más robusto de lo que parecía

Lo que el agente alarmó como 🔴 throw-bugs **no lo son**, porque las queries tienen
`.limit(1)` + manejo de `PGRST116`. Y el manejo de localStorage corrupto/cuenta borrada
está bien resuelto. Quedan 2 huecos 🟡 reales pero acotados.

## ✅ Lo que está BIEN (verificado, no tocar)

- **localStorage corrupto / tarjeta o cuenta borrada:** `card/[cardId]/page.tsx` degrada con
  gracia → `GoneScreen` limpia localStorage+cookie y reinicia. Sin loops, sin crash. Sólido.
- **`ref` de referido inválido:** el lookup filtra `activo=true` dentro de try/catch que "no
  bloquea el registro si falla" (`onboarding/page.tsx:124-137`). Basura en `?ref=` no crashea.
- **Las queries con `.single()` NO explotan con duplicados:** `getCustomerByPhone`
  (`customer.service.ts:44`), ambos `getCardByCustomer` (`customer.service.ts:123` y
  `card.service.ts:400`) tienen **todas** `.limit(1).single()` + `if (error.code !== "PGRST116")`.
  `limit(1)` acota a 1 fila → `.single()` solo podría lanzar con 0 filas, y ese caso está
  cazado. **Por eso NO se debe cambiar a `.maybeSingle()`** (sería un cambio sin efecto real;
  `.maybeSingle()` tampoco arregla el caso multi-fila — también lanzaría). Corrección al agente.

## 🟡 1 — Doble-tap en "Continuar" puede crear un cliente duplicado

**Verificado:** la tabla `clientes` **no tiene UNIQUE en `telefono`** (consultado en la BD
dev: 0 unique constraints; solo `idx_clientes_telefono*` no-únicos; único índice único es el
PK). Y `handleSubmit` (`onboarding/page.tsx:78`) hace `setLoading(true)` en la **línea 94**,
no como primera instrucción; el botón es `disabled={loading}` (`:494`) pero `setLoading` es
async (aplica al próximo render). **No hay guard síncrono `ref`** (confirmado: no existe
`submittingRef`).

**Carrera:** dos taps dentro de la ventana de red. Ambos corren `getCustomerByPhone` → ambos
reciben `null` (el cliente aún no existe) → ambos `createCustomer` → 2 clientes con el mismo
teléfono, cada uno con su tarjeta. El `setCustomerSession` final gana el último → el cliente
se queda con UNA tarjeta; la otra queda huérfana.

**Daño:** acotado. Trigger estrecho (doble-tap real en ventana de red). Inmediato: bajo (el
cliente sigue con su sesión recién hecha). A largo plazo: si un cliente pierde su sesión y
**se re-registra** en vez de recuperar, arranca una segunda colección de sellos → "pierde"
su progreso viejo. (Mitigado en el caso normal: el re-registro SÍ se detecta por
`getCustomerByPhone` y redirige a `/recover` — ver 🟡 2. El duplicado solo nace por la
carrera del doble-tap.)

**Fix mínimo (no aplicado — money-path-like, no unit-testeable en aislamiento):** guard
síncrono al inicio del handler:
```ts
const submittingRef = useRef(false);
if (submittingRef.current) return;
submittingRef.current = true;
try { … } finally { submittingRef.current = false; }
```
Cinturón-y-tirantes definitivo: índice UNIQUE parcial `(negocio_id, telefono) WHERE activo`
— pero interactúa con el soft-delete + re-alta, así que es **decisión de David** (DDL).

## 🟡 2 — Cliente que ya existe + olvidó su PIN → callejón sin salida en `/recover`

**Verificado:** si quien ya tiene tarjeta vuelve a `/onboarding` con su número, se detecta y
se hace `router.replace("/recover")` (`onboarding/page.tsx:106`) — **sin pasar el teléfono
ni contexto**. En `/recover` se le exige el PIN que creó hace meses. Si no lo recuerda, no
puede registrarse (lo rebota) ni recuperar (no sabe el PIN). `/recover` no ofrece un
"olvidé mi PIN".

**Daño:** cliente real con sellos que no puede entrar desde un teléfono nuevo/sesión perdida.
Tiene workaround (la barra puede actualizar su teléfono vía `updateCustomerPhone`), pero al
cliente no se le dice. Es UX, no pérdida de datos.

**Fix mínimo (UX, decisión de David):** redirigir con contexto
(`/recover?phone=…&exists=1`), pre-llenar el teléfono, y mostrar "Ya tienes cuenta — ingresa
tu PIN. ¿No lo recuerdas? Visítanos en barra." Sin backend nuevo.

## 🟡 3 — Duplicados (de #1) provocan elección silenciosa del "más reciente"

No es un throw (corregido respecto al agente): con duplicados, `getCustomerByPhone` y
`verifyCustomerPin` (`customerSession.ts:96-104`) hacen `.order(creado_en desc).limit(1)` →
**eligen siempre el más nuevo**. Si los sellos viejos están en el cliente más antiguo, el
cliente entra a la tarjeta equivocada. Consecuencia de #1, no bug independiente. Fix: no
generar el duplicado (#1).

## 🟡 4 — Cliente huérfano si `createCard` falla tras `createCustomer`

`onboarding/page.tsx:152-173`: crear cliente → crear tarjeta → sesión, **sin transacción ni
rollback**. Si `createCard` falla (red, o "no hay recompensa default"), queda un cliente sin
tarjeta. **Se auto-recupera** si el cliente reintenta de inmediato (la rama `existing` sin
tarjeta crea la tarjeta). Si no, en `/recover` recibe "Encontramos tu cuenta pero no tu
tarjeta. Visítanos en barra" (mensaje correcto). Fix opcional: en el catch, si se creó el
cliente pero no la tarjeta, `deleteCustomer` (soft, ya existe) para no dejar el registro a
medias; o RPC transaccional `crear_cliente_con_tarjeta`.

## 🟢 5 — `recover` doble-submit: idempotente, impacto nulo

`recover/page.tsx:36` tiene `disabled` reactivo pero no `ref`. Dos taps → dos
`verifyCustomerPin` concurrentes, pero es idempotente (lee + setea cookie). Sin corrupción.
Mismo `submittingRef` por uniformidad si se toca.

## Prioridad

1. **🟡 1** — guard `submittingRef` en onboarding (barato; el UNIQUE en DB es decisión aparte).
2. **🟡 2** — UX del callejón de `/recover` (pasar contexto + "olvidé mi PIN").
3. **🟡 3/4/5** — consecuencias acotadas; se mitigan al cerrar #1 y con la relectura por barra.

Nada 🔴 aquí (a diferencia del money-path). Nada aplicado: los fixes de cliente no son
unit-testeables en aislamiento y el resto son decisiones de David. **No cambiar los
`.single()` a `.maybeSingle()`** — verificado innecesario.
