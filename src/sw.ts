/// <reference lib="webworker" />

import type { PrecacheEntry } from './sw/types';
import type { FetchHandlerConfig } from './sw/fetch';
import { handleInstall } from './sw/install';
import { handleActivate } from './sw/activate';
import { handleFetch } from './sw/fetch';
import { handleMessage } from './sw/message';

declare const self: ServiceWorkerGlobalScope;

// Build plugin replaces `self.__PRECACHE_MANIFEST__` with the manifest JSON
const PRECACHE_MANIFEST: PrecacheEntry[] = self.__PRECACHE_MANIFEST__ || [];

const CACHE_VERSION = 'v2';
const PRECACHE_NAME = `precache-${CACHE_VERSION}`;
const RUNTIME_IMAGE_CACHE = `images-${CACHE_VERSION}`;
const RUNTIME_FONT_CACHE = `fonts-${CACHE_VERSION}`;
const IMAGE_CACHE_LIMIT = 60;

// Derive a set of manifest URLs for fast lookup in the fetch handler
const manifestUrls = new Set(PRECACHE_MANIFEST.map((entry) => entry.url));

// Fetch handler config shared across fetch events
const fetchConfig: FetchHandlerConfig = {
  precacheName: PRECACHE_NAME,
  imageCacheName: RUNTIME_IMAGE_CACHE,
  fontCacheName: RUNTIME_FONT_CACHE,
  imageCacheLimit: IMAGE_CACHE_LIMIT,
  manifestUrls,
  origin: self.location.origin,
  appShellUrl: `${self.location.origin}/PWACharSheet/index.html`,
  offlineFallbackUrl: `${self.location.origin}/PWACharSheet/offline.html`,
};

// --- Event Listeners ---

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(handleInstall(PRECACHE_MANIFEST, PRECACHE_NAME));
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    handleActivate({
      cacheVersion: CACHE_VERSION,
      precacheName: PRECACHE_NAME,
      manifest: PRECACHE_MANIFEST,
    }),
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const responsePromise = handleFetch(event.request, fetchConfig);
  event.respondWith(
    responsePromise.then((response) => response ?? fetch(event.request)),
  );
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  handleMessage(event);
});
