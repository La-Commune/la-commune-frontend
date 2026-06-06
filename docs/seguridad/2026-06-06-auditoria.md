# Auditoría de seguridad — Frontend (RLS + código) · 2026-06-06

> Skill `check-rls` contra la BD dev VIVA (`ntfmubmmykpzbltbeujv`, pg_policies +
> information_schema), cruzada con prod (`vzreodbrwksaoqmsnnqk`, solo lectura) y con
> auditoría de código del frontend. Complementa las auditorías de Mar-2026 (A1-A3, M1-M4,
> S1-S5) — aquí solo lo NUEVO o lo que cambió de severidad.
>
> ⚠️ Ningún DDL fue ejecutado. Todos los fixes de BD requieren aprobación de David.
> Los fixes de código seguros van en la branch `seguridad-fixes`.

## Modelo de amenaza relevante

La **anon key es pública** (viaja en el bundle JS). Cualquier persona puede extraerla y
hablar con PostgREST/RPCs directamente con `curl` — sin pasar por la UI. Todo lo que anon
puede hacer vía RLS/GRANTs/EXECUTE, **cualquiera en internet puede hacerlo**. La cookie
HMAC del admin protege la UI, NO la API. Ese es el lente de esta auditoría.

## Hallazgos de BD (rankeados)

### 🔴 R1 — RPCs de lealtad ejecutables por anon: el sistema de sellos es escribible por cualquiera

| Función | EXECUTE anon | Qué permite |
|---------|--------------|-------------|
| `agregar_sello_a_tarjeta(...)` | ✅ (verificado en dev) | Agregar sellos a CUALQUIER tarjeta, remotamente |
| `canjear_tarjeta(...)` | ✅ | Canjear tarjetas y crear nuevas |
| `deshacer_sello(...)` | ✅ | Borrar sellos de cualquier tarjeta |

Son SECURITY DEFINER (bypassean RLS por diseño). El panel admin del frontend las invoca
con anon key + cookie HMAC — pero la cookie solo gatea la UI: con la anon key y un
`POST /rest/v1/rpc/agregar_sello_a_tarjeta` cualquiera se llena la tarjeta desde su casa
y pasa por su bebida gratis.

**Riesgo real:** medio-alto en la práctica (requiere habilidad técnica + canje presencial;
escala de un café de barrio), pero es fraude de lealtad trivial para cualquier dev.

**Fix estructural (REQUIERE-DAVID, patrón ya probado):** mover `addStamp`/`undoStamp`/
`redeemCard` del admin a **server actions con service role + validación de cookie barista**
— exactamente el patrón que DAV-67 introdujo hoy con `saveRewardConfig`
(`app/actions/rewardConfig.ts`). Después: `REVOKE EXECUTE ... FROM anon` en las 3 RPCs.
Nota: el POS usa `authenticated` → no se ve afectado por el REVOKE a anon.

- [ ] Aprobar issue: server actions de sellos + REVOKE anon en 3 RPCs

### 🔴 R2 — `tarjetas`: INSERT anon sin restricción de columnas → tarjetas falsas pre-completadas

Policy viva: `anon_tarjetas_insert WITH CHECK (true)` (dev y prod). Cualquiera puede
insertar `{sellos: 5, sellos_maximos: 5, estado: "completada", cliente_id: <suyo>}` y
presentar el QR para canje.

**Fix quirúrgico (DDL, REQUIERE-DAVID — no rompe nada legítimo):**
```sql
DROP POLICY anon_tarjetas_insert ON tarjetas;
CREATE POLICY anon_tarjetas_insert ON tarjetas FOR INSERT TO anon
  WITH CHECK (sellos = 0 AND estado = 'activa');
```
El onboarding inserta `sellos: 0, estado: "activa"` (createCard) ✓; `canjear_tarjeta`
es SECURITY DEFINER y no pasa por RLS ✓. Cero impacto legítimo.

- [ ] Aprobar DDL (dev + prod)

