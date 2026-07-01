/// <reference lib="webworker" />

/**
 * Ambient type declarations for the service worker global scope.
 * TypeScript needs these to understand SW-specific APIs (clients, caches, etc.)
 * when compiling files under `src/sw/`.
 */
export {};

declare global {
  // eslint-disable-next-line no-var
  var __PRECACHE_MANIFEST__: import('./types').PrecacheEntry[] | undefined;
}
