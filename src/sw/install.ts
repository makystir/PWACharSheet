import type { PrecacheEntry } from './types';

/**
 * Handles the service worker install event.
 *
 * Opens the precache by name, diffs the manifest against existing cached entries
 * by revision, and fetches only new or changed assets. Rejects the install event
 * if any fetch fails (non-ok response or network error).
 *
 * Does NOT call skipWaiting() — the SW must enter the waiting state.
 */
export async function handleInstall(
  manifest: PrecacheEntry[],
  cacheName: string
): Promise<void> {
  const cache = await caches.open(cacheName);

  // Determine which entries already exist in the cache with matching revisions.
  // We check each manifest entry against what's already cached.
  const entriesToFetch: PrecacheEntry[] = [];

  for (const entry of manifest) {
    const cachedResponse = await cache.match(entry.url);
    if (cachedResponse) {
      // Check if the cached entry has a matching revision via a custom header
      const cachedRevision = cachedResponse.headers.get('x-precache-revision');
      if (cachedRevision === entry.revision) {
        // Already cached with the same revision — skip
        continue;
      }
    }
    entriesToFetch.push(entry);
  }

  // Fetch all changed/new entries. If any fetch fails, reject the install.
  const fetchPromises = entriesToFetch.map(async (entry) => {
    const response = await fetch(entry.url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${entry.url}: ${response.status} ${response.statusText}`
      );
    }

    // Clone the response and add a revision header so we can diff on next install
    const headers = new Headers(response.headers);
    headers.set('x-precache-revision', entry.revision);

    const revisedResponse = new Response(await response.blob(), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    await cache.put(entry.url, revisedResponse);
  });

  await Promise.all(fetchPromises);
}
