/* Service worker de SkySimAcademy: precache del shell + stale-while-revalidate.
   Mismo patrón probado que el de teoria-suiza, con caché propia y alcance
   limitado a /teoria-vuelo/ (el SW se registra relativo a esta app, así que
   nunca interfiere con TheorieKI en la raíz del sitio).
   Los assets llevan hash en el nombre → la caché se renueva sola; el
   index.html se sirve de caché y se actualiza en segundo plano. */
const CACHE = "aerolearn-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !request.url.startsWith("http")) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic")
            cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
