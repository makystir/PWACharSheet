import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PrecacheEntry } from '../types';
import { handleActivate, ActivateHandlerOptions } from '../activate';

describe('handleActivate', () => {
  let originalCaches: typeof globalThis.caches;
  let originalSelf: unknown;

  beforeEach(() => {
    originalCaches = globalThis.caches;
    originalSelf = (globalThis as Record<string, unknown>).self;
  });

  afterEach(() => {
    globalThis.caches = originalCaches;
    (globalThis as Record<string, unknown>).self = originalSelf;
    vi.restoreAllMocks();
  });

  function setupSelfClients(claimFn = vi.fn(async () => {})) {
    (globalThis as Record<string, unknown>).self = {
      clients: {
        claim: claimFn,
      },
    };
  }

  function createMockCacheStorage(options: {
    cacheNames?: string[];
    deleteFn?: (name: string) => Promise<boolean>;
    precacheEntries?: Request[];
    cacheDeleteEntryFn?: (request: Request) => Promise<boolean>;
  }) {
    const {
      cacheNames = [],
      deleteFn = vi.fn(async () => true),
      precacheEntries = [],
      cacheDeleteEntryFn = vi.fn(async () => true),
    } = options;

    const mockPrecache = {
      keys: vi.fn(async () => precacheEntries),
      delete: cacheDeleteEntryFn,
    };

    return {
      keys: vi.fn(async () => cacheNames),
      delete: deleteFn,
      open: vi.fn(async () => mockPrecache),
      mockPrecache,
    };
  }

  // Test 1: Deletes caches not ending with current version
  it('deletes caches whose names do not end with the current version', async () => {
    const deleteFn = vi.fn(async () => true);
    const mockCacheStorage = createMockCacheStorage({
      cacheNames: ['precache-v1', 'images-v1', 'precache-v2', 'fonts-v2'],
      deleteFn,
    });

    globalThis.caches = mockCacheStorage as unknown as CacheStorage;
    setupSelfClients();

    const options: ActivateHandlerOptions = {
      cacheVersion: 'v2',
      precacheName: 'precache-v2',
      manifest: [],
    };

    await handleActivate(options);

    // Should delete caches ending with v1 (not v2)
    expect(deleteFn).toHaveBeenCalledWith('precache-v1');
    expect(deleteFn).toHaveBeenCalledWith('images-v1');
    expect(deleteFn).toHaveBeenCalledTimes(2);
  });

  // Test 2: Retains caches ending with current version
  it('retains caches whose names end with the current version', async () => {
    const deleteFn = vi.fn(async () => true);
    const mockCacheStorage = createMockCacheStorage({
      cacheNames: ['precache-v2', 'images-v2', 'fonts-v2'],
      deleteFn,
    });

    globalThis.caches = mockCacheStorage as unknown as CacheStorage;
    setupSelfClients();

    const options: ActivateHandlerOptions = {
      cacheVersion: 'v2',
      precacheName: 'precache-v2',
      manifest: [],
    };

    await handleActivate(options);

    // No caches should be deleted since they all end with v2
    expect(deleteFn).not.toHaveBeenCalled();
  });

  // Test 3: Removes cached entries not in current manifest
  it('removes cached entries whose URLs are not in the current manifest', async () => {
    const cacheDeleteEntryFn = vi.fn(async () => true);
    const precacheEntries = [
      new Request('http://localhost/PWACharSheet/assets/old.js'),
      new Request('http://localhost/PWACharSheet/assets/current.js'),
      new Request('http://localhost/PWACharSheet/assets/removed.css'),
    ];

    const mockCacheStorage = createMockCacheStorage({
      cacheNames: ['precache-v2'],
      precacheEntries,
      cacheDeleteEntryFn,
    });

    globalThis.caches = mockCacheStorage as unknown as CacheStorage;
    setupSelfClients();

    const manifest: PrecacheEntry[] = [
      { url: '/PWACharSheet/assets/current.js', revision: 'aaaaaaaa' },
    ];

    const options: ActivateHandlerOptions = {
      cacheVersion: 'v2',
      precacheName: 'precache-v2',
      manifest,
    };

    await handleActivate(options);

    // Should delete old.js and removed.css (not in manifest)
    expect(cacheDeleteEntryFn).toHaveBeenCalledTimes(2);
    expect(cacheDeleteEntryFn).toHaveBeenCalledWith(precacheEntries[0]);
    expect(cacheDeleteEntryFn).toHaveBeenCalledWith(precacheEntries[2]);
  });

  // Test 4: Retains cached entries in current manifest
  it('retains cached entries whose URLs are in the current manifest', async () => {
    const cacheDeleteEntryFn = vi.fn(async () => true);
    const precacheEntries = [
      new Request('http://localhost/PWACharSheet/assets/index.js'),
      new Request('http://localhost/PWACharSheet/assets/style.css'),
    ];

    const mockCacheStorage = createMockCacheStorage({
      cacheNames: ['precache-v2'],
      precacheEntries,
      cacheDeleteEntryFn,
    });

    globalThis.caches = mockCacheStorage as unknown as CacheStorage;
    setupSelfClients();

    const manifest: PrecacheEntry[] = [
      { url: '/PWACharSheet/assets/index.js', revision: 'aaaaaaaa' },
      { url: '/PWACharSheet/assets/style.css', revision: 'bbbbbbbb' },
    ];

    const options: ActivateHandlerOptions = {
      cacheVersion: 'v2',
      precacheName: 'precache-v2',
      manifest,
    };

    await handleActivate(options);

    // No entries should be deleted since they are all in the manifest
    expect(cacheDeleteEntryFn).not.toHaveBeenCalled();
  });

  // Test 5: Calls clients.claim()
  it('calls clients.claim()', async () => {
    const claimFn = vi.fn(async () => {});
    const mockCacheStorage = createMockCacheStorage({
      cacheNames: [],
    });

    globalThis.caches = mockCacheStorage as unknown as CacheStorage;
    setupSelfClients(claimFn);

    const options: ActivateHandlerOptions = {
      cacheVersion: 'v2',
      precacheName: 'precache-v2',
      manifest: [],
    };

    await handleActivate(options);

    expect(claimFn).toHaveBeenCalledTimes(1);
  });

  // Test 6: Logs error but resolves when cache deletion fails (Req 6.3)
  it('resolves successfully even when cache deletion fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const deleteFn = vi.fn(async () => {
      throw new Error('Storage quota error');
    });

    const mockCacheStorage = createMockCacheStorage({
      cacheNames: ['precache-v1', 'precache-v2'],
      deleteFn,
    });

    globalThis.caches = mockCacheStorage as unknown as CacheStorage;
    setupSelfClients();

    const options: ActivateHandlerOptions = {
      cacheVersion: 'v2',
      precacheName: 'precache-v2',
      manifest: [],
    };

    // Should resolve without throwing
    await expect(handleActivate(options)).resolves.toBeUndefined();

    // Should have logged an error
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorMessages = consoleErrorSpy.mock.calls.map((args) => args[0]);
    expect(
      errorMessages.some((msg: string) => msg.includes('[SW Activate]'))
    ).toBe(true);
  });

  // Test 7: Handles empty cache list gracefully
  it('handles empty cache list gracefully', async () => {
    const deleteFn = vi.fn(async () => true);
    const mockCacheStorage = createMockCacheStorage({
      cacheNames: [],
      precacheEntries: [],
    });

    globalThis.caches = mockCacheStorage as unknown as CacheStorage;
    setupSelfClients();

    const options: ActivateHandlerOptions = {
      cacheVersion: 'v2',
      precacheName: 'precache-v2',
      manifest: [],
    };

    // Should resolve without issues
    await expect(handleActivate(options)).resolves.toBeUndefined();
  });
});
