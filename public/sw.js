// La versión se inyecta desde PwaRegister como query param (?v=BUILD_ID)
// Así cada deploy genera un CACHE distinto y el browser descarga el SW actualizado
const CACHE_VERSION = new URL(location.href).searchParams.get("v") || "v1";
const CACHE = `la-commune-${CACHE_VERSION}`;
const PRECACHE = ["/", "/menu", "/card/preview", "/onboarding", "/offline.html"];

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

  // Network-first para navegación — fallback a cache, luego a offline.html
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (isCacheable(res)) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(
        () =>
          caches.match(request) ||
          caches.match("/offline.html")
      )
  );
});
