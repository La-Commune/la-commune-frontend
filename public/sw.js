// La versión se inyecta desde PwaRegister como query param (?v=BUILD_ID)
// Así cada deploy genera un CACHE distinto y el browser descarga el SW actualizado
const CACHE_VERSION = new URL(location.href).searchParams.get("v") || "v1";
const CACHE = `la-commune-${CACHE_VERSION}`;

// ─── Precache: solo lo esencial para offline shell ───
const PRECACHE = [
  "/offline.html",
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ─── Timeouts ───
const NETWORK_TIMEOUT_MS = 4000; // 4s — si la red no responde, usamos cache
const NETWORK_TIMEOUT_NAV_MS = 3000; // 3s — navegación más agresiva

// ─── Instalación ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      // addAll es atómico — si 1 falla, ninguno se cachea.
      // Usamos Promise.allSettled para ser resilientes.
      return Promise.allSettled(
        PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Precache falló para ${url}:`, err.message);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// ─── Activación: limpiar caches anteriores ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => {
        return self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
        });
      })
  );
  self.clients.claim();
});

// ─── Helpers ───

const UNCACHEABLE = /\.(mp4|webm|ogg|mov|avi|mkv)$/i;

function isCacheable(res) {
  // Solo cachear respuestas OK y con body válido
  return res && res.status === 200 && res.type !== "opaque";
}

function isCardRoute(pathname) {
  return /^\/card\/[^/]+\/?$/.test(pathname);
}

function isAPIRoute(pathname) {
  return pathname.startsWith("/api/");
}

/**
 * Fetch con timeout — la pieza clave para que "funcione a medias" no pase.
 * Si la red tarda más de `ms`, rechazamos y caemos al cache.
 */
function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Network timeout"));
    }, ms);

    fetch(request, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// ─── Estrategia: Network-first con timeout y fallback a cache ───
function networkFirst(event, timeoutMs = NETWORK_TIMEOUT_MS) {
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      fetchWithTimeout(event.request, timeoutMs)
        .then((res) => {
          if (isCacheable(res)) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() =>
          cache
            .match(event.request)
            .then((cached) => cached || cache.match("/offline.html"))
        )
    )
  );
}

// ─── Estrategia: Stale-while-revalidate (para assets semi-estáticos) ───
function staleWhileRevalidate(event) {
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((res) => {
            if (isCacheable(res)) cache.put(event.request, res.clone());
            return res;
          })
          .catch(() => cached); // Si falla la red, no importa — ya servimos el cached

        // Si hay cached, devuélvelo de inmediato. Si no, espera la red.
        return cached || fetchPromise;
      })
    )
  );
}

// ─── Estrategia: Cache-first (para assets inmutables) ───
function cacheFirst(event) {
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          if (isCacheable(res)) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, clone));
          }
          return res;
        })
    )
  );
}

// ─── Fetch handler principal ───
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── Filtros: requests que NO debemos interceptar ──

  // Solo GET y mismo origen
  if (request.method !== "GET" || url.origin !== location.origin) return;

  // APIs internas (Supabase RPC, push subscribe, etc.) — NUNCA cachear
  if (isAPIRoute(url.pathname)) return;

  // Supabase / APIs externas
  if (url.hostname.includes("supabase") || url.hostname.includes("googleapis"))
    return;

  // Videos — 206 range requests no se pueden cachear
  if (UNCACHEABLE.test(url.pathname)) return;

  // Network connectivity checks — NO interceptar, deben ir directo a la red
  if (request.headers.get("X-Network-Check") === "1") return;

  // RSC requests de Next.js — flight data, NO HTML.
  // Si cacheamos estos y los servimos como navegación → pantalla blanca.
  if (request.headers.get("RSC") === "1") return;
  if (request.headers.get("Next-Router-Prefetch") === "1") return;

  // ── Estrategias por tipo de request ──

  // 1. Assets estáticos de Next.js — inmutables, cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    cacheFirst(event);
    return;
  }

  // 2. Imágenes y fonts — stale-while-revalidate (rápido + actualización en background)
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|avif|svg|woff2?|ttf|eot)$/i)
  ) {
    staleWhileRevalidate(event);
    return;
  }

  // 3. Rutas de tarjeta /card/[cardId] — network-first con timeout corto
  if (isCardRoute(url.pathname)) {
    networkFirst(event, NETWORK_TIMEOUT_MS);
    return;
  }

  // 4. Menú público /menu — stale-while-revalidate (cambia poco, debe ser rápido)
  if (url.pathname === "/menu" || url.pathname === "/menu/") {
    staleWhileRevalidate(event);
    return;
  }

  // 5. Navegación HTML — network-first con timeout
  if (request.mode === "navigate" || request.headers.get("Accept")?.includes("text/html")) {
    networkFirst(event, NETWORK_TIMEOUT_NAV_MS);
    return;
  }

  // 6. Todo lo demás (CSS dinámico, JS chunks no-static, etc.) — stale-while-revalidate
  staleWhileRevalidate(event);
});

// ─── Background Sync — procesar cola de sellos offline ───
self.addEventListener("sync", (event) => {
  if (event.tag === "flush-stamps") {
    event.waitUntil(flushOfflineStamps());
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "retry-stamps") {
    event.waitUntil(flushOfflineStamps());
  }
});

async function flushOfflineStamps() {
  const clients = await self.clients.matchAll({ type: "window" });
  if (clients.length === 0) return;
  for (const client of clients) {
    client.postMessage({ type: "FLUSH_OFFLINE_STAMPS" });
  }
}

// ─── Push Notifications ───
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "La Commune",
      body: event.data.text(),
    };
  }

  const title = data.title || "La Commune";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "la-commune-push",
    data: {
      url: data.url || "/card/preview",
      tipo: data.tipo || "general",
    },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Click en notificación ───
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/card/preview";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existingClient = clients.find(
          (c) => new URL(c.url).origin === location.origin
        );
        if (existingClient) {
          existingClient.focus();
          existingClient.navigate(url);
          return;
        }
        return self.clients.openWindow(url);
      })
  );
});

// ─── Mensajes del cliente ───
self.addEventListener("message", (event) => {
  // Sync complete — notificar si la app no está enfocada
  if (event.data?.type === "SYNC_COMPLETE") {
    const { synced, failed } = event.data;
    self.clients
      .matchAll({ type: "window", includeUncontrolled: false })
      .then((clients) => {
        const anyFocused = clients.some((c) => c.focused);
        if (!anyFocused && self.registration.showNotification && synced > 0) {
          self.registration.showNotification("La Commune", {
            body:
              failed > 0
                ? `${synced} sello${synced !== 1 ? "s" : ""} sincronizado${synced !== 1 ? "s" : ""}, ${failed} con error`
                : `${synced} sello${synced !== 1 ? "s" : ""} sincronizado${synced !== 1 ? "s" : ""} correctamente`,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: "stamp-sync",
          });
        }
      });
  }

  // Skip waiting — para actualizaciones controladas
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
