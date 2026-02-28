# La Commune — Tarjeta de Fidelidad Digital

PWA de programa de sellos digitales para el café **La Commune** (Pachuca, MX).
Los clientes acumulan sellos; el barista los agrega escaneando el QR de la tarjeta del cliente.

**Creado por [⬡ David San Luis Aguirre](https://davidsanluisaguirre.com/)**

---

## Stack

| Tecnología | Versión | Rol |
|---|---|---|
| [Next.js](https://nextjs.org/) | 15 (latest) | Framework — App Router |
| [React](https://react.dev/) | 19 (latest) | UI |
| [TypeScript](https://www.typescriptlang.org/) | latest | Tipado |
| [Firebase SDK](https://firebase.google.com/) | 9.23 | Firestore + Auth (cliente) |
| [reactfire](https://github.com/FirebaseExtended/reactfire) | 4.2 | Hooks de Firestore |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Estilos |
| [Framer Motion](https://www.framer-motion.com/) | 11 | Animaciones |
| [Radix UI](https://www.radix-ui.com/) | — | Componentes accesibles |
| [Netlify](https://www.netlify.com/) | — | Hosting / Despliegue |

> Sin Firebase Admin SDK. Sin backend propio. La lógica de servidor corre como **Next.js Server Actions**.

---

## Estructura de rutas

```
app/(main)/
  page.tsx          — Landing page (marketing + acceso rápido a tarjeta)
  onboarding/       — Registro / recuperación de tarjeta (por WhatsApp)
  card/[cardId]/    — Tarjeta del cliente (sellos + QR)
  admin/            — Panel de barista (escanea QR, agrega sellos, PIN protegido)
  menu/             — Menú del café
```

---

## Colecciones Firestore

| Colección | Descripción |
|---|---|
| `rewards/default` | Config base: `maxStamps`, descripción del premio |
| `customers` | Un doc por cliente: nombre, teléfono, visitas, sellos totales |
| `cards` | Una tarjeta por cliente: stamps, maxStamps, status, ref a customer |
| `stamp-events` | Log de cada sello agregado (auditoría) |
| `config/admin` | PIN del barista como HMAC-SHA256 + longitud del PIN |

---

## Setup local

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd la-commune-frontend
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz con las credenciales de Firebase y las claves del servidor:

```env
# Firebase (obtener en Firebase Console → Project settings → Web app)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Clave secreta del servidor para el PIN del barista (nunca NEXT_PUBLIC_)
# Genera una con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ADMIN_HMAC_KEY=
```

### 3. Seed de Firestore

Ejecuta una sola vez para crear los documentos base (`rewards/default`):

```bash
node scripts/seed.mjs
```

> Requiere que las reglas de Firestore permitan escritura. Activa `allow read, write: if true` temporalmente en Firebase Console, corre el seed, y luego despliega las reglas correctas.

### 4. Configurar el PIN del barista

```bash
# Primera vez — establece el PIN inicial en Firestore
node scripts/setAdminPin.mjs <pin>
```

Este script calcula el HMAC-SHA256 del PIN usando tu `ADMIN_HMAC_KEY` y lo guarda en `config/admin` en Firestore. **Para cambiar el PIN en el futuro, solo vuelve a ejecutar este comando** con el nuevo PIN — sin tocar Netlify ni hacer redeploy.

### 5. Desplegar reglas de Firestore

```bash
firebase deploy --only firestore:rules
```

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

> Si hay errores raros de compilación, borra `.next/` y reinicia: `rm -rf .next && npm run dev`

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run lint` | Linter |
| `node scripts/seed.mjs` | Crea documentos base en Firestore |
| `node scripts/setAdminPin.mjs <pin>` | Actualiza el PIN del barista en Firestore |

---

## Despliegue en Netlify

### Variables de entorno requeridas en Netlify

En **Site settings → Environment variables**, agrega:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
ADMIN_HMAC_KEY          ← misma clave que usas localmente en .env.local
```

> `ADMIN_HMAC_KEY` se configura **una sola vez**. Cambiar el PIN después solo requiere correr `node scripts/setAdminPin.mjs <nuevo-pin>` — sin modificar Netlify.

---

## Flujo de autenticación

### Clientes
Sin cuentas ni contraseñas. La sesión se guarda en `localStorage`:
- `localStorage.cardId` — ID de la tarjeta activa
- `localStorage.customerId` — ID del cliente

Al entrar a `/card/[cardId]`, si no coincide con la sesión local se redirige a `/onboarding` para recuperar la tarjeta por número de WhatsApp.

### Baristas (panel admin)
Acceso mediante PIN numérico. El PIN se verifica en el servidor (Server Action):
1. El barista ingresa el PIN en `/admin`
2. El Server Action calcula `HMAC-SHA256(pin, ADMIN_HMAC_KEY)` y compara con el hash en Firestore
3. Si coincide, se habilita la pantalla de agregar sellos

El PIN en texto plano **nunca se almacena** — solo su HMAC.

---

## PWA

- Service Worker en `public/sw.js` — versión por `NEXT_PUBLIC_BUILD_ID`
- Íconos PNG para iOS: `public/icons/icon-180.png`, `icon-192.png`, `icon-512.png`
- El SW excluye videos del caché (206 Partial Content no es cacheable)

---

## Licencia

Este proyecto contiene código bajo diferentes licencias:

- Porciones del código están basadas en una plantilla con licencia MIT de Gavin D. Johnsen y permanecen bajo la Licencia MIT. La licencia MIT aplica solo al código de la plantilla original.
- Todo el código original, modificaciones, lógica de negocio y componentes propietarios son © 2026 La Commune y no están licenciados para reutilización, distribución o modificación sin permiso explícito.

Para consultas de licenciamiento, contacta a La Commune.
