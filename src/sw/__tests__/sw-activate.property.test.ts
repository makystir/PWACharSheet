import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import type { PrecacheEntry } from '../types';
import { handleActivate } from '../activate';

/**
 * Feature: offline-sw-strategy
 * Property 7: Activation removes stale caches and entries
 *
 * Validates: Requirements 2.4, 6.1, 6.2
 *
 * For any set of existing cache names and a current cache version identifier,
 * activation SHALL delete all caches whose names do not end with the current version.
 * Additionally, for any set of previously cached URLs and a current precache manifest,
 * activation SHALL remove cached entries whose URLs are absent from the current manifest.
 */

// --- Generators ---

/** Generate a version string like "v1", "v2", etc. */
const arbVersion = fc
  .integer({ min: 1, max: 99 })
  .map((n) => `v${n}`);

/** Generate a valid cache name prefix */
const arbCachePrefix = fc.constantFrom(
  'precache-',
  'images-',
  'fonts-',
  'runtime-',
  'api-',
  'static-',
);

/** Generate a set of cache names, some matching the current version, some not */
function arbCacheNames(currentVersion: string) {
  const matchingName = fc
    .tuple(arbCachePrefix)
    .map(([prefix]) => `${prefix}${currentVersion}`);

  const staleName = fc
    .tuple(
      arbCachePrefix,
      fc.integer({ min: 1, max: 99 }).map((n) => `v${n}`),
    )
    .filter(([, v]) => v !== currentVersion)
    .map(([prefix, v]) => `${prefix}${v}`);

  return fc.tuple(
    fc.array(matchingName, { minLength: 0, maxLength: 5 }),
    fc.array(staleName, { minLength: 0, maxLength: 5 }),
  ).map(([matching, stale]) => {
    // Deduplicate
    const all = [...new Set([...matching, ...stale])];
    return { all, matching: [...new Set(matching)], stale: [...new Set(stale)] };
  });
}

/** Generate a valid URL path segment */
const arbPathSegment = fc.string({
  minLength: 1,
  maxLength: 12,
  unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
});

/** Generate a valid file extension */
const arbExtension = fc.constantFrom('.js', '.css', '.html', '.woff2', '.woff');

/** Generate a hex revision string (8 chars) */
const arbRevision = fc.string({
  minLength: 8,
  maxLength: 8,
  unit: fc.constantFrom(...'0123456789abcdef'.split('')),
});

/** Generate a single PrecacheEntry */
const arbPrecacheEntry: fc.Arbitrary<PrecacheEntry> = fc
  .tuple(
    fc.array(arbPathSegment, { minLength: 1, maxLength: 3 }),
    arbPathSegment,
    arbExtension,
    arbRevision,
  )
  .map(([segments, filename, ext, revision]) => ({
    url: `/PWACharSheet/${segments.join('/')}/${filename}${ext}`,
    revision,
  }));

/** Generate a manifest with unique URLs */
const arbManifest: fc.Arbitrary<PrecacheEntry[]> = fc
  .array(arbPrecacheEntry, { minLength: 0, maxLength: 10 })
  .map((entries) => {
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.url)) return false;
      seen.add(e.url);
      return true;
    });
  });

/** Generate stale cached URLs (not in manifest) */
function arbStaleUrls(manifest: PrecacheEntry[]) {
  const manifestUrls = new Set(manifest.map((e) => e.url));
  return fc
    .array(
      fc
        .tuple(
          fc.array(arbPathSegment, { minLength: 1, maxLength: 3 }),
          arbPathSegment,
          arbExtension,
        )
        .map(
          ([segments, filename, ext]) =>
            `/PWACharSheet/${segments.join('/')}/${filename}${ext}`,
        ),
      { minLength: 0, maxLength: 8 },
    )
    .map((urls) => urls.filter((u) => !manifestUrls.has(u)))
    .map((urls) => [...new Set(urls)]);
}

// --- Tests ---

