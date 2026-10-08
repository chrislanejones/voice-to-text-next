/* Cache only the app shell and static assets. Article and AI requests,
   authentication responses, and third-party pages never enter this cache. */
const APP_CACHE = "voice-to-text-shell-v1";

function isAsset(url) {
  return url.origin === self.location.origin &&
    ["/_next/static/", "/speech/", "/icons/"].some((prefix) => url.pathname.startsWith(prefix));
}

async function remember(key, response) {
  if (!response.ok) return;
  try {
    const cache = await caches.open(APP_CACHE);
    await cache.put(key, response.clone());
    const keys = await cache.keys();
    // Bound old static files across deployments, retaining the app shell.
    for (const old of keys.filter((key) => new URL(key.url).pathname !== "/").slice(0, Math.max(0, keys.length - 100))) await cache.delete(old);
  } catch { /* Cache quota/private browsing must not interrupt a response. */ }
}

async function networkFirst(request, key = request) {
  try {
    const response = await fetch(request);
    if (!response.ok) {
      const cached = await caches.match(key, { cacheName: APP_CACHE });
      if (cached) return cached;
    }
    await remember(key, response);
    return response;
  } catch {
    return await caches.match(key, { cacheName: APP_CACHE }) || new Response("Offline. Open this app online once to cache its files.", { status: 503 });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const response = await fetch("/");
    await remember("/", response);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener("message", (event) => {
  if (event.data?.type !== "warm" || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((value) => {
    try { return typeof value === "string" && isAsset(new URL(value)); } catch { return false; }
  }).slice(0, 80);
  event.waitUntil(Promise.allSettled(urls.map(async (url) => remember(url, await fetch(url)))));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(networkFirst(request, "/"));
  } else if (isAsset(url)) {
    // Next's hashed assets are immutable. Public speech assets are refreshed
    // online, so a deployment never leaves an old speech worker installed.
    event.respondWith(url.pathname.startsWith("/_next/static/")
      ? caches.match(request, { cacheName: APP_CACHE }).then((cached) => cached || networkFirst(request))
      : networkFirst(request));
  }
});
