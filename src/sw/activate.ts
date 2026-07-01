/// <reference lib="webworker" />

import type { PrecacheEntry } from './types';

declare const self: ServiceWorkerGlobalScope;

export interface ActivateHandlerOptions {
  cacheVersion: string;
  precacheName: string;
  manifest: PrecacheEntry[];
}

/**
 * Handles the service worker activate event.
 *
 * 1. Deletes all caches whose names do not end with the current CACHE_VERSION.
 * 2. Opens the precache and removes entries whose URLs are absent from the manifest.
 * 3. Calls clients.claim() so the new SW takes control immediately.
 * 4. Logs errors to console on cache deletion failures but resolves successfully.
 */
export async function handleActivate(
  options: ActivateHandlerOptions,
): Promise<void> {
  const { cacheVersion, precacheName, manifest } = options;

  // Step 1: Delete stale caches (names not ending with current version)
  try {
    const cacheNames = await caches.keys();
    const staleNames = cacheNames.filter(
      (name) => !name.endsWith(cacheVersion),
    );

    await Promise.all(
      staleNames.map(async (name) => {
        try {
          await caches.delete(name);
        } catch (err) {
          console.error(`[SW Activate] Failed to delete cache "${name}":`, err);
        }
      }),
    );
  } catch (err) {
    console.error('[SW Activate] Failed to enumerate caches:', err);
  }

  // Step 2: Remove stale entries from the precache
  try {
    const manifestUrls = new Set(manifest.map((entry) => entry.url));
    const cache = await caches.open(precacheName);
    const cachedRequests = await cache.keys();

    await Promise.all(
      cachedRequests.map(async (request) => {
        const url = new URL(request.url);
        const pathname = url.pathname;
        if (!manifestUrls.has(pathname)) {
          try {
            await cache.delete(request);
          } catch (err) {
            console.error(
              `[SW Activate] Failed to delete stale entry "${pathname}":`,
              err,
            );
          }
        }
      }),
    );
  } catch (err) {
    console.error('[SW Activate] Failed to purge stale precache entries:', err);
  }

  // Step 3: Claim all open clients
  try {
    await self.clients.claim();
  } catch (err) {
    console.error('[SW Activate] Failed to claim clients:', err);
  }
}
