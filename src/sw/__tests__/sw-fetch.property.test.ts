import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { handleFetch, type FetchHandlerConfig } from '../fetch';

/**
 * Feature: offline-sw-strategy
 * Property 9: Request routing by file extension
 *
 * Validates: Requirements 7.1, 7.2
 *
 * For any same-origin request URL with an image extension (svg, png, jpg, webp, ico),
 * the service worker SHALL route it to the image cache-first strategy.
 * For any same-origin request URL with a font extension (woff2, woff, ttf, otf),
 * the service worker SHALL route it to the font cache-first strategy.
 */

// --- Generators ---

/** Generate a valid URL path segment (alphanumeric + dash/underscore) */
const arbPathSegment = fc.string({
  minLength: 1,
  maxLength: 12,
  unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')
  ),
});

/** Generate image extensions */
const arbImageExtension = fc.constantFrom('.svg', '.png', '.jpg', '.webp', '.ico');

/** Generate font extensions */
const arbFontExtension = fc.constantFrom('.woff2', '.woff', '.ttf', '.otf');

/** Generate a random filename (without extension) */
const arbFilename = fc.string({
  minLength: 1,
  maxLength: 16,
  unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')
  ),
});

/** Generate a same-origin URL path with a given extension */
const arbUrlPath = (extArb: fc.Arbitrary<string>) =>
  fc.tuple(
    fc.array(arbPathSegment, { minLength: 1, maxLength: 3 }),
    arbFilename,
    extArb,
  ).map(([segments, filename, ext]) =>
    `/PWACharSheet/${segments.join('/')}/${filename}${ext}`
  );

/** Generate a same-origin image URL path (not in manifest) */
const arbImagePath = arbUrlPath(arbImageExtension);

/** Generate a same-origin font URL path (not in manifest) */
const arbFontPath = arbUrlPath(arbFontExtension);

// --- Helpers ---

const TEST_ORIGIN = 'https://example.com';
const IMAGE_CACHE_NAME = 'images-v2';
const FONT_CACHE_NAME = 'fonts-v2';

function makeConfig(overrides?: Partial<FetchHandlerConfig>): FetchHandlerConfig {
  return {
    precacheName: 'precache-v2',
    imageCacheName: IMAGE_CACHE_NAME,
    fontCacheName: FONT_CACHE_NAME,
    imageCacheLimit: 60,
    manifestUrls: new Set<string>(),
    origin: TEST_ORIGIN,
    appShellUrl: '/PWACharSheet/index.html',
    offlineFallbackUrl: '/PWACharSheet/offline.html',
    ...overrides,
  };
}

function makeRequest(path: string): Request {
  return new Request(`${TEST_ORIGIN}${path}`, { mode: 'same-origin' });
}

// --- Tests ---

