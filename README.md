# La Commune — Tarjeta de Fidelidad Digital

PWA de programa de sellos digitales para el café **La Commune** (Mineral de la Reforma, Hidalgo, MX).
Los clientes acumulan sellos; el barista los agrega escaneando el QR de la tarjeta del cliente.

**Creado por [⬡ David San Luis Aguirre](https://davidsanluisaguirre.com/)**

---

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| [Next.js](https://nextjs.org/) | 16 | Framework — App Router |
| [React](https://react.dev/) | 19 | UI |
| [TypeScript](https://www.typescriptlang.org/) | latest | Tipado |
| [Supabase](https://supabase.com/) | — | Base de datos, Auth (RPC), Realtime |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Estilos |
| [Framer Motion](https://www.framer-motion.com/) | 11 | Animaciones |
| [Radix UI](https://www.radix-ui.com/) | — | Componentes accesibles |
| [Netlify](https://www.netlify.com/) | — | Hosting / Despliegue |

---

## Estructura de rutas

```
app/(main)/
  page.tsx          — Landing page (marketing + acceso rápido a tarjeta)
  onboarding/       — Registro / recuperación de tarjeta
  card/[cardId]/    — Tarjeta del cliente (sellos + QR)
  admin/            — Panel de barista (escanea QR, agrega sellos, PIN protegido)
  menu/             — Menú público del café
```

---

## Tablas en Supabase

Tablas compartidas con el POS (una sola fuente de verdad):

| Tabla | Descripción |
|---|---|
| `clientes` | Un doc por cliente: nombre, teléfono, nivel, puntos |
| `tarjetas` | Tarjeta de sellos: stamps, maxStamps, estado |
| `eventos_sello` | Audit trail de cada sello agregado |
| `recompensas` | Config de recompensas por negocio |
| `categorias_menu` | Categorías del menú |
| `productos` | Productos del menú (precio_base, disponible, visible_menu) |
| `opciones_tamano` | Tamaños por producto con precio_adicional |
| `push_subscriptions` | Suscripciones Web Push por cliente |
| `push_notifications_log` | Historial de notificaciones enviadas |

### Funciones PostgreSQL (RPC)

- `agregar_sello_a_tarjeta()` — Transacción atómica para agregar sello
- `deshacer_sello()` — Revertir último sello
- `canjear_tarjeta()` — Canjear tarjeta completa + crear nueva
- `login_por_pin()` — Auth por PIN individual (bcrypt)

---

## Setup local

### 1. Clonar e instalar

```bash
git clone <repo-url>
cd la-commune-frontend
npm install
```

### 2. Variables de entorno

Copia `.env.example` y crea los archivos por ambiente:

```bash
cp .env.example .env.development    # Para desarrollo
cp .env.example .env.production     # Para producción
```

Llena los valores en cada archivo. Ver `.env.example` para la documentación de cada variable.

| Archivo | Supabase | Uso |
|---|---|---|
| `.env.development` | Proyecto dev (`ntfmubmmykpzbltbeujv`) | Dev local |
| `.env.production` | Proyecto prod (`vzreodbrwksaoqmsnnqk`) | Build/deploy producción |

> **Nota:** Si existe un `.env.local`, Next.js lo carga con mayor prioridad que los archivos `--env-file`. Se recomienda no usar `.env.local` para evitar conflictos.

### 3. Iniciar servidor

```bash
npm run dev          # Dev local → Supabase development
npm run dev:prod     # Dev local → Supabase producción
```

El servidor arranca en `http://localhost:3004`.

---

## Auth

### Clientes

Sin cuentas ni contraseñas. La sesión se guarda en `localStorage`:
- `localStorage.cardId` — ID de la tarjeta activa
- `localStorage.customerId` — ID del cliente

### Baristas (panel admin)

Acceso mediante PIN numérico individual por usuario:
- Cookie `barista-session`: token firmado HMAC-SHA256 con `{ userId, nombre, rol, exp }` (2 horas)
- Rate limiting: 10 intentos por IP en ventana de 15 minutos
- Roles: admin (todo), barista (sellos+clientes), camarero (solo QR)
- PIN hasheado con bcrypt en base de datos (columna `pin_hash`)

---

## Push Notifications

Sistema completo de Web Push para notificar a clientes:

| Componente | Ubicación |
|---|---|
| SW Push Listener | `public/sw.js` |
| API Subscribe | `app/api/push/subscribe/route.ts` |
| Hook | `hooks/usePushNotifications.ts` |
| PushPrompt (banner UI) | `components/ui/PushPrompt.tsx` |

Triggers automáticos desde la base de datos:
- Sello agregado → progreso "Llevas X/Y sellos"
- 50% completada → "¡Vas a la mitad!"
- Casi completa (faltan 1-2) → "¡Solo falta 1 sello!"
- Tarjeta completada → "¡Tu bebida de cortesía te espera!"
- Primera tarjeta → bienvenida

Las VAPID keys se configuran como variables de entorno (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`).

---

## Menú unificado con POS

Las tablas `categorias_menu`, `productos` y `opciones_tamano` son compartidas con el POS. El admin del POS controla la disponibilidad con dos toggles:

- **"Ocultar del menú"** → `visible_menu` (permanente)
- **"No disponible hoy"** → `disponible` (temporal)

Precios con tamaños: `precio_base = min(sizes)`, cada `precio_adicional = size.price - precio_base`.

---

## Endowed Progress Effect

Las tarjetas de sellos muestran un sello visual bonus (+1) para motivar al cliente con sensación de progreso adelantado. La base de datos no cambia — es puramente visual en `StampCardFront.tsx`.

---

## Scripts

| Comando | Entorno | Descripción |
|---|---|---|
| `npm run dev` | development | Servidor de desarrollo (puerto 3004) |
| `npm run dev:prod` | production | Dev local contra Supabase producción |
| `npm run build` | production | Build de producción |
| `npm run build:dev` | development | Build contra Supabase development |
| `npm run start` | — | Iniciar servidor Next.js |
| `npm run lint` | — | ESLint |
| `npm run test` | — | Tests unitarios (Vitest) |
| `npm run test:e2e` | — | Tests E2E (Playwright) |
| `npm run test:e2e:ui` | — | E2E con UI interactiva |
| `npm run test:e2e:headed` | — | E2E con browser visible |

---

## Tests

### Unitarios (Vitest — 25 tests)

- `services/__tests__/card.service.test.ts` — addStamp, undoStamp, redeemCard
- `services/__tests__/menu.service.test.ts` — getFullMenu, deleteMenuItem
- `app/actions/__tests__/verifyAdminPin.test.ts` — session tokens, rate limiting

### E2E (Playwright — 24 tests, mock mode, mobile iPhone 14)

- `e2e/landing.spec.ts` — Landing page, links, navegación
- `e2e/onboarding.spec.ts` — Registro completo, validaciones
- `e2e/admin-pin.spec.ts` — PIN pad admin, dots, navegación
- `e2e/card-view.spec.ts` — Vista tarjeta, QR code
- `e2e/menu-public.spec.ts` — Menú, categorías, productos

---

## CI/CD

GitHub Actions corre en cada push/PR a `main` y `develop`:

1. **TypeCheck** — `tsc --noEmit`
2. **Unit Tests** — Vitest
3. **E2E Tests** — Playwright (solo en `develop`, no en `main`)

Netlify despliega automáticamente al mergear.

---

## Despliegue en Netlify

| Sitio | URL | Entorno |
|---|---|---|
| `lacommune` | `lacommune.netlify.app` | Producción |
| `lacommunedevelopment` | `lacommunedevelopment.netlify.app` | Desarrollo |

Variables de entorno requeridas en Netlify:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_NEGOCIO_ID
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
ADMIN_HMAC_KEY
```

---

## PWA

- Service Worker v2 con cache por capas en `public/sw.js`
- Web Push listener integrado en el SW
- Íconos PNG para iOS: `public/icons/icon-180.png`, `icon-192.png`, `icon-512.png`
- El SW excluye videos del caché (206 Partial Content no es cacheable)

---

## Licencia

Este proyecto contiene código bajo diferentes licencias:

- Porciones del código están basadas en una plantilla con licencia MIT de Gavin D. Johnsen y permanecen bajo la Licencia MIT.
- Todo el código original, modificaciones, lógica de negocio y componentes propietarios son © 2026 La Commune y no están licenciados para reutilización, distribución o modificación sin permiso explícito.

Para consultas de licenciamiento, contacta a La Commune.