### 🔴 R3 — `clientes`: UPDATE anon a CUALQUIER fila activa

Policy viva: `anon_clientes_update_restricted USING (eliminado_en IS NULL AND activo=true)`
sin lista de columnas. El perfil del cliente la necesita (editar nombre/teléfono/email sin
auth), pero permite a cualquiera editar los datos de TODOS los clientes, incluyendo
`total_sellos`/`total_visitas` (métricas de lealtad) y `id_referidor` (bonos).

**Fix elegante sin rediseño de auth (DDL, REQUIERE-DAVID):** grants a nivel de COLUMNA —
```sql
REVOKE UPDATE ON clientes FROM anon;
GRANT UPDATE (nombre, telefono, email, consentimiento_whatsapp, consentimiento_email)
  ON clientes TO anon;
```
El perfil solo edita esas 5 columnas. Las métricas/referidos quedan fuera del alcance
anon (las escriben triggers/RPCs/POS). Verificar que `awardReferralBonusIfNeeded` no
haga UPDATE de `bono_referido_entregado` con anon… **sí lo hace** (card.service.ts:156)
→ incluir `bono_referido_entregado` en el GRANT o mover ese flujo a la RPC. Anotado.

- [ ] Aprobar DDL con la lista de columnas final

### 🟡 R4 — GRANTs de tabla excesivos para anon (TRUNCATE/TRIGGER/REFERENCES/DELETE)

`clientes`, `eventos_sello`, `recompensas`, `tarjetas` tienen **TODOS** los privilegios
de tabla para anon (incl. `TRUNCATE`). Las policies RLS bloquean DML fila a fila, y
PostgREST no expone TRUNCATE — hoy **no explotable** vía API. Pero RLS NO aplica a
TRUNCATE: si mañana cualquier RPC/feature lo tocara, sería catastrófico. Defensa en
profundidad:
```sql
REVOKE TRUNCATE, TRIGGER, REFERENCES ON clientes, eventos_sello, recompensas, tarjetas FROM anon;
REVOKE DELETE ON clientes, eventos_sello, recompensas, tarjetas FROM anon; -- no hay policy DELETE anon
```
- [ ] Aprobar DDL (dev + prod)

### 🟡 R5 — `push_subscriptions`: UPDATE anon USING(true)

Cualquiera puede desactivar (o re-bindear `cliente_id` de) las suscripciones push de
TODOS. El flujo legítimo pasa por `/api/push/subscribe` — si esa ruta usa service role
(ver hallazgo de código C-API), las policies anon sobran completas; si usa anon, acotar
el UPDATE a `endpoint` matching. Decisión tras revisar la ruta.

- [ ] Aprobar: tighten o eliminar policies anon de push_subscriptions

### 🟡 R6 — `categorias_menu`: CRUD de secciones del admin frontend ROTO por RLS (dev Y prod)

El doc (CLAUDE.md frontend) dice que anon tiene INSERT/UPDATE/DELETE en categorias_menu —
**falso en ambas BDs**: solo existe `anon_categorias_select_public`. GRANTs sí existen
(INSERT/UPDATE/DELETE) pero sin policy ⇒ RLS niega. Resultado: agregar/editar/borrar
SECCIONES del menú desde el admin del frontend falla hoy (error 42501) — misma clase
del bug de recompensas que DAV-67 encontró (guardado silencioso roto).

**Fix recomendado:** NO crear policies anon nuevas — usar el patrón server action
(`saveRewardConfig`) para el CRUD de secciones. Mientras más superficie se mueve a
server actions, más policies anon se pueden RETIRAR (dirección correcta).

- [ ] Aprobar issue: server action para CRUD de categorias_menu

### 🟢 R7 — Correctos / sin cambios

- `usuarios`, `pagos`, `cortes_caja`, `gastos`, `negocios`: policies vía
  `get_mi_negocio_id()`/`get_mi_rol()` → NULL para anon → bloqueado ✓
