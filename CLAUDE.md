# La Commune — Tarjeta de Fidelidad Digital

App web PWA para el programa de fidelidad del café La Commune (Mineral de la Reforma, MX).
Los clientes acumulan sellos digitales; el barista los agrega escaneando el QR de la tarjeta.
El menú del café se gestiona dinámicamente desde el panel de admin.

## Stack

- **Next.js 13.5.3** — App Router, `"use client"` explícito requerido.
- **Firebase SDK 9.23.0** (cliente, browser-oriented) — Firestore. Sin Firebase Admin SDK.
- **reactfire 4.2.3** — hooks de Firestore (`useFirestore`, `useFirestoreDocData`). Siempre pasar `{ suspense: false }` a `useFirestoreDocData` para evitar crashes con React 18.
- **Tailwind CSS** + **Radix UI** + **Framer Motion v11**
- **TypeScript**

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # linter

node scripts/seed.mjs        # crea rewards/default en Firestore
node scripts/seedMenu.mjs    # siembra el menú inicial en Firestore (idempotente)
firebase deploy --only firestore:rules  # despliega reglas

# Extraer frame de video para usar como poster (evita flash de pantalla negra)
ffmpeg -ss 00:00:05 -i public/videos/MI_VIDEO.mp4 -vframes 1 -vf "scale=1920:-1" -q:v 3 public/images/poster-MI_VIDEO.jpg -y
# Ajustar -ss (segundos) para elegir el frame más representativo del video
```

> Si hay errores raros de compilación, borrar `.next/` y reiniciar el servidor.
> Si hay errores de hidratación, también borrar `.next/` y hacer hard refresh en el browser (Cmd+Shift+R).

## Estructura de rutas

```
app/(main)/
  page.tsx          — Landing page (marketing)
  onboarding/       — Registro de cliente nuevo (nombre + WhatsApp)
  card/[cardId]/    — Vista de tarjeta del cliente (sellos + QR + stats)
  admin/            — Panel de barista (PIN protegido, tabs: Sellos + Menú + Promos + Clientes + Analytics)
  menu/             — Menú del café público (carga desde Firestore, imprimible con print:)
  login/            — Login (referencia, no producción activa)
