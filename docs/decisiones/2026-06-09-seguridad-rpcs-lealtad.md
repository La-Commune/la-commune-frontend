# Decisiones — Seguridad RPCs de lealtad · 2026-06-09

## Contexto
DAV-68: las RPCs `agregar_sello_a_tarjeta`, `deshacer_sello` y `canjear_tarjeta` eran
llamables directamente con la `anon` key (pública, visible en DevTools). Cualquiera podía
agregar sellos sin autenticación.

## Decisiones tomadas

- **REVOKE anon en las 3 RPCs**: eliminado acceso de `anon` y `PUBLIC` a las funciones de lealtad — razón: anon key es pública por diseño, cualquier persona puede extraerla de DevTools
- **GRANT service_role en las 3 RPCs**: acceso explícito solo a `service_role` — razón: service_role nunca sale del servidor, vive únicamente como env var en Netlify (process.env), invisible al navegador
- **3 API routes protegidas** (`/api/stamp/add`, `/api/stamp/undo`, `/api/stamp/redeem`): requieren `barista-session` cookie válida antes de tocar Supabase — razón: añade una segunda capa de autenticación real (PIN de barista)
- **Cookie path "/"**: el `barista-session` cookie se creaba con `path: "/admin"`, lo que impedía que llegara a `/api/stamp/*`. Corregido a `path: "/"`.
- **Modelo de roles**: el `rol` del barista está en la sesión pero las rutas de stamp no lo verifican — decisión intencional: cualquier barista autenticado debe poder agregar sellos; operaciones de admin (menú, precios, promos) siguen en flujo separado con anon + RLS
- **Audit trail aceptado como mitigación parcial**: `p_agregado_por` registra quién agregó cada sello en `eventos_sello` — permite detectar fraude post-hoc

## Gap conocido y aceptado (escala actual)

- **Fraude con PIN comprometido**: un atacante con el PIN de un barista puede agregar sellos o canjear tarjetas fraudulentamente. Daño acotado: no puede modificar menú, precios ni promociones.
- **No hay rate limiting** en operaciones de sello (solo existe en login de PIN: 10 intentos / 15 min)
- **No hay alertas de anomalías** (ej. >N sellos en X minutos por sesión)
- **No hay revocación de sesión** sin cambiar el PIN del barista

## Preguntas abiertas

- Anomaly detection — depende de: decisión de producto (¿vale la complejidad para escala actual?)
- Rate limiting en stamp operations — depende de: definir umbral razonable (¿cuántos sellos por hora es normal?)
- Revocación de sesión en tiempo real — depende de: si se agrega tabla de sesiones activas en Supabase