- `intentos_pin`: deny-all ✓ (S5)
- `recompensas` anon: solo SELECT `activa=true` ✓ (M4; DAV-67 depende de esto)
- `eventos_sello` anon: solo SELECT (escrituras solo vía RPC) — USING(true) es amplio
  pero los UUIDs no son enumerables; aceptable para historial
- `productos`/`opciones_tamano`/`promociones` anon write: **intencional documentado**
  (24-Mar) para el admin frontend — misma clase estructural que R1/R6; se resuelve solo
  si David aprueba la dirección "admin escribe vía server actions". Anotado, no re-abierto.

## Hallazgos de código

### 🔴 C1 — Operaciones de barista sin autorización server-side (= R1, vista desde el código)
`services/card.service.ts:80-195` + `admin/page.tsx`: `addStamp`/`undoStamp`/`redeemCard`
corren client-side con anon key; la cookie `barista-session` solo gatea la UI.
**Fix:** server actions + `checkBaristaSession()` + service role (patrón `saveRewardConfig`
de DAV-67) y después REVOKE anon (R1). → REQUIERE-DAVID (checkbox en R1).

### 🔴 C2 — La vista de tarjeta exponía `pin_hmac` y `notas` con solo conocer el cardId
`card/[cardId]/page.tsx` y `profile/page.tsx` hacían `clientes.select("*")` → el navegador
recibía `pin_hmac` (HMAC de PIN de 4 dígitos → verificable offline si la key se filtra,
10⁴ candidatos) y `notas` (anotaciones del staff). La UI no usa ninguno.
**✅ APLICADO HOY:** select explícito sin `pin_hmac`/`notas` en ambas páginas.
**Caveat anotado:** el canal realtime de `clientes` sigue entregando la fila completa en
UPDATEs (realtime no filtra columnas) — el cierre total es no exponer `pin_hmac` a anon
vía columna-grant/vista (DDL → R3-bis). → checkbox abajo.

### 🔴 C3 — `/recover` (PIN de cliente) SIN rate limiting → fuerza bruta en minutos
`verifyCustomerPin` no tenía límite de intentos (el admin sí: 10/15min). PIN de 4 dígitos
+ teléfono enumerable = sesión de cualquier cliente en minutos.
**✅ APLICADO HOY:** rate limiting 8/15min por `ip|telefono` (mismo patrón Map de
verifyAdminPin) en `verifyCustomerPin` Y en `updateCustomerPhone` (`ip|update|customerId`).
Reset al acertar. Misma limitación conocida B1 (Map por instancia) — aceptable a esta escala.

### 🟡 C4 — `/api/push/subscribe` sin validación ni rate limit, filtrando errores internos
**✅ APLICADO HOY:** (a) validación de `endpoint` (URL https ≤1024), keys base64url ≤256,
`clienteId` UUID; (b) rate limit 10/10min por IP; (c) mensajes de error genéricos al
cliente (el detalle queda solo en `logger.error` server-side); (d) user-agent capado a 512.
**Pendiente REQUIERE-DAVID:** atar la suscripción a `getCustomerSession()` para que no se
pueda registrar `cliente_id` ajeno (cambia contrato del endpoint). → checkbox abajo.

### 🟡 C5 — Cookie de cliente: 1 año de vida SIN expiración firmada
La firma cubría `customerId:cardId` sin `exp` — una cookie capturada era válida para
siempre (solo expiraba el maxAge del navegador, no verificable server-side).
**✅ APLICADO HOY:** formato `customerId:cardId:exp:sig` con exp DENTRO de la firma,
maxAge 90 días. Cookies legacy (3 partes) se rechazan — sin impacto: localStorage es la
vía primaria y la cookie se reescribe en el siguiente `setCustomerSession`. +6 tests del
contrato firmado (incl. "extender exp sin re-firmar → rechazada").

