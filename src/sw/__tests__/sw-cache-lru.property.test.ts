import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { handleFetch, type FetchHandlerConfig } from '../fetch';

/**
 * Feature: offline-sw-strategy
 * Property 10: Image cache LRU eviction
 *
 * Validates: Requirements 7.3
 *
 * For any sequence of image cache insertions, when the image cache contains
 * 60 entries and a new entry is added, the least-recently-used entry SHALL
 * be evicted before the new entry is stored, maintaining a maximum of 60 entries.
 */

// --- Generators ---

/** Generate a valid path segment for image URLs */
const arbPathSegment = fc.string({
  minLength: 1,
  maxLength: 8,
  unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
});

/** Generate a valid image file extension */
const arbImageExtension = fc.constantFrom('.svg', '.png', '.jpg', '.webp', '.ico');

/** Generate a unique image URL path */
const arbImageUrl = fc
  .tuple(arbPathSegment, arbPathSegment, arbImageExtension)
  .map(([dir, name, ext]) => `https://example.com/images/${dir}/${name}${ext}`);

/**
 * Generate a sequence of unique image URLs with length > 60.
 * This ensures we trigger LRU eviction.
 */
const arbImageSequence = fc
  .uniqueArray(
    fc.tuple(arbPathSegment, arbPathSegment, arbImageExtension, fc.nat({ max: 9999 })),
    { minLength: 61, maxLength: 80 }
  )
  .map((tuples) =>
    tuples.map(([dir, name, ext, id]) => `https://example.com/images/${dir}/${name}-${id}${ext}`)
  )
  // Ensure uniqueness after mapping (the id suffix helps but double-check)
  .map((urls) => [...new Set(urls)])
  .filter((urls) => urls.length > 60);

// --- Test Helpers ---

const IMAGE_CACHE_LIMIT = 60;
const ORIGIN = 'https://example.com';

function createConfig(): FetchHandlerConfig {
  return {
    precacheName: 'precache-v2',
    imageCacheName: 'images-v2',
    fontCacheName: 'fonts-v2',
    imageCacheLimit: IMAGE_CACHE_LIMIT,
    manifestUrls: new Set<string>(),
    origin: ORIGIN,
    appShellUrl: '/index.html',
    offlineFallbackUrl: '/offline.html',
  };
}

/**
 * Creates a mock Cache that tracks entries in insertion order.
 * Uses a Map to simulate cache.keys() returning entries in insertion order.
 */
function createMockCache() {
  // Use a Map to track entries in insertion order
  const entries = new Map<string, Response>();

  const mockCache = {
    match: vi.fn((request: Request | string) => {
      const url = typeof request === 'string' ? request : request.url;
      const entry = entries.get(url);
      return Promise.resolve(entry ? entry.clone() : undefined);
    }),
    put: vi.fn((request: Request | string, response: Response) => {
      const url = typeof request === 'string' ? request : request.url;
      // Insert at end (Map preserves insertion order)
      entries.set(url, response);
      return Promise.resolve();
    }),
    delete: vi.fn((request: Request | string) => {
      const url = typeof request === 'string' ? request : request.url;
      const existed = entries.has(url);
      entries.delete(url);
      return Promise.resolve(existed);
    }),
    keys: vi.fn(() => {
      // Return requests in insertion order (Map iteration order)
      const requests = [...entries.keys()].map((url) => new Request(url));
      return Promise.resolve(requests);
    }),
  };

  return { mockCache, entries };
}

// --- Tests ---

describe('Feature: offline-sw-strategy, Property 10: Image cache LRU eviction', () => {
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

  it('maintains a maximum of 60 entries after inserting more than 60 unique images', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageSequence, async (imageUrls) => {
        const { mockCache, entries } = createMockCache();
        const config = createConfig();

        // Mock caches.open to return our tracking mock for the image cache
        globalThis.caches = {
          open: vi.fn((name: string) => {
            if (name === config.imageCacheName) {
              return Promise.resolve(mockCache as unknown as Cache);
            }
            // Return an empty cache for other names
            return Promise.resolve({
              match: () => Promise.resolve(undefined),
              put: () => Promise.resolve(),
              delete: () => Promise.resolve(false),
              keys: () => Promise.resolve([]),
            } as unknown as Cache);
          }),
          match: () => Promise.resolve(undefined),
        } as unknown as CacheStorage;

        // Mock fetch to return a successful image response for all requests
        globalThis.fetch = vi.fn(() =>
          Promise.resolve(
            new Response(new Blob(['fake-image-data']), {
              status: 200,
              statusText: 'OK',
              headers: new Headers({ 'content-type': 'image/png' }),
            })
          )
        );

        // Process each image URL sequentially through handleFetch
        for (const url of imageUrls) {
          const request = new Request(url);
          await handleFetch(request, config);
        }

        // Property: cache size should never exceed 60
        expect(entries.size).toBeLessThanOrEqual(IMAGE_CACHE_LIMIT);

        // With more than 60 unique URLs (all cache misses), the cache should be exactly 60
        expect(entries.size).toBe(IMAGE_CACHE_LIMIT);
      }),
      { numRuns: 100 }
    );
  });

  it('evicts the least-recently-used (oldest) entries when cache exceeds limit', async () => {
    await fc.assert(
      fc.asyncProperty(arbImageSequence, async (imageUrls) => {
        const { mockCache, entries } = createMockCache();
        const config = createConfig();

        globalThis.caches = {
          open: vi.fn((name: string) => {
            if (name === config.imageCacheName) {
              return Promise.resolve(mockCache as unknown as Cache);
            }
            return Promise.resolve({
              match: () => Promise.resolve(undefined),
              put: () => Promise.resolve(),
              delete: () => Promise.resolve(false),
              keys: () => Promise.resolve([]),
            } as unknown as Cache);
          }),
          match: () => Promise.resolve(undefined),
        } as unknown as CacheStorage;

        globalThis.fetch = vi.fn(() =>
          Promise.resolve(
            new Response(new Blob(['fake-image-data']), {
              status: 200,
              statusText: 'OK',
              headers: new Headers({ 'content-type': 'image/png' }),
            })
          )
        );

        // Process all image URLs sequentially
        for (const url of imageUrls) {
          const request = new Request(url);
          await handleFetch(request, config);
        }

        // The oldest entries (those inserted first) should have been evicted.
        // Only the last 60 URLs should remain in the cache.
        const expectedRetainedUrls = new Set(imageUrls.slice(imageUrls.length - IMAGE_CACHE_LIMIT));
        const actualCachedUrls = new Set(entries.keys());

        // Every retained URL should be in the expected set
        for (const url of actualCachedUrls) {
          expect(expectedRetainedUrls.has(url)).toBe(true);
        }

        // Every expected URL should be in the cache
        for (const url of expectedRetainedUrls) {
          expect(actualCachedUrls.has(url)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
