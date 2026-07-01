import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import type { PrecacheEntry } from '../types';
import { handleInstall } from '../install';

/**
 * Feature: offline-sw-strategy
 * Property 4: Install caches all manifest entries
 *
 * Validates: Requirements 2.1
 *
 * For any precache manifest where all network fetches succeed,
 * after the install event completes, the precache cache SHALL
 * contain a response for every URL in the manifest.
 */

// --- Generators ---

/** Generate a valid URL path segment (alphanumeric + dash/underscore) */
const arbPathSegment = fc.string({ minLength: 1, maxLength: 12, unit: fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
) });

/** Generate a valid file extension */
const arbExtension = fc.constantFrom('.js', '.css', '.html', '.woff2', '.woff');

/** Generate a hex revision string (8 chars like real manifests) */
const arbRevision = fc.string({ minLength: 8, maxLength: 8, unit: fc.constantFrom(
  ...'0123456789abcdef'.split('')
) });

/** Generate a single PrecacheEntry with a plausible URL and revision */
const arbPrecacheEntry: fc.Arbitrary<PrecacheEntry> = fc.tuple(
  fc.array(arbPathSegment, { minLength: 1, maxLength: 3 }),
  arbPathSegment,
  arbExtension,
  arbRevision
).map(([segments, filename, ext, revision]) => ({
  url: `/PWACharSheet/${segments.join('/')}/${filename}${ext}`,
  revision,
}));

/** Generate a manifest (non-empty array of PrecacheEntries with unique URLs) */
const arbManifest: fc.Arbitrary<PrecacheEntry[]> = fc
  .array(arbPrecacheEntry, { minLength: 1, maxLength: 20 })
  .map((entries) => {
    // Deduplicate by URL to avoid ambiguous cache.put expectations
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.url)) return false;
      seen.add(e.url);
      return true;
    });
  })
  .filter((entries) => entries.length > 0);

// --- Test ---

