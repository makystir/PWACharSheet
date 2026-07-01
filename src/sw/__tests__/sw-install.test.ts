import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PrecacheEntry } from '../types';
import { handleInstall } from '../install';

describe('handleInstall', () => {
  let originalCaches: typeof globalThis.caches;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalCaches = globalThis.caches;
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function createMockCache(
    existing: Map<string, Response> = new Map()
  ) {
    const stored = new Map<string, Response>(existing);
    return {
      match: vi.fn(async (url: string) => stored.get(url) ?? null),
      put: vi.fn(async (url: string, response: Response) => {
        stored.put?.(url, response);
        stored.set(url, response);
      }),
      stored,
    };
  }

  function setupCaches(mockCache: ReturnType<typeof createMockCache>) {
    globalThis.caches = {
      open: vi.fn(async () => mockCache),
    } as unknown as CacheStorage;
  }

  function setupFetchSuccess() {
    globalThis.fetch = vi.fn(async () =>
      new Response(new Blob(['content']), {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
      })
    );
  }

  // Test 1: Install with empty manifest succeeds, no fetches
  it('succeeds with empty manifest and makes no fetches', async () => {
    const mockCache = createMockCache();
    setupCaches(mockCache);
    globalThis.fetch = vi.fn();

    await handleInstall([], 'precache-v2');

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mockCache.put).not.toHaveBeenCalled();
  });

  // Test 2: Install with 3 entries, all fetches succeed → all cached with x-precache-revision header
  it('caches all entries with x-precache-revision header when all fetches succeed', async () => {
    const manifest: PrecacheEntry[] = [
      { url: '/PWACharSheet/assets/index-abc123.js', revision: 'abc12345' },
      { url: '/PWACharSheet/assets/style-def456.css', revision: 'def45678' },
      { url: '/PWACharSheet/index.html', revision: '11223344' },
    ];

    const mockCache = createMockCache();
    setupCaches(mockCache);
    setupFetchSuccess();

    await handleInstall(manifest, 'precache-v2');

    // Verify all 3 entries were fetched
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);

    // Verify all 3 entries were cached
    expect(mockCache.put).toHaveBeenCalledTimes(3);

    // Verify each call has the correct URL and x-precache-revision header
    for (let i = 0; i < manifest.length; i++) {
      const [url, response] = mockCache.put.mock.calls[i];
      expect(url).toBe(manifest[i].url);
      expect(response.headers.get('x-precache-revision')).toBe(manifest[i].revision);
    }
  });

  // Test 3: Install with one entry returning 404 → rejects
  it('rejects when a fetch returns a 404 status', async () => {
    const manifest: PrecacheEntry[] = [
      { url: '/PWACharSheet/assets/index.js', revision: 'aabbccdd' },
      { url: '/PWACharSheet/assets/missing.css', revision: '11223344' },
    ];

    const mockCache = createMockCache();
    setupCaches(mockCache);

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('missing.css')) {
        return new Response(null, { status: 404, statusText: 'Not Found' });
      }
      return new Response(new Blob(['content']), {
        status: 200,
        statusText: 'OK',
      });
    });

    await expect(handleInstall(manifest, 'precache-v2')).rejects.toThrow(
      /Failed to fetch.*404/
    );
  });

  // Test 4: Install with one entry throwing network error → rejects
  it('rejects when a fetch throws a network error', async () => {
    const manifest: PrecacheEntry[] = [
      { url: '/PWACharSheet/assets/index.js', revision: 'aabbccdd' },
      { url: '/PWACharSheet/assets/offline.css', revision: '11223344' },
    ];

    const mockCache = createMockCache();
    setupCaches(mockCache);

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('offline.css')) {
        throw new TypeError('Failed to fetch');
      }
      return new Response(new Blob(['content']), {
        status: 200,
        statusText: 'OK',
      });
    });

    await expect(handleInstall(manifest, 'precache-v2')).rejects.toThrow(
      'Failed to fetch'
    );
  });

  // Test 5: Differential - entry already cached with matching revision → skipped
  it('skips entries already cached with a matching revision', async () => {
    const manifest: PrecacheEntry[] = [
      { url: '/PWACharSheet/assets/cached.js', revision: 'rev11111' },
      { url: '/PWACharSheet/assets/new.js', revision: 'rev22222' },
    ];

    // Simulate cached.js already existing with matching revision
    const cachedResponse = new Response(new Blob(['old-content']), {
      status: 200,
      headers: new Headers({ 'x-precache-revision': 'rev11111' }),
    });

    const existing = new Map<string, Response>();
    existing.set('/PWACharSheet/assets/cached.js', cachedResponse);
    const mockCache = createMockCache(existing);
    setupCaches(mockCache);
    setupFetchSuccess();

    await handleInstall(manifest, 'precache-v2');

    // Only the new entry should be fetched
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('/PWACharSheet/assets/new.js');

    // Only the new entry should be cached
    expect(mockCache.put).toHaveBeenCalledTimes(1);
    expect(mockCache.put.mock.calls[0][0]).toBe('/PWACharSheet/assets/new.js');
  });

  // Test 6: Differential - entry cached with different revision → fetched again
  it('re-fetches entries cached with a different revision', async () => {
    const manifest: PrecacheEntry[] = [
      { url: '/PWACharSheet/assets/updated.js', revision: 'newrev11' },
    ];

    // Simulate updated.js already existing but with a DIFFERENT revision
    const cachedResponse = new Response(new Blob(['old-content']), {
      status: 200,
      headers: new Headers({ 'x-precache-revision': 'oldrev99' }),
    });

    const existing = new Map<string, Response>();
    existing.set('/PWACharSheet/assets/updated.js', cachedResponse);
    const mockCache = createMockCache(existing);
    setupCaches(mockCache);
    setupFetchSuccess();

    await handleInstall(manifest, 'precache-v2');

    // The entry should be fetched again because the revision differs
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('/PWACharSheet/assets/updated.js');

    // And stored with the new revision header
    expect(mockCache.put).toHaveBeenCalledTimes(1);
    const [url, response] = mockCache.put.mock.calls[0];
    expect(url).toBe('/PWACharSheet/assets/updated.js');
    expect(response.headers.get('x-precache-revision')).toBe('newrev11');
  });
});
