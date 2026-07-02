import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleFetch, FetchHandlerConfig } from '../fetch';

describe('handleFetch', () => {
  let originalCaches: typeof globalThis.caches;
  let originalFetch: typeof globalThis.fetch;

  const defaultConfig: FetchHandlerConfig = {
    precacheName: 'precache-v2',
    imageCacheName: 'images-v2',
    fontCacheName: 'fonts-v2',
    imageCacheLimit: 60,
    manifestUrls: new Set([
      '/PWACharSheet/assets/index.js',
      '/PWACharSheet/assets/style.css',
      '/PWACharSheet/index.html',
    ]),
    origin: 'https://example.com',
    appShellUrl: '/PWACharSheet/index.html',
    offlineFallbackUrl: '/PWACharSheet/offline.html',
  };

  beforeEach(() => {
    originalCaches = globalThis.caches;
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function createRequest(url: string, options?: RequestInit & { mode?: RequestMode }): Request {
    return {
      url,
      mode: options?.mode ?? 'no-cors',
      clone: () => createRequest(url, options),
    } as unknown as Request;
  }

  function setupCachesOpen(cacheMap: Record<string, { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; keys: ReturnType<typeof vi.fn> }>) {
    globalThis.caches = {
      open: vi.fn(async (name: string) => cacheMap[name] ?? createEmptyMockCache()),
      match: vi.fn(async () => undefined),
    } as unknown as CacheStorage;
  }

  function setupCachesMatch(matchFn: (url: string | Request) => Response | undefined) {
    globalThis.caches = {
      ...globalThis.caches,
      open: (globalThis.caches as CacheStorage).open,
      match: vi.fn(async (url: string | Request) => matchFn(typeof url === 'string' ? url : url.url ?? url)),
    } as unknown as CacheStorage;
  }

  function createEmptyMockCache() {
    return {
      match: vi.fn(async () => undefined),
      put: vi.fn(async () => undefined),
      delete: vi.fn(async () => true),
      keys: vi.fn(async () => []),
    };
  }

  function createMockResponse(body = 'cached', status = 200): Response {
    return new Response(body, {
      status,
      statusText: status === 200 ? 'OK' : 'Error',
    });
  }

  // --- Precached URL tests ---

  describe('precached URLs', () => {
    it('returns cached response without fetching when precached URL is found in cache', async () => {
      const cachedResponse = createMockResponse('cached-asset');
      const precacheStore = {
        match: vi.fn(async () => cachedResponse),
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => true),
        keys: vi.fn(async () => []),
      };

      setupCachesOpen({ 'precache-v2': precacheStore });
      globalThis.fetch = vi.fn();

      const request = createRequest('https://example.com/PWACharSheet/assets/index.js');
      const result = await handleFetch(request, defaultConfig);

      expect(result).toBe(cachedResponse);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('fetches and caches when precached URL is not in cache and network succeeds', async () => {
      const networkResponse = createMockResponse('fresh-asset');
      const precacheStore = {
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => true),
        keys: vi.fn(async () => []),
      };

      setupCachesOpen({ 'precache-v2': precacheStore });
      globalThis.fetch = vi.fn(async () => networkResponse);

      const request = createRequest('https://example.com/PWACharSheet/assets/index.js');
      const result = await handleFetch(request, defaultConfig);

      expect(result).toBe(networkResponse);
      expect(globalThis.fetch).toHaveBeenCalled();
      expect(precacheStore.put).toHaveBeenCalled();
    });

    it('returns 503 when precached URL is not in cache and network fails', async () => {
      const precacheStore = {
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => true),
        keys: vi.fn(async () => []),
      };

      setupCachesOpen({ 'precache-v2': precacheStore });
      globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch'); });

      const request = createRequest('https://example.com/PWACharSheet/assets/index.js');
      const result = await handleFetch(request, defaultConfig);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(503);
    });
  });

  // --- Navigation request tests ---

  describe('navigation requests', () => {
    it('returns cached app shell for navigation requests', async () => {
      const appShellResponse = createMockResponse('<html>app</html>');

      globalThis.caches = {
        open: vi.fn(async () => createEmptyMockCache()),
        match: vi.fn(async (url: string | Request) => {
          const u = typeof url === 'string' ? url : url.toString();
          if (u === '/PWACharSheet/index.html') return appShellResponse;
          return undefined;
        }),
      } as unknown as CacheStorage;
      globalThis.fetch = vi.fn();

      const request = createRequest('https://example.com/PWACharSheet/some-page', { mode: 'navigate' });
      const result = await handleFetch(request, defaultConfig);

      expect(result).toBe(appShellResponse);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('returns offline.html when app shell is not cached', async () => {
      const offlineResponse = createMockResponse('<html>offline</html>');

      globalThis.caches = {
        open: vi.fn(async () => createEmptyMockCache()),
        match: vi.fn(async (url: string | Request) => {
          const u = typeof url === 'string' ? url : url.toString();
          if (u === '/PWACharSheet/offline.html') return offlineResponse;
          return undefined;
        }),
      } as unknown as CacheStorage;
      globalThis.fetch = vi.fn();

      const request = createRequest('https://example.com/PWACharSheet/some-page', { mode: 'navigate' });
      const result = await handleFetch(request, defaultConfig);

      expect(result).toBe(offlineResponse);
    });

    it('returns 503 when no cached fallbacks are available for navigation', async () => {
      globalThis.caches = {
        open: vi.fn(async () => createEmptyMockCache()),
        match: vi.fn(async () => undefined),
      } as unknown as CacheStorage;
      globalThis.fetch = vi.fn();

      const request = createRequest('https://example.com/PWACharSheet/some-page', { mode: 'navigate' });
      const result = await handleFetch(request, defaultConfig);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(503);
    });
  });

  // --- Same-origin image tests ---

  describe('same-origin image requests', () => {
    it('returns cached image on cache hit', async () => {
      const cachedImage = createMockResponse('image-data');
      const imageCache = {
        match: vi.fn(async () => cachedImage),
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => true),
        keys: vi.fn(async () => []),
      };

      setupCachesOpen({ 'images-v2': imageCache });
      globalThis.fetch = vi.fn();

      const request = createRequest('https://example.com/PWACharSheet/icons/hero.png');
      const result = await handleFetch(request, defaultConfig);

      // Result is a clone of the cached response (not the same reference)
      expect(result!.status).toBe(cachedImage.status);
      expect(await result!.text()).toBe('image-data');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('fetches and caches image on cache miss with network success', async () => {
      const networkImage = createMockResponse('network-image');
      const imageCache = {
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => true),
        keys: vi.fn(async () => []),
      };

      setupCachesOpen({ 'images-v2': imageCache });
      globalThis.fetch = vi.fn(async () => networkImage);

      const request = createRequest('https://example.com/PWACharSheet/icons/hero.png');
      const result = await handleFetch(request, defaultConfig);

      expect(result).toBe(networkImage);
      expect(globalThis.fetch).toHaveBeenCalled();
      expect(imageCache.put).toHaveBeenCalled();
    });

    it('returns 503 for image when cache miss and network fails', async () => {
      const imageCache = {
        match: vi.fn(async () => undefined),
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => true),
        keys: vi.fn(async () => []),
      };

      setupCachesOpen({ 'images-v2': imageCache });
      globalThis.fetch = vi.fn(async () => { throw new TypeError('Failed to fetch'); });

      const request = createRequest('https://example.com/PWACharSheet/icons/hero.png');
      const result = await handleFetch(request, defaultConfig);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(503);
    });
  });

  // --- Same-origin font tests ---

  describe('same-origin font requests', () => {
    it('routes font requests to font cache', async () => {
      const cachedFont = createMockResponse('font-data');
      const fontCache = {
        match: vi.fn(async () => cachedFont),
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => true),
        keys: vi.fn(async () => []),
      };

      setupCachesOpen({ 'fonts-v2': fontCache });
      globalThis.fetch = vi.fn();

      const request = createRequest('https://example.com/PWACharSheet/assets/font.woff2');
      const result = await handleFetch(request, defaultConfig);

      // Result is a clone of the cached response (not the same reference)
      expect(result!.status).toBe(cachedFont.status);
      expect(await result!.text()).toBe('font-data');
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  // --- Cross-origin tests ---

  describe('cross-origin requests', () => {
    it('returns null for cross-origin URLs', async () => {
      globalThis.caches = {
        open: vi.fn(async () => createEmptyMockCache()),
        match: vi.fn(async () => undefined),
      } as unknown as CacheStorage;
      globalThis.fetch = vi.fn();

      const request = createRequest('https://cdn.other.com/assets/lib.js');
      const result = await handleFetch(request, defaultConfig);

      expect(result).toBeNull();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  // --- Non-matching same-origin tests ---

  describe('non-matching same-origin requests', () => {
    it('returns null for same-origin non-matching URL (e.g., .json)', async () => {
      globalThis.caches = {
        open: vi.fn(async () => createEmptyMockCache()),
        match: vi.fn(async () => undefined),
      } as unknown as CacheStorage;
      globalThis.fetch = vi.fn();

      const request = createRequest('https://example.com/PWACharSheet/api/data.json');
      const result = await handleFetch(request, defaultConfig);

      expect(result).toBeNull();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });
});