describe('Feature: offline-sw-strategy, Property 7: Activation removes stale caches and entries', () => {
  let originalCaches: typeof globalThis.caches;
  let originalSelf: Record<string, unknown>;

  beforeEach(() => {
    originalCaches = globalThis.caches;
    originalSelf = {};
    // Mock self.clients.claim()
    (globalThis as unknown as Record<string, unknown>).self = {
      clients: { claim: () => Promise.resolve() },
    };
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    delete (globalThis as unknown as Record<string, unknown>).self;
    vi.restoreAllMocks();
  });

  it('deletes all caches whose names do not end with the current version and retains those that do', async () => {
    await fc.assert(
      fc.asyncProperty(arbVersion, fc.integer({ min: 1, max: 99 }), async (currentVersion, otherNum) => {
        // Generate cache names: some ending with currentVersion, some not
        const otherVersion = `v${otherNum}`;
        const isStaleVersion = otherVersion !== currentVersion;

        // Build a deterministic set of cache names
        const matchingCaches = [`precache-${currentVersion}`, `images-${currentVersion}`];
        const staleCaches = isStaleVersion
          ? [`precache-${otherVersion}`, `images-${otherVersion}`, `fonts-${otherVersion}`]
          : [];
        const allCacheNames = [...matchingCaches, ...staleCaches];

        const deletedCaches: string[] = [];

        globalThis.caches = {
          keys: () => Promise.resolve(allCacheNames),
          delete: (name: string) => {
            deletedCaches.push(name);
            return Promise.resolve(true);
          },
          open: () =>
            Promise.resolve({
              keys: () => Promise.resolve([]),
              delete: () => Promise.resolve(true),
            }),
        } as unknown as CacheStorage;

        (globalThis as unknown as Record<string, unknown>).self = {
          clients: { claim: () => Promise.resolve() },
        };

        const precacheName = `precache-${currentVersion}`;
        const manifest: PrecacheEntry[] = [];

        await handleActivate({ cacheVersion: currentVersion, precacheName, manifest });

        // All stale caches must be deleted
        for (const name of staleCaches) {
          expect(deletedCaches).toContain(name);
        }

        // Caches ending with current version must NOT be deleted
        for (const name of matchingCaches) {
          expect(deletedCaches).not.toContain(name);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('removes cached entries whose URLs are absent from the current manifest and retains those present', async () => {
    await fc.assert(
      fc.asyncProperty(arbManifest, async (manifest) => {
        // Generate stale URLs that are not in the manifest
        const staleUrls = [
          '/PWACharSheet/old/stale1.js',
          '/PWACharSheet/old/stale2.css',
          '/PWACharSheet/old/stale3.html',
        ].filter((u) => !manifest.some((e) => e.url === u));

        // Build cached requests: manifest URLs + stale URLs
        const manifestUrls = manifest.map((e) => e.url);
        const allCachedUrls = [...manifestUrls, ...staleUrls];

        const mockRequests = allCachedUrls.map((url) => ({
          url: `https://example.com${url}`,
        }));

        const deletedRequests: string[] = [];

        const mockCache = {
          keys: () => Promise.resolve(mockRequests),
          delete: (request: { url: string }) => {
            const url = new URL(request.url).pathname;
            deletedRequests.push(url);
            return Promise.resolve(true);
          },
        };

        const currentVersion = 'v2';
        const precacheName = `precache-${currentVersion}`;

        globalThis.caches = {
          keys: () => Promise.resolve([precacheName]),
          delete: () => Promise.resolve(true),
          open: (name: string) => {
            if (name === precacheName) {
              return Promise.resolve(mockCache);
            }
            return Promise.resolve({ keys: () => Promise.resolve([]), delete: () => Promise.resolve(true) });
          },
        } as unknown as CacheStorage;

        (globalThis as unknown as Record<string, unknown>).self = {
          clients: { claim: () => Promise.resolve() },
        };

        await handleActivate({ cacheVersion: currentVersion, precacheName, manifest });

        // Stale entries must be deleted
        for (const url of staleUrls) {
          expect(deletedRequests).toContain(url);
        }

        // Manifest entries must NOT be deleted
        for (const url of manifestUrls) {
          expect(deletedRequests).not.toContain(url);
        }
      }),
      { numRuns: 100 },
    );
  });
});
