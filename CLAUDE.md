# La Commune — Tarjeta de Fidelidad Digital

App web PWA para el programa de fidelidad del café La Commune (Mineral de la Reforma, MX).
Los clientes acumulan sellos digitales; el barista los agrega escaneando el QR de la tarjeta.
El menú del café se gestiona dinámicamente desde el panel de admin.

## Stack

- **Next.js 13.5.3** — App Router, `"use client"` explícito requerido
- **Supabase** (@supabase/supabase-js) — BD, Auth via service_role, Realtime
- **Tailwind CSS** + **Radix UI** + **Framer Motion v11**
- **TypeScript**
- **Vitest** + **happy-dom** — tests unitarios

> Firebase/reactfire fueron eliminados completamente. La migración a Supabase está completa (marzo 2026).

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # linter
npm test         # correr tests (vitest)
npm run test:watch    # tests en modo watch
npm run test:coverage # tests con cobertura

# Extraer frame de video para usar como poster (evita flash de pantalla negra)
ffmpeg -ss 00:00:05 -i public/videos/MI_VIDEO.mp4 -vframes 1 -vf "scale=1920:-1" -q:v 3 public/images/poster-MI_VIDEO.jpg -y
```

> Si hay errores raros de compilación, borrar `.next/` y reiniciar el servidor.

## Estructura de rutas

```
app/(main)/
  page.tsx          — Landing page (marketing)
  onboarding/       — Registro de cliente nuevo (nombre + WhatsApp)
  card/[cardId]/    — Vista de tarjeta del cliente (sellos + QR + stats)
  admin/            — Panel de barista (PIN protegido, tabs por rol)
  menu/             — Menú del café público (carga desde Supabase, imprimible con print:)
