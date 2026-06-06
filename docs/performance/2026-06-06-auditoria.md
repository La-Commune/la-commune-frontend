# Auditoría de Performance — Frontend · 2026-06-06

> Build real (Next 16.2.7 webpack) + análisis de manifests. Contexto: PWA móvil-first,
> clientes en 4G. Optimizaciones seguras APLICADAS HOY en branch `perf-fixes`; las que
> cambian pipeline/comportamiento esperan a David (checkboxes).

## First Load JS por ruta (build real, gzip)

| Ruta | First Load (gz) | Diagnóstico |
|------|-----------------|-------------|
| **/admin** | **578 kB** → ~363 kB tras fix | 🔴 recharts (215 kB) + @zxing cargaban estáticos |
| /card/[cardId] (+history/redeem) | 350 kB | 🟡 |
| /profile · /menu · /onboarding | 334-343 kB | 🟡 |
| **/** (landing) | 328 kB | 🟡 LCP era el video de 5.9 MB |

Baseline compartida: ~181 kB gz (framework+react). framer-motion (~37 kB gz) entra en
las 14 rutas vía `template.tsx`.

## ✅ Aplicado hoy (seguro, sin cambio visible)

1. **`AnalyticsDashboard` → `next/dynamic` (ssr:false)** — recharts (215 kB gz / 773 kB
   raw, 37% del First Load del admin) solo se baja al abrir la tab Analytics.
   `/admin`: 578 → ~363 kB gz.
2. **`QrScanner` → `next/dynamic` (ssr:false)** — @zxing solo se baja al abrir la cámara.
3. **Hero video `preload="auto"` → `"metadata"`** + **`preload` del poster con
   `fetchPriority: high`** (react-dom) — el LCP queda fijado en el poster (92 kB) en vez
   de competir con 5.9 MB de MP4 desde el primer frame. El video streamea al reproducir.
4. **`useNetworkStatus` pausa el polling con la pestaña oculta** — antes bajaba un PNG
   cada 30s PARA SIEMPRE en background (toda la app monta OfflineBanner). Datos+batería.
5. **rAF del fade de loop del video: solo mientras reproduce y la pestaña es visible** —
   antes corría a 60fps desde el montaje, por sección, indefinidamente.
6. **Assets muertos eliminados**: `coffee-black-white.mp4` (19 MB) y
   `poster-storytelling.jpg` (378 kB) — 0 referencias en código (verificado 2 veces).

## ⏸️ Para David (checkboxes)

- [ ] **Canales realtime de la vista de tarjeta: 6 → 3-4.** `card-page-${id}` (page) y
  `card-front-${id}` (StampCardFront) observan LA MISMA fila de tarjetas; `stamps-*` y
  `useRealtimeToasts` escuchan el mismo INSERT de eventos_sello. Fusionarlos es un
  refactor de flujo de datos que cruza componentes — ENTRELAZADO con los candidatos 4/5
  del informe de arquitectura (useSupabaseRow / reward-por-vista) y con archivos tocados
  por fix-tarjeta-diseno. Hacerlo DESPUÉS de los merges, como parte de ese trabajo.
- [ ] **`template.tsx`: framer-motion → transición CSS** — quitaría ~37 kB gz de TODAS
  las rutas, pero la animación de entrada cambia un pelo. Decisión de look.
- [ ] **Imágenes del menú: quitar `unoptimized`** + `images.remotePatterns` para el host
  de Supabase Storage + `sizes` — hoy las fotos de producto se sirven a resolución
  completa (bucket 2 MB). Gran ahorro en la página pública más visitada, pero toca el
  pipeline de imágenes (validar en Netlify).
- [ ] **Re-encodear MP4s**: coffee-free.mp4 (5.9 MB) → ~1-2 MB (720p CRF 28 o webm).
  Mayor palanca del LCP en 4G después del preload fix.
- [ ] Precachear `/menu` en el SW (arranque offline instantáneo de la página más usada).
- [ ] Roboto Mono: verificar si el peso 300 se usa; si no, quitarlo (1 variante menos).

## Sin regresiones (verificado)

Service Worker (precache mínimo resiliente, videos excluidos, timeouts) ✓ · fonts
self-hosted con swap ✓ · touch listeners passive ✓ · 0 `<img>` crudos ✓ · confetti/qrcode
viven en rutas donde se usan ✓.
