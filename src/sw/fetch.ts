/// <reference lib="webworker" />

/**
 * Service worker fetch event handler.
 *
 * Routes requests through cache-first strategies for precached assets,
 * runtime image/font caches, navigation with offline fallback, and
 * passes cross-origin requests through without interception.
 */

export interface FetchHandlerConfig {
  precacheName: string;
  imageCacheName: string;
  fontCacheName: string;
  imageCacheLimit: number;
  manifestUrls: Set<string>;
  origin: string;
  appShellUrl: string;
  offlineFallbackUrl: string;
}

/**
 * Milliseconds to wait for the network before falling back to the cached
 * app shell on a navigation. Keeps first paint fast on flaky connections
 * while still preferring a fresh shell when the network is responsive.
 */
const NAVIGATION_NETWORK_TIMEOUT_MS = 3000;

const IMAGE_EXTENSIONS = /\.(svg|png|jpg|webp|ico)$/i;
const FONT_EXTENSIONS = /\.(woff2|woff|ttf|otf)$/i;

/**
 * Creates a 503 Service Unavailable response.
 */
function make503(): Response {
  return new Response('Service Unavailable', {
    status: 503,
    statusText: 'Service Unavailable',
  });
}

/**
 * Enforces LRU eviction on a cache, removing the oldest entries
 * until the cache size is within the specified limit.
 */
async function enforceCacheLimit(
  cache: Cache,
  limit: number,
): Promise<void> {
  const keys = await cache.keys();
  const excess = keys.length - limit;
  if (excess > 0) {
    // keys() returns entries in insertion order; oldest first
    const toDelete = keys.slice(0, excess);
    await Promise.all(toDelete.map((req) => cache.delete(req)));
  }
}

/**
 * Cache-first strategy for runtime caches (images, fonts).
 * On cache hit, re-inserts the entry to refresh its LRU position.
 * On cache miss, fetches from network and caches if response is ok.
 * Returns 503 on network failure with no cached response.
 */
async function runtimeCacheFirst(
  request: Request,
  cacheName: string,
  cacheLimit?: number,
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    // Clone before returning — once the response is returned, its body is consumed
    const toReturn = cached.clone();
    // Move to end (most-recently-used) by re-inserting the original
    cache.delete(request).then(() => cache.put(request, cached));
    return toReturn;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const responseClone = response.clone();
      // Cache the new response, then enforce limit
      await cache.put(request, responseClone);
      if (cacheLimit !== undefined) {
        await enforceCacheLimit(cache, cacheLimit);
      }
    }
    return response;
  } catch {
    return make503();
  }
}

/**
 * Handles a fetch event based on the configured routing strategy.
 *
 * Routing priority:
 * 1. Cross-origin requests → pass through (return null)
 * 2. Precached URLs → cache-first from precache
 * 3. Navigation requests → network-first app shell, cache / offline fallback
 * 4. Same-origin image requests → runtime cache-first with LRU eviction
 * 5. Same-origin font requests → runtime cache-first
 * 6. All other same-origin requests → pass through (return null)
 *
 * Returns null when the request should not be intercepted (pass through to network).
 */
export async function handleFetch(
  request: Request,
  config: FetchHandlerConfig,
): Promise<Response | null> {
  const url = new URL(request.url);

  // Cross-origin requests: pass through without interception
  if (url.origin !== config.origin) {
    return null;
  }

  // Precached URLs: cache-first from precache
  if (config.manifestUrls.has(url.pathname)) {
    return handlePrecached(request, config.precacheName);
  }

  // Navigation requests: network-first app shell with cache/offline fallback
  if (request.mode === 'navigate') {
    return handleNavigation(request, config);
  }

  // Same-origin image requests: runtime cache-first with LRU
  if (IMAGE_EXTENSIONS.test(url.pathname)) {
    return runtimeCacheFirst(request, config.imageCacheName, config.imageCacheLimit);
  }

  // Same-origin font requests: runtime cache-first (no eviction)
  if (FONT_EXTENSIONS.test(url.pathname)) {
    return runtimeCacheFirst(request, config.fontCacheName);
  }

  // All other same-origin requests: pass through
  return null;
}

/**
 * Cache-first strategy for precached assets.
 * If the cached response is missing, fetches from network and caches it.
 * Returns 503 if both cache and network fail.
 */
async function handlePrecached(
  request: Request,
  precacheName: string,
): Promise<Response> {
  const cache = await caches.open(precacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  // Precached asset missing from cache — try network
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return make503();
  }
}

/**
 * Navigation request handler.
 *
 * Network-first: fetch a fresh app shell so navigations always reference the
 * currently-deployed hashed chunks. A stale cached `index.html` points at old
 * chunk hashes (e.g. `EstatePage-<oldhash>.css`) that a new deployment no
 * longer serves, which surfaces as Vite "Unable to preload CSS" / failed
 * dynamic-import errors. Preferring the network avoids serving that stale shell.
 *
 * When the network is unavailable or slow, falls back to the cached app shell,
 * then to offline.html, then to a 503. A successful fresh shell also refreshes
 * the precached app shell so subsequent offline loads use the latest chunks.
 */
async function handleNavigation(
  request: Request,
  config: FetchHandlerConfig,
): Promise<Response> {
  const networkResponse = await fetchShellWithTimeout(request, NAVIGATION_NETWORK_TIMEOUT_MS);

  if (networkResponse && networkResponse.ok) {
    // Refresh the precached app shell so offline navigations get fresh chunks.
    try {
      const cache = await caches.open(config.precacheName);
      await cache.put(config.appShellUrl, networkResponse.clone());
    } catch {
      // Cache write failures are non-fatal — still serve the fresh response.
    }
    return networkResponse;
  }

  // Network unavailable/slow/errored — serve the cached app shell.
  const appShellResponse = await caches.match(config.appShellUrl);
  if (appShellResponse) {
    return appShellResponse;
  }

  // App shell not cached — try offline fallback.
  const offlineResponse = await caches.match(config.offlineFallbackUrl);
  if (offlineResponse) {
    return offlineResponse;
  }

  // No fallback available.
  return make503();
}

/**
 * Fetches a navigation request, racing it against a timeout. Resolves to the
 * network Response on success, or null on timeout or network error so the
 * caller can fall back to the cache.
 */
async function fetchShellWithTimeout(
  request: Request,
  timeoutMs: number,
): Promise<Response | null> {
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  const networkFetch = fetch(request).catch(() => null);

  return Promise.race([networkFetch, timeout]);
}