describe('Feature: offline-sw-strategy, Property 9: Request routing by file extension', () => {
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

  it('routes image extension URLs to the image cache strategy', async () => {
    await fc.assert(
      fc.asyncProperty(arbImagePath, async (imagePath) => {
        // Track which cache name is opened
        const openedCaches: string[] = [];

        const mockCache = {
          match: () => Promise.resolve(
            new Response(new Blob(['cached-image']), { status: 200 })
          ),
          put: () => Promise.resolve(),
          delete: () => Promise.resolve(true),
          keys: () => Promise.resolve([]),
        };

        globalThis.caches = {
          open: (name: string) => {
            openedCaches.push(name);
            return Promise.resolve(mockCache);
          },
          match: () => Promise.resolve(undefined),
        } as unknown as CacheStorage;

        globalThis.fetch = () =>
          Promise.resolve(new Response(new Blob(['fetched']), { status: 200 }));

        const config = makeConfig();
        const request = makeRequest(imagePath);

        const response = await handleFetch(request, config);

        // Verify: the response is not null (request was intercepted)
        expect(response).not.toBeNull();

        // Verify: the image cache was opened
        expect(openedCaches).toContain(IMAGE_CACHE_NAME);

        // Verify: the font cache was NOT opened
        expect(openedCaches).not.toContain(FONT_CACHE_NAME);
      }),
      { numRuns: 100 }
    );
  });

  it('routes font extension URLs to the font cache strategy', async () => {
    await fc.assert(
      fc.asyncProperty(arbFontPath, async (fontPath) => {
        // Track which cache name is opened
        const openedCaches: string[] = [];

        const mockCache = {
          match: () => Promise.resolve(
            new Response(new Blob(['cached-font']), { status: 200 })
          ),
          put: () => Promise.resolve(),
          delete: () => Promise.resolve(true),
          keys: () => Promise.resolve([]),
        };

        globalThis.caches = {
          open: (name: string) => {
            openedCaches.push(name);
            return Promise.resolve(mockCache);
          },
          match: () => Promise.resolve(undefined),
        } as unknown as CacheStorage;

        globalThis.fetch = () =>
          Promise.resolve(new Response(new Blob(['fetched']), { status: 200 }));

        const config = makeConfig();
        const request = makeRequest(fontPath);

        const response = await handleFetch(request, config);

        // Verify: the response is not null (request was intercepted)
        expect(response).not.toBeNull();

        // Verify: the font cache was opened
        expect(openedCaches).toContain(FONT_CACHE_NAME);

        // Verify: the image cache was NOT opened
        expect(openedCaches).not.toContain(IMAGE_CACHE_NAME);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: offline-sw-strategy
 * Property 11: Cross-origin request passthrough
 *
 * Validates: Requirements 7.5
 *
 * For any request whose origin differs from the service worker's origin,
 * the service worker SHALL not intercept, cache, or modify the request.
 */

describe('Feature: offline-sw-strategy, Property 11: Cross-origin request passthrough', () => {
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

  // --- Generators ---

  /** Generate a protocol that differs from the SW origin or is a valid protocol */
  const arbProtocol = fc.constantFrom('https', 'http');

  /** Generate a domain name (e.g., "foo.bar.com") */
  const arbDomainLabel = fc.string({
    minLength: 1,
    maxLength: 10,
    unit: fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
    ),
  });

  const arbDomain = fc.tuple(
    arbDomainLabel,
    fc.constantFrom('.com', '.org', '.net', '.io', '.dev', '.co.uk'),
  ).map(([label, tld]) => `${label}${tld}`);

  /** Generate an optional port (non-standard) */
  const arbPort = fc.oneof(
    fc.constant(''),
    fc.integer({ min: 1024, max: 65535 }).map((p) => `:${p}`),
  );

  /** Generate a path segment */
  const arbPathSeg = fc.string({
    minLength: 1,
    maxLength: 12,
    unit: fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')
    ),
  });

  /** Generate a URL path */
  const arbPath = fc.array(arbPathSeg, { minLength: 0, maxLength: 4 })
    .map((segs) => '/' + segs.join('/'));

  /** Generate any file extension */
  const arbExtension = fc.constantFrom(
    '.html', '.js', '.css', '.svg', '.png', '.jpg', '.webp', '.ico',
    '.woff2', '.woff', '.ttf', '.otf', '.json', '.xml', ''
  );

  /**
   * Generate a cross-origin URL whose origin differs from the SW origin.
   * The SW origin is 'https://example.com'.
   * We ensure the generated origin is different by:
   * - Using a different domain
   * - Using a different protocol (http vs https)
   * - Using a non-standard port
   */
  const arbCrossOriginUrl = fc.tuple(
    arbProtocol,
    arbDomain,
    arbPort,
    arbPath,
    arbExtension,
  ).map(([protocol, domain, port, path, ext]) => {
    const fullPath = ext ? `${path}/file${ext}` : path;
    return `${protocol}://${domain}${port}${fullPath}`;
  }).filter((url) => {
    // Ensure the origin is actually different from our SW origin
    try {
      const parsed = new URL(url);
      return parsed.origin !== TEST_ORIGIN;
    } catch {
      return false;
    }
  });

  it('returns null for cross-origin requests (no interception)', async () => {
    await fc.assert(
      fc.asyncProperty(arbCrossOriginUrl, async (crossOriginUrl) => {
        // Track if any cache APIs are called
        let cachesOpenCalled = false;
        let cachesMatchCalled = false;

        globalThis.caches = {
          open: () => {
            cachesOpenCalled = true;
            return Promise.resolve({
              match: () => Promise.resolve(undefined),
              put: () => Promise.resolve(),
              delete: () => Promise.resolve(true),
              keys: () => Promise.resolve([]),
            });
          },
          match: () => {
            cachesMatchCalled = true;
            return Promise.resolve(undefined);
          },
        } as unknown as CacheStorage;

        // Track if fetch is called by the handler
        let fetchCalled = false;
        globalThis.fetch = () => {
          fetchCalled = true;
          return Promise.resolve(new Response(new Blob(['data']), { status: 200 }));
        };

        const config = makeConfig();
        const request = new Request(crossOriginUrl);

        const result = await handleFetch(request, config);

        // Verify: handleFetch returns null (no interception)
        expect(result).toBeNull();

        // Verify: no cache APIs were called
        expect(cachesOpenCalled).toBe(false);
        expect(cachesMatchCalled).toBe(false);

        // Verify: fetch was not called by the handler
        expect(fetchCalled).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('passes through regardless of request method or mode', async () => {
    // In no-cors mode, only GET, HEAD, and POST are allowed.
    // Generate valid (method, mode) combinations to avoid Request constructor errors.
    const arbMethodAndMode = fc.oneof(
      // no-cors only allows GET, HEAD, POST
      fc.tuple(
        fc.constantFrom('GET', 'POST', 'HEAD'),
        fc.constant('no-cors' as RequestMode),
      ),
      // cors and same-origin allow any method
      fc.tuple(
        fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'),
        fc.constantFrom('cors' as RequestMode, 'same-origin' as RequestMode),
      ),
    );

    await fc.assert(
      fc.asyncProperty(
        arbCrossOriginUrl,
        arbMethodAndMode,
        async (crossOriginUrl, [method, mode]) => {
          let cachesOpenCalled = false;

          globalThis.caches = {
            open: () => {
              cachesOpenCalled = true;
              return Promise.resolve({
                match: () => Promise.resolve(undefined),
                put: () => Promise.resolve(),
                delete: () => Promise.resolve(true),
                keys: () => Promise.resolve([]),
              });
            },
            match: () => Promise.resolve(undefined),
          } as unknown as CacheStorage;

          let fetchCalled = false;
          globalThis.fetch = () => {
            fetchCalled = true;
            return Promise.resolve(new Response(null, { status: 200 }));
          };

          const config = makeConfig();
          const request = new Request(crossOriginUrl, { method, mode });

          const result = await handleFetch(request, config);

          // Cross-origin requests should always return null
          expect(result).toBeNull();
          expect(cachesOpenCalled).toBe(false);
          expect(fetchCalled).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
