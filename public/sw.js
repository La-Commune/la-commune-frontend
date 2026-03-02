// La versión se inyecta desde PwaRegister como query param (?v=BUILD_ID)
// Así cada deploy genera un CACHE distinto y el browser descarga el SW actualizado
const CACHE_VERSION = new URL(location.href).searchParams.get("v") || "v1";
const CACHE = `la-commune-${CACHE_VERSION}`;
const PRECACHE = [
  "/",
  "/menu",
  "/card/preview",
  "/onboarding",
  "/offline.html",
  // Íconos — necesarios para splash screen y instalación offline (D)
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // Posters de video — disponibles offline desde el primer install
  "/images/poster-hero.jpg",
  "/images/poster-loyalty.jpg",
  "/images/poster-storytelling.jpg",
];

// Instalación: precachear rutas clave
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activación: limpiar caches anteriores
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

const UNCACHEABLE_EXTENSIONS = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;

function isCacheable(res) {
  return res.status === 200;
}

// (B) Detectar si es una ruta de tarjeta dinámica /card/[cardId]
function isCardRoute(pathname) {
  return /^\/card\/[^/]+\/?$/.test(pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo GET y mismo origen
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // Ignorar peticiones de Firebase / APIs externas
  if (url.hostname.includes("firestore") || url.hostname.includes("googleapis")) return;

  // Ignorar videos — siempre devuelven 206 (range request) y no se pueden cachear
  if (UNCACHEABLE_EXTENSIONS.test(url.pathname)) return;

  // Cache-first para assets estáticos de Next.js (_next/static)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (isCacheable(res)) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  // (B) Cachear dinámicamente rutas /card/[cardId] en la primera visita online.
  // Stale-while-revalidate: sirve del caché inmediatamente si existe, y en
  // paralelo lanza el fetch para actualizar. Si no hay caché, espera la red.
  if (isCardRoute(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((res) => {
            if (isCacheable(res)) cache.put(request, res.clone());
            return res;
          });
          // Si hay caché lo servimos de inmediato (A); la red actualiza en background
          return cached || networkFetch.catch(() => cache.match("/offline.html"));
        })
      )
    );
    return;
  }

  // (A) Stale-while-revalidate para el resto de navegación HTML.
  // Sirve del caché al instante si existe; actualiza en background.
  // Si no hay caché, espera la red; si falla, muestra offline.html.
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request).then((res) => {
          if (isCacheable(res)) cache.put(request, res.clone());
          return res;
        });

        if (cached) {
          // Revalidar en background sin bloquear la respuesta
          networkFetch.catch(() => {});
          return cached;
        }

        return networkFetch.catch(
          () => cache.match("/offline.html")
        );
      })
    )
  );
});