### 🟡 C6 — Faltaban headers de seguridad
**✅ APLICADO HOY** en `next.config.js`: `X-Frame-Options: DENY` (clickjacking del admin),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy: camera=(self), microphone=(), geolocation=()` (la cámara la usa el
QR scanner del admin). **CSP completa NO incluida** (requiere prueba cuidadosa con
next/framer/supabase — sugerencia: empezar con `Content-Security-Policy-Report-Only`).
→ checkbox abajo.

### 🟢 C7 — Fallback silencioso de COOKIE_SECRET (B1 de Mar-2026)
**✅ APLICADO HOY:** si en producción faltan `ADMIN_HMAC_KEY`/`COOKIE_SECRET`, ahora se
loguea error fuerte al arrancar (antes degradaba en silencio a key efímera por proceso).

### 🟢 C8 — `/api/og` reflejaba `name` sin límite
Sin XSS (Satori escapa), pero un name enorme fuerza renders costosos.
**✅ APLICADO HOY:** `slice(0, 40)`.

### 🟢 C9 — Validación de input solo client-side en onboarding
`createCustomer` (anon) no re-valida teléfono/nombre/longitudes server-side; la RLS
`WITH CHECK (activo=true)` es permisiva. No es XSS (React escapa), sí contaminación de
datos. **Fix recomendado (REQUIERE-DAVID):** onboarding vía server action con validación
+ `CHECK` constraints en BD. → checkbox abajo.

### Lo que está BIEN (verificado, sin acción)
- 0 secretos hardcodeados; service role/VAPID/HMAC solo server-side; `.env*` ignorados.
- `timingSafeEqual` en TODAS las verificaciones (cookies + PINs) con length-check.
- Logger: 100% de `console.*` con guard de NODE_ENV (A3 se sostiene).
- Sin SQL injection posible (PostgREST parametriza; `resolveCardId` basura → "no encontrada").
- Skip link, lang=es, sin secretos en `NEXT_PUBLIC_*` inesperados.

## Checkboxes para David (fixes que requieren su aprobación)

- [ ] **R1+C1**: server actions de sellos/canje + REVOKE EXECUTE anon en 3 RPCs (cierra fraude de lealtad)
- [ ] **R2**: DDL `anon_tarjetas_insert` acotado a `sellos=0 AND estado='activa'` (dev+prod)
- [ ] **R3**: DDL column-grants de UPDATE en `clientes` para anon (definir lista final de columnas)
- [ ] **R3-bis**: no exponer `pin_hmac` a anon ni vía realtime (column grant de SELECT o vista)
- [ ] **R4**: DDL REVOKE TRUNCATE/TRIGGER/REFERENCES/DELETE de anon en 4 tablas
- [ ] **R5+C4**: atar push subscribe a sesión de cliente + tighten/eliminar policies anon de push_subscriptions
- [ ] **R6**: server action para CRUD de categorias_menu (hoy ROTO por RLS desde el admin frontend)
- [ ] **C6-bis**: CSP en modo Report-Only como siguiente paso de headers
- [ ] **C9**: onboarding vía server action con validación server-side + CHECK constraints

## Resumen ejecutivo

1. **La frontera de seguridad real del frontend es el RLS + EXECUTE de anon — y hoy las
   3 RPCs de lealtad están abiertas a internet** (R1). El patrón server-action-con-rol
   (DAV-67) es el camino: UI admin → server actions (cookie HMAC + service role) →
   REVOKE anon progresivo (R1, R5, R6, y eventualmente productos/promos).
2. Dos fixes DDL quirúrgicos de alto valor y cero impacto legítimo: R2 (tarjetas
   INSERT acotado) y R4 (REVOKE TRUNCATE y cía).
3. R3 (clientes UPDATE por columnas) requiere decidir la lista final de columnas.
4. Nada de esto es urgente-urgente para un café de barrio con canje presencial — pero
   R1+R2 son fraude de lealtad trivial para cualquier dev y el costo del fix es bajo.