```

## Colecciones Firestore

| Colección | Descripción |
|-----------|-------------|
| `rewards/default` | Config base (maxStamps=5, reward description) |
| `customers` | Un doc por cliente (active, name, phone, consentWhatsApp, createdAt, lastVisitAt, notes, schemaVersion, totalStamps, totalVisits) |
| `cards` | Una tarjeta por cliente (stamps, maxStamps, status, customerId ref, createdAt) |
| `stamp-events` | Log de cada sello agregado (cardId ref, addedBy, source, baristaId, customerId, drinkType, notes, size) |
| `config/admin` | PIN del barista como HMAC (pinHmac, pinLength) |
| `menu-sections` | Secciones del menú (title, description, type, order, active, schemaVersion) |
| `menu-sections/{id}/items` | Items del menú como subcolección (name, price?, sizes?, ingredients, note?, available, tags, highlight, seasonal, order, schemaVersion) |
| `promotions` | Cupones/promos temporales (title, description, type, startsAt, endsAt, daysOfWeek, active, appliesTo?, order, schemaVersion) |

### Por qué subcolección para items del menú
- Actualizar disponibilidad de un item = update de 1 doc, no reescribir toda la sección
- Sin límite de 1 MB por documento si el menú crece
- Updates atómicos por item

## Modelos TypeScript

- `models/promotion.model.ts` — `Promotion`
  - `Promotion.type: "2x1" | "descuento" | "gratis" | "otro"` — tipo de promo
  - `Promotion.startsAt / endsAt` — rango de fechas (Firestore Timestamps)
  - `Promotion.daysOfWeek: number[]` — filtro por día de la semana (0=Dom…6=Sab). Vacío = todos los días
  - `Promotion.active` — toggle del barista para habilitar/deshabilitar
  - `Promotion.appliesTo?: string` — texto libre ("Lattes", "Espresso", etc.)
- `models/menu.model.ts` — `MenuSection`, `MenuItem`, `SizeOption`
  - `MenuItem.sizes?: SizeOption[]` — tamaños con precio (ej: "10 oz" / "12 oz")
  - `MenuItem.price?: number` — precio único (mutuamente exclusivo con `sizes`)
  - `MenuItem.available` — toggle diario (barista marca "No disponible hoy")
  - `MenuItem.tags: string[]` — múltiples descriptores ("Fuerte", "Dulce", etc.)
  - `MenuSection.type: "drink" | "food" | "other"` — extensible a futuro
  - `MenuSection.active` — ocultar sección sin borrarla

## Servicios

- `services/customer.service.ts` — `createCustomer`, `getCustomerByPhone`, `getCardByCustomer`
- `services/card.service.ts` — `createCard`, `addStamp` (transaccional), `getCardByCustomer`
- `services/promotion.service.ts` — `getPromotions`, `getActivePromotions`, `addPromotion`, `updatePromotion`, `deletePromotion`
  - `getActivePromotions` filtra por `active`, rango de fechas y día de la semana
- `services/menu.service.ts` — `getFullMenu`, `updateMenuItem`, `addMenuItem`, `deleteMenuItem`, `addMenuSection`, `updateMenuSection`, `deleteMenuSection`
  - `updateMenuItem` acepta `clearFields?: (keyof MenuItem)[]` para usar `deleteField()` de Firestore (necesario al cambiar de precio único a tamaños o viceversa)
- `app/actions/verifyAdminPin.ts` — Server Action para validar el PIN del admin con `crypto.timingSafeEqual`

## Componentes principales

- `components/ui/MenuAdmin.tsx` — Panel de gestión del menú (solo accesible tras PIN)
  - Lista de secciones en grid (1 col móvil / 2 col tablet / 3 col desktop)
  - Tap en item → `ItemDrawer` (bottom sheet en móvil, modal centrado en desktop)
  - Desktop: dos columnas en drawer — detalles completos + acciones
  - `EditItemModal` — edición de item con toggle "Único / Por tamaño" para precio en oz
  - Todas las sheets responsive: `items-end sm:items-center`, `rounded-t-3xl sm:rounded-3xl`
- `components/ui/promos/PromosAdmin.tsx` — Panel de gestión de promos (CRUD, toggle active)
- `components/ui/promos/AddPromoSheet.tsx` — Sheet para crear nueva promo
- `components/ui/promos/EditPromoSheet.tsx` — Sheet para editar promo existente
- `components/ui/promos/PromoBanner.tsx` — Banner de promos activas (visible en `/menu` y `/card/[cardId]`)
- `components/ui/stamp-card.tsx` — Tarjeta con haptic feedback (`navigator.vibrate(80)`)
- `components/ui/StampCardFront.tsx` — Frente de tarjeta con mensaje de progreso dinámico
- `components/ui/PwaRegister.tsx` — Prompt de instalación PWA (iOS hint + Android `beforeinstallprompt`)

## Admin Panel (`/admin`)

- PIN protegido via Server Action (`verifyAdminPin`)
- Sesión del barista persiste en `sessionStorage` con clave `barista-authed`
- Dos tabs tras autenticarse: **Sellos** (añadir sellos escaneando QR) y **Menú** (gestionar menú)
- Al cambiar precio de "único" a "tamaños" en un item, se borra el campo `price` de Firestore con `deleteField()` y viceversa

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

Ver `.env.example`. El archivo de secretos real es `.env.local` (no commitear).

## Reglas Firestore

`firestore.rules`:
- `rewards` — solo lectura
- `customers`, `cards` — create y read públicos
- `stamp-events` — solo escritura (create)
- `config/admin` — lectura pública, escritura restringida a campos `pinHmac` y `pinLength`
- `promotions` — lectura pública, escritura abierta (la seguridad real la da el PIN en la UI)
- `menu-sections` y `menu-sections/{id}/items` — lectura pública, escritura abierta (la seguridad real la da el PIN en la UI)

## Patrones y convenciones

- **`order` field** en secciones e items → orden predecible sin depender del timestamp
- **`schemaVersion: 1`** en todos los documentos → mismo patrón en customers, cards, menu
- **`available` vs `active`**: `available` es toggle diario del barista en items; `active` es visibilidad de sección
- **`deleteField()`** de Firestore al limpiar campos opcionales mutuamente exclusivos (price ↔ sizes)
- **Hydration errors**: siempre borrar `.next/` + hard refresh. Los componentes "use client" con reactfire son browser-oriented; datos de Firestore no disponibles en SSR
- **Framer Motion**: usar `AnimatePresence` con `key` único en cada child para evitar bugs de transición
