# La Commune — Tarjeta de Fidelidad Digital

App web PWA para el programa de fidelidad del café La Commune (Pachuca, MX).
Los clientes acumulan sellos digitales; el barista los agrega escaneando el QR de la tarjeta.

## Stack

- **Next.js 13.5.3** — App Router, `"use client"` explícito requerido. `experimental: { serverActions: true }` es obligatorio en `next.config.js` (sin eso webpack falla).
- **Firebase SDK 9.23.0** (cliente, browser-oriented) — Firestore, Auth. Sin Firebase Admin SDK.
- **reactfire 4.2.3** — hooks de Firestore (`useFirestore`, `useFirestoreDocData`). Siempre pasar `{ suspense: false }` a `useFirestoreDocData` para evitar crashes con React 18.
- **Tailwind CSS** + **Radix UI** + **Framer Motion**
- **TypeScript**

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # linter

node scripts/seed.mjs        # crea rewards/default en Firestore
firebase deploy --only firestore:rules  # despliega reglas
```

> Si hay errores raros de compilación, borrar `.next/` y reiniciar el servidor.

## Estructura de rutas

```
app/(main)/
  page.tsx          — Landing page (marketing)
  onboarding/       — Registro de cliente nuevo (nombre + WhatsApp)
  card/[cardId]/    — Vista de tarjeta del cliente (sellos + QR)
  admin/            — Panel de barista (escanea QR, agrega sellos, PIN protegido)
  menu/             — Menú del café (imprimible con print:)
  login/            — Login (referencia, no producción activa)
```

## Colecciones Firestore

| Colección      | Descripción                                          |
|---------------|------------------------------------------------------|
| `rewards/default` | Config base (maxStamps=5, reward description)   |
| `customers`   | Un doc por cliente (active, name, phone, consentWhatsApp, createdAt, lastVisitAt, notes, schemaVersion, totalStamps,  totalVisits) |
| `cards`       | Una tarjeta por cliente (stamps, maxStamps, status, customerId ref, createdAt) |
| `stamp-events`| Log de cada sello agregado (cardId ref, addedBy, source, baristaId, customerId, drinkType, notes, size) |

## Servicios

- `services/customer.service.ts` — `createCustomer`, `getCustomerByPhone`, `getCardByCustomer`
- `services/card.service.ts` — `createCard`, `addStamp` (transaccional), `getCardByCustomer`
- `app/actions/verifyAdminPin.ts` — Server Action para validar el PIN del admin con `crypto.timingSafeEqual`

## Providers Firebase

`components/firebase-providers.tsx` — `MyFirebaseProvider` envuelve toda la app en `layout.tsx`.
Los hooks de Firestore solo funcionan dentro de este provider.

## Autenticación de admin

No usa Firebase Auth. El barista accede con un PIN numérico definido en `ADMIN_PIN` (variable de entorno de servidor, nunca `NEXT_PUBLIC_`). La validación corre como Server Action (`verifyAdminPin`).

## Sesión de cliente

Sin cuentas ni contraseñas. La sesión se guarda en `localStorage`:
- `localStorage.cardId` — ID de la tarjeta activa
- `localStorage.customerId` — ID del cliente

Al entrar a `/card/[cardId]`, si no hay sesión coincidente se pide el número de WhatsApp para recuperarla.

## PWA

- Service Worker en `public/sw.js` — versión por `?v=NEXT_PUBLIC_BUILD_ID`
- Íconos PNG (no SVG) para iOS: `public/icons/icon-180.png`, `icon-192.png`, `icon-512.png`
- El SW excluye videos de la caché (206 Partial Content no es cacheable)

## Variables de entorno

Ver `.env.example`. El archivo de secretos real es `.env.local` (no commitear).

## Reglas Firestore

`firestore.rules` — rewards: solo lectura. customers/cards: create y read públicos. stamp-events: solo escritura.
