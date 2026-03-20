// La versión se inyecta desde PwaRegister como query param (?v=BUILD_ID)
// Así cada deploy genera un CACHE distinto y el browser descarga el SW actualizado
const CACHE_VERSION = new URL(location.href).searchParams.get("v") || "v1";
const CACHE = `la-commune-${CACHE_VERSION}`;
const PRECACHE = [
  "/offline.html",
  // Íconos — necesarios para splash screen y instalación offline
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // Posters de video — disponibles offline desde el primer install
  "/images/poster-hero.jpg",
  "/images/poster-loyalty.jpg",
  "/images/poster-storytelling.jpg",
];

// Instalación: precachear assets estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Activación: limpiar caches anteriores y notificar a los clientes
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => {
      // Notificar a todas las pestañas que hay una nueva versión activa
      return self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
      });
    })
  );
  self.clients.claim();
});

const UNCACHEABLE_EXTENSIONS = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;

function isCacheable(res) {
  return res.status === 200;
}

// Detectar si es una ruta de tarjeta dinámica /card/[cardId]
function isCardRoute(pathname) {
  return /^\/card\/[^/]+\/?$/.test(pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo GET y mismo origen
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // Ignorar peticiones a APIs externas (Supabase, Google, etc.)
  if (url.hostname.includes("supabase") || url.hostname.includes("googleapis")) return;

  // Ignorar videos — siempre devuelven 206 (range request) y no se pueden cachear
  if (UNCACHEABLE_EXTENSIONS.test(url.pathname)) return;

  // Ignorar RSC requests de Next.js App Router (devuelven flight data, no HTML).
  // Si el SW cachea estos payloads y luego los sirve como respuesta a una navegación
  // completa, el browser recibe datos en vez de HTML → pantalla blanca.
  if (request.headers.get("RSC") === "1") return;
  if (request.headers.get("Next-Router-Prefetch") === "1") return;

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

  // Network-first para rutas /card/[cardId].
  // Siempre intenta la red para obtener datos frescos; caché solo como fallback offline.
  if (isCardRoute(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        fetch(request)
          .then((res) => {
            if (isCacheable(res)) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cache.match(request).then((cached) => cached || cache.match("/offline.html")))
      )
    );
    return;
  }

  // Network-first para navegación HTML.
  // Siempre intenta la red primero para obtener el HTML más reciente (con BUILD_ID actualizado).
  // Solo usa caché como fallback si la red falla (offline).
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      fetch(request)
        .then((res) => {
          if (isCacheable(res)) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cache.match(request).then((cached) => cached || cache.match("/offline.html")))
    )
  );
});

// Background Sync — procesar cola de sellos offline cuando vuelve la conexión
self.addEventListener("sync", (event) => {
  if (event.tag === "flush-stamps") {
    event.waitUntil(flushOfflineStamps());
  }
});

// Periodic Background Sync — reintentar sellos pendientes periódicamente
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "retry-stamps") {
    event.waitUntil(flushOfflineStamps());
  }
});

async function flushOfflineStamps() {
  // Pedir a TODOS los clientes activos que procesen la cola.
  // El primero que tenga Supabase inicializado procesará los sellos.
  const clients = await self.clients.matchAll({ type: "window" });
  if (clients.length === 0) return;

  // Notificar a todos — el admin page (si está abierto) escuchará y procesará
  for (const client of clients) {
    client.postMessage({ type: "FLUSH_OFFLINE_STAMPS" });
  }
}

// Escuchar mensaje del cliente confirmando que el sync terminó
self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_COMPLETE") {
    const { synced, failed } = event.data;
    // Mostrar notificación si la app no está enfocada
    self.clients.matchAll({ type: "window", includeUncontrolled: false }).then((clients) => {
      const anyFocused = clients.some((c) => c.focused);
      if (!anyFocused && self.registration.showNotification && synced > 0) {
        self.registration.showNotification("La Commune", {
          body: failed > 0
            ? `${synced} sello${synced !== 1 ? "s" : ""} sincronizado${synced !== 1 ? "s" : ""}, ${failed} con error`
            : `${synced} sello${synced !== 1 ? "s" : ""} sincronizado${synced !== 1 ? "s" : ""} correctamente`,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "stamp-sync",
        });
      }
    });
  }
});