```

## Datos — Supabase (compartido con POS)

Ambos proyectos usan la misma instancia de Supabase. Las tablas principales:

| Tabla | Descripción |
|-------|-------------|
| `recompensas` | Config base (sellos_maximos=5, descripción) |
| `clientes` | Un registro por cliente (activo, nombre, telefono, consentimientos, notas, total_sellos) |
| `tarjetas` | Una tarjeta por cliente (sellos, sellos_maximos, estado, cliente_id) |
| `eventos_sello` | Log de cada sello agregado (tarjeta_id, agregado_por, tipo_bebida, notas, tamano) |
| `usuarios` | Staff — auth por PIN individual via RPC `login_por_pin()` |
| `productos` | Menú completo (precio_base, disponible, visible_menu, ingredientes, etiquetas) |
| `categorias_menu` | Categorías del menú (nombre, descripcion, tipo, activo) |
| `opciones_tamano` | Tamaños por producto (nombre, precio_adicional, orden) |
| `promociones` | Cupones/promos temporales (titulo, tipo, fechas, dias_semana, activo) |

### Funciones PostgreSQL (RPCs):
- `agregar_sello_a_tarjeta()` — transacción atómica para agregar sello
- `deshacer_sello()` — revertir último sello
- `canjear_tarjeta()` — canjear tarjeta completada + crear nueva
- `login_por_pin()` — validar PIN de usuario + retornar datos

## Servicios

- `services/customer.service.ts` — `createCustomer`, `getCustomerByPhone`, `getCardByCustomer`
- `services/card.service.ts` — `createCard`, `addStamp` (RPC), `undoStamp`, `redeemCard`, `getStampEventsByCard`
- `services/reward.service.ts` — `getReward` (config de recompensas)
- `services/menu.service.ts` — `getFullMenu`, `updateMenuItem`, `addMenuItem`, `deleteMenuItem`, `addMenuSection`, `updateMenuSection`, `deleteMenuSection`
  - `getFullMenu()` sin args → menú público (solo visible + disponible)
  - `getFullMenu({ forAdmin: true })` → admin (todo)
- `services/analytics.service.ts` — queries a `eventos_sello`
- `services/promotion.service.ts` — `getPromotions`, `getActivePromotions`, `addPromotion`, `updatePromotion`, `deletePromotion`
- `app/actions/verifyAdminPin.ts` — Server Action: PIN via RPC `login_por_pin()` + cookie de sesión firmada

## Auth — PIN por Usuario con Roles

- PIN individual por usuario (tabla `usuarios`, RPC `login_por_pin()` via service_role)
- `verifyAdminPin(pin)` → llama `login_por_pin()` → retorna `{ ok, nombre, rol }`
- Cookie `barista-session`: token firmado HMAC-SHA256 con `{ userId, nombre, rol, exp }` (2 horas)
- `checkBaristaSession()` → decodifica cookie → `{ valid, nombre, rol }`
- `logoutBarista()` → elimina cookie
- Rate limiting: 10 intentos por IP en ventana de 15 minutos

### Acceso por rol en admin panel:

| Rol | Tabs permitidas |
|-----|----------------|
| admin | Sellos, Menú, Promos, Clientes, Analytics, Config |
| barista | Sellos, Clientes |
| camarero | Sellos (solo QR) |

- Si solo hay 1 tab disponible, no se muestra tab bar
- Header muestra "Hola, {nombre} · {rol}"

## Componentes principales

- `components/ui/menu/MenuAdmin.tsx` — CRUD completo del menú admin
- `components/ui/menu/ItemDrawer.tsx` — detalle de item con dual toggle (visible + disponible)
- `components/ui/menu/EditItemModal.tsx` — editar item (nombre, precio/tamaños, ingredientes, imagen, tags)
- `components/ui/menu/EditSectionSheet.tsx` — editar sección (nombre + descripción)
- `components/ui/menu/AddItemSheet.tsx` — agregar item nuevo
- `components/ui/menu/AddSectionSheet.tsx` — agregar sección nueva
- `components/ui/promos/PromosAdmin.tsx` — Panel de gestión de promos (CRUD, toggle active)
- `components/ui/promos/PromoBanner.tsx` — Banner de promos activas (visible en `/menu` y `/card/[cardId]`)
- `components/ui/stamp-card.tsx` — Tarjeta con haptic feedback (`navigator.vibrate(80)`)
- `components/ui/StampCardFront.tsx` — Frente de tarjeta con mensaje de progreso dinámico
- `components/ui/PwaRegister.tsx` — Prompt de instalación PWA (iOS hint + Android `beforeinstallprompt`)

## Menú — Unificado con POS

### FIELD_TO_COLUMN mapping (menu.service.ts):
```
name → nombre, price → precio_base, ingredients → ingredientes,
optional → opcionales, note → nota, imageUrl → imagen_url,
available → disponible, visible → visible_menu, tags → etiquetas,
highlight → destacado, seasonal → estacional, sizes → (opciones_tamano)
```

### Precios con tamaños:
- `opciones_tamano.precio_adicional` guarda solo el EXTRA sobre `precio_base`
- Frontend muestra precio completo: `precio_base + precio_adicional`
- Al guardar desde admin: `precio_base = min(sizes)`, cada `precio_adicional = size.price - precio_base`

### Dual toggle en admin:
- **"Ocultar del menú"** → controla `visible_menu` (permanente)
- **"No disponible hoy"** → controla `disponible` (temporal)

### RLS policies anon (frontend usa anon key):
- SELECT con `USING(true)` en: productos, categorias_menu, opciones_tamano, clientes, promociones
- INSERT/UPDATE/DELETE con `WITH CHECK(true)` en: productos, categorias_menu, opciones_tamano

## Tests (Vitest)

- `services/__tests__/card.service.test.ts` — addStamp, undoStamp, redeemCard, getStampEventsByCard, getCardByCustomer, createCard (10 tests)
- `services/__tests__/menu.service.test.ts` — getFullMenu, deleteMenuItem, addMenuSection, deleteMenuSection (6 tests)
- `app/actions/__tests__/verifyAdminPin.test.ts` — session tokens, rate limiting (8 tests)
- Total: 25 tests, todos pasando

## Sesión de cliente

Sin cuentas ni contraseñas. La sesión se guarda en `localStorage`:
- `localStorage.cardId` — ID de la tarjeta activa
- `localStorage.customerId` — ID del cliente

Al entrar a `/card/[cardId]`, si no hay sesión coincidente se pide el número de WhatsApp para recuperarla.

## PWA

- Service Worker en `public/sw.js` — versión por `?v=NEXT_PUBLIC_BUILD_ID`
- Íconos PNG (no SVG) para iOS: `public/icons/icon-180.png`, `icon-192.png`, `icon-512.png`
- El SW excluye videos de la caché (206 Partial Content no es cacheable)
- Prompt de instalación Android via evento `beforeinstallprompt`

## Variables de entorno

Ver `.env.example`. Variables requeridas:
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server actions)
- `NEXT_PUBLIC_NEGOCIO_ID` — UUID del negocio
- `ADMIN_HMAC_KEY` o `COOKIE_SECRET` — Secret para firmar cookies de sesión

## Convenciones

- **Console.logs**: envueltos en `process.env.NODE_ENV === "development"` — no loguear en producción
- **`available` vs `active`**: `available` es toggle diario del barista en items; `active` es visibilidad de sección
- **Hydration errors**: borrar `.next/` + hard refresh (Cmd+Shift+R)
- **Framer Motion**: usar `AnimatePresence` con `key` único en cada child
- **UI en español**

## Pendiente

1. Tests de integración y E2E
2. Crear iconos PWA reales si se necesitan nuevos
