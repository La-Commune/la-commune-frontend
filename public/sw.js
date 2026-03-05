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

  // Ignorar peticiones de Firebase / APIs externas
  if (url.hostname.includes("firestore") || url.hostname.includes("googleapis")) return;

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

  // Cachear dinámicamente rutas /card/[cardId] en la primera visita online.
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
          // Si hay caché lo servimos de inmediato; la red actualiza en background
          return cached || networkFetch.catch(() => cache.match("/offline.html"));
        })
      )
    );
    return;
  }

  // Stale-while-revalidate para el resto de navegación HTML.
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

// Background Sync — procesar cola de sellos offline cuando vuelve la conexión
self.addEventListener("sync", (event) => {
  if (event.tag === "flush-stamps") {
    event.waitUntil(flushOfflineStamps());
  }
});

async function flushOfflineStamps() {
  // No podemos importar módulos ES desde el SW, así que leemos la cola de localStorage
  // vía un mensaje al cliente activo
  const clients = await self.clients.matchAll({ type: "window" });
  if (clients.length === 0) return;

  // Pedir al primer cliente que procese la cola
  clients[0].postMessage({ type: "FLUSH_OFFLINE_STAMPS" });
}
