// Bumped to v4 after adding the Kenney colormap textures + iso assets.
// Existing v3 caches were serving GLB files whose `Textures/colormap.png`
// references resolved to URLs that hadn't been deployed when the v3
// cache was first populated — resulting in untextured (white) buildings
// for users on a stale cache until they hard-refreshed. The bump here
// forces every client to wipe the v3 cache on next activate.
const CACHE_NAME = 'ai-genius-v4-iso-assets';

const isHttpRequest = (request) => {
  try {
    const protocol = new URL(request.url).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch (_error) {
    return false;
  }
};

const cacheIfEligible = (request, response) => {
  if (!response?.ok || !isHttpRequest(request)) {
    return;
  }

  const clone = response.clone();
  caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, clone);
  }).catch(() => {
    // Ignore cache write failures to keep runtime requests resilient.
  });
};

self.addEventListener('install', (event) => {
  // Activate immediately, don't wait for old SW to finish
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip unsupported schemes (e.g. chrome-extension://) to prevent Cache.put errors
  if (!isHttpRequest(event.request)) {
    return;
  }

  // Skip API requests and auth endpoints
  if (url.pathname.startsWith('/api') ||
      url.pathname.includes('/auth/') ||
      url.pathname.includes('/aipreneur/')) {
    return;
  }

  // Iso scene assets (GLBs + their Textures/colormap.png) — let the
  // browser HTTP cache + ETag headers handle these directly. We don't
  // own a hash on the URL (e.g. `building-a.glb` has no content hash),
  // so SW caching would pin an outdated copy forever and any newly
  // added sidecar texture wouldn't be discoverable on a stale install.
  if (url.pathname.startsWith('/assets/iso/')) {
    return;
  }

  // Navigation requests (HTML pages) — ALWAYS network-first
  // This ensures users always get the latest index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Hashed assets in /assets/ — cache-first (filenames change per build)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          cacheIfEligible(event.request, response);
          return response;
        });
      })
    );
    return;
  }

  // Everything else — network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        cacheIfEligible(event.request, response);
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