describe('Feature: offline-sw-strategy, Property 4: Install caches all manifest entries', () => {
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

  it('caches a response for every URL in the manifest when all fetches succeed', async () => {
    await fc.assert(
      fc.asyncProperty(arbManifest, async (manifest) => {
        // Create fresh mocks for each iteration to ensure isolation
        const putCalls: Array<[string, Response]> = [];

        const mockCache = {
          match: () => Promise.resolve(null), // Nothing previously cached
          put: (url: string, response: Response) => {
            putCalls.push([url, response]);
            return Promise.resolve();
          },
        };

        globalThis.caches = {
          open: () => Promise.resolve(mockCache),
        } as unknown as CacheStorage;

        globalThis.fetch = (input: RequestInfo | URL) => {
          const url = typeof input === 'string' ? input : input.toString();
          return Promise.resolve(
            new Response(new Blob(['mock-body']), {
              status: 200,
              statusText: 'OK',
              headers: new Headers({ 'content-type': 'application/octet-stream' }),
            })
          );
        };

        const cacheName = 'precache-v2';

        // Execute the install handler
        await handleInstall(manifest, cacheName);

        // Verify: cache.put was called for every manifest entry
        const cachedUrls = new Set(putCalls.map(([url]) => url));

        for (const entry of manifest) {
          expect(cachedUrls.has(entry.url)).toBe(true);
        }

        // Verify: the number of put calls equals the manifest length
        expect(putCalls.length).toBe(manifest.length);

        // Verify: each cached response has the correct x-precache-revision header
        for (const entry of manifest) {
          const putCall = putCalls.find(([url]) => url === entry.url);
          expect(putCall).toBeDefined();
          const response = putCall![1];
          expect(response.headers.get('x-precache-revision')).toBe(entry.revision);
        }
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: offline-sw-strategy
 * Property 5: Install fails on any non-ok fetch
 *
 * Validates: Requirements 2.2
 *
 * For any precache manifest where at least one entry's fetch returns a non-ok
 * status or throws a network error, the install event SHALL reject (preventing activation).
 */

describe('Feature: offline-sw-strategy, Property 5: Install fails on any non-ok fetch', () => {
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

  /** Generate a non-ok HTTP status code (400-599) */
  const arbNonOkStatus = fc.integer({ min: 400, max: 599 });

  /** Type of failure to inject: either a non-ok response or a network error */
  const arbFailureType = fc.constantFrom('non-ok-response', 'network-error') as fc.Arbitrary<'non-ok-response' | 'network-error'>;

  /**
   * For a given manifest, generate a non-empty set of indices representing
   * which entries will fail during fetch.
   */
  const arbFailureIndices = (manifestLength: number) =>
    fc
      .uniqueArray(fc.integer({ min: 0, max: manifestLength - 1 }), { minLength: 1 })
      .filter((arr) => arr.length >= 1);

  it('rejects when at least one fetch returns a non-ok status', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbManifest,
        arbNonOkStatus,
        async (manifest, failStatus) => {
          // Pick a random index to fail (deterministic per run via fast-check)
          const failIndex = failStatus % manifest.length;

          const mockCache = {
            match: () => Promise.resolve(null),
            put: () => Promise.resolve(),
          };

          globalThis.caches = {
            open: () => Promise.resolve(mockCache),
          } as unknown as CacheStorage;

          globalThis.fetch = (input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input.toString();
            const entryIndex = manifest.findIndex((e) => e.url === url);

            if (entryIndex === failIndex) {
              // Return a non-ok response for the targeted entry
              return Promise.resolve(
                new Response(null, {
                  status: failStatus,
                  statusText: 'Error',
                })
              );
            }

            // All other entries succeed
            return Promise.resolve(
              new Response(new Blob(['mock-body']), {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/octet-stream' }),
              })
            );
          };

          // handleInstall should reject
          await expect(handleInstall(manifest, 'precache-v2')).rejects.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when at least one fetch throws a network error', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbManifest,
        fc.integer({ min: 0, max: 100 }),
        async (manifest, seed) => {
          // Pick a random index to fail
          const failIndex = seed % manifest.length;

          const mockCache = {
            match: () => Promise.resolve(null),
            put: () => Promise.resolve(),
          };

          globalThis.caches = {
            open: () => Promise.resolve(mockCache),
          } as unknown as CacheStorage;

          globalThis.fetch = (input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input.toString();
            const entryIndex = manifest.findIndex((e) => e.url === url);

            if (entryIndex === failIndex) {
              // Simulate a network error (fetch throws)
              return Promise.reject(new TypeError('Failed to fetch'));
            }

            // All other entries succeed
            return Promise.resolve(
              new Response(new Blob(['mock-body']), {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/octet-stream' }),
              })
            );
          };

          // handleInstall should reject
          await expect(handleInstall(manifest, 'precache-v2')).rejects.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects when multiple entries have mixed failure types', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbManifest.filter((m) => m.length >= 2),
        arbFailureType,
        arbNonOkStatus,
        async (manifest, failureType, failStatus) => {
          // Fail at least 1 entry (use failStatus to pick index)
          const failIndex = failStatus % manifest.length;

          const mockCache = {
            match: () => Promise.resolve(null),
            put: () => Promise.resolve(),
          };

          globalThis.caches = {
            open: () => Promise.resolve(mockCache),
          } as unknown as CacheStorage;

          globalThis.fetch = (input: RequestInfo | URL) => {
            const url = typeof input === 'string' ? input : input.toString();
            const entryIndex = manifest.findIndex((e) => e.url === url);

            if (entryIndex === failIndex) {
              if (failureType === 'network-error') {
                return Promise.reject(new TypeError('Failed to fetch'));
              }
              return Promise.resolve(
                new Response(null, {
                  status: failStatus,
                  statusText: 'Server Error',
                })
              );
            }

            return Promise.resolve(
              new Response(new Blob(['mock-body']), {
                status: 200,
                statusText: 'OK',
                headers: new Headers({ 'content-type': 'application/octet-stream' }),
              })
            );
          };

          // handleInstall should reject regardless of failure type
          await expect(handleInstall(manifest, 'precache-v2')).rejects.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Feature: offline-sw-strategy
 * Property 6: Differential install fetches only changed entries
 *
 * Validates: Requirements 2.3
 *
 * For any pair of old and new precache manifests, the install event SHALL fetch
 * only those entries whose URL is new or whose revision differs from the previously
 * cached version, and SHALL skip entries with matching revisions already in cache.
 */

describe('Feature: offline-sw-strategy, Property 6: Differential install fetches only changed entries', () => {
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

  /** Generate a hex revision string (8 chars) */
  const arbRevision = fc.string({ minLength: 8, maxLength: 8, unit: fc.constantFrom(
    ...'0123456789abcdef'.split('')
  ) });

  /** Generate a valid path segment */
  const arbPathSegment = fc.string({ minLength: 1, maxLength: 10, unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  ) });

  /** Generate a file extension */
  const arbExtension = fc.constantFrom('.js', '.css', '.html', '.woff2');

  /** Generate a unique URL */
  const arbUrl = fc.tuple(
    fc.array(arbPathSegment, { minLength: 1, maxLength: 2 }),
    arbPathSegment,
    arbExtension
  ).map(([segments, filename, ext]) => `/PWACharSheet/${segments.join('/')}/${filename}${ext}`);

  /**
   * Generate a pair of old and new manifests where:
   * - Some entries are unchanged (same URL, same revision)
   * - Some entries have changed revisions (same URL, different revision)
   * - Some entries are new (URL only in new manifest)
   */
  const arbManifestPair = fc.record({
    unchanged: fc.array(
      fc.tuple(arbUrl, arbRevision),
      { minLength: 0, maxLength: 5 }
    ),
    changed: fc.array(
      fc.tuple(arbUrl, arbRevision, arbRevision).filter(([, oldRev, newRev]) => oldRev !== newRev),
      { minLength: 0, maxLength: 5 }
    ),
    newEntries: fc.array(
      fc.tuple(arbUrl, arbRevision),
      { minLength: 0, maxLength: 5 }
    ),
  }).filter(({ unchanged, changed, newEntries }) => {
    // Ensure we have at least one entry in the new manifest
    return (unchanged.length + changed.length + newEntries.length) > 0;
  }).map(({ unchanged, changed, newEntries }) => {
    // Deduplicate URLs across all groups
    const usedUrls = new Set<string>();
    const dedup = <T extends [string, ...unknown[]]>(entries: T[]): T[] =>
      entries.filter((e) => {
        if (usedUrls.has(e[0])) return false;
        usedUrls.add(e[0]);
        return true;
      });

    const dedupUnchanged = dedup(unchanged);
    const dedupChanged = dedup(changed);
    const dedupNew = dedup(newEntries);

    // Build old manifest: unchanged entries + changed entries (with old revision)
    const oldManifest: PrecacheEntry[] = [
      ...dedupUnchanged.map(([url, revision]) => ({ url, revision })),
      ...dedupChanged.map(([url, oldRevision]) => ({ url, revision: oldRevision })),
    ];

    // Build new manifest: unchanged + changed (with new revision) + new entries
    const newManifest: PrecacheEntry[] = [
      ...dedupUnchanged.map(([url, revision]) => ({ url, revision })),
      ...dedupChanged.map(([url, , newRevision]) => ({ url, revision: newRevision })),
      ...dedupNew.map(([url, revision]) => ({ url, revision })),
    ];

    // Expected fetches: changed entries + new entries
    const expectedFetchUrls = new Set([
      ...dedupChanged.map(([url]) => url),
      ...dedupNew.map(([url]) => url),
    ]);

    // URLs that should NOT be fetched (unchanged entries)
    const skippedUrls = new Set(dedupUnchanged.map(([url]) => url));

    return { oldManifest, newManifest, expectedFetchUrls, skippedUrls };
  }).filter(({ newManifest }) => newManifest.length > 0);

  it('fetches only new or changed entries, skipping entries with matching revisions', async () => {
    await fc.assert(
      fc.asyncProperty(arbManifestPair, async ({ oldManifest, newManifest, expectedFetchUrls, skippedUrls }) => {
        // Track which URLs fetch() is called for
        const fetchedUrls: string[] = [];

        // Build a lookup for old manifest entries (simulates what's already cached)
        const oldManifestMap = new Map(oldManifest.map((e) => [e.url, e.revision]));

        const mockCache = {
          match: (url: string) => {
            const cachedRevision = oldManifestMap.get(url);
            if (cachedRevision !== undefined) {
              // Return a response with the x-precache-revision header set to the old revision
              return Promise.resolve(
                new Response(new Blob(['cached-body']), {
                  status: 200,
                  statusText: 'OK',
                  headers: new Headers({ 'x-precache-revision': cachedRevision }),
                })
              );
            }
            // URL not in old manifest → not cached
            return Promise.resolve(null);
          },
          put: () => Promise.resolve(),
        };

        globalThis.caches = {
          open: () => Promise.resolve(mockCache),
        } as unknown as CacheStorage;

        globalThis.fetch = (input: RequestInfo | URL) => {
          const url = typeof input === 'string' ? input : input.toString();
          fetchedUrls.push(url);
          return Promise.resolve(
            new Response(new Blob(['new-body']), {
              status: 200,
              statusText: 'OK',
              headers: new Headers({ 'content-type': 'application/octet-stream' }),
            })
          );
        };

        const cacheName = 'precache-v2';

        // Execute the install handler with the new manifest
        await handleInstall(newManifest, cacheName);

        const fetchedUrlSet = new Set(fetchedUrls);

        // Verify: all expected URLs (changed + new) were fetched
        for (const url of expectedFetchUrls) {
          expect(fetchedUrlSet.has(url)).toBe(true);
        }

        // Verify: unchanged entries were NOT fetched
        for (const url of skippedUrls) {
          expect(fetchedUrlSet.has(url)).toBe(false);
        }

        // Verify: total fetches equals only changed + new entries
        expect(fetchedUrls.length).toBe(expectedFetchUrls.size);
      }),
      { numRuns: 100 }
    );
  });
});
