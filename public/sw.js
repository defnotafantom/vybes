/* Service worker minimale di Vybes.
 *
 * Strategia deliberatamente conservativa: si mettono in cache solo gli asset
 * statici e una pagina di fallback offline. Le pagine HTML e le API NON
 * vengono servite dalla cache, perché mostrare un elenco di ingaggi vecchio
 * di due giorni è peggio che dire "sei offline".
 */
const VERSION = "vybes-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Le API restano sempre online: niente risposte stantie.
  if (url.pathname.startsWith("/api/")) return;

  // Navigazioni: rete, con la pagina offline come rete di sicurezza.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Asset immutabili: cache prima, rete come fallback.
  if (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
  }
});
