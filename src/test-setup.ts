import '@testing-library/jest-dom';

/**
 * Global test setup for vitest + jsdom.
 * Provides a default matchMedia mock since jsdom doesn't implement it.
 */

/**
 * jsdom 30's URL.createObjectURL reads an internal `_buffer` off the Blob, which
 * Blobs produced by fake-indexeddb's structured-clone round-trip do not have —
 * so it throws `Cannot read properties of undefined (reading '_buffer')`.
 * In a real browser this works fine on IndexedDB-retrieved Blobs, so we replace
 * the env implementation with a simple stub that returns a unique, non-empty
 * `blob:` URL. Individual tests remain free to vi.spyOn/mock these.
 */
if (typeof URL !== 'undefined') {
  let objectUrlCounter = 0;
  URL.createObjectURL = () => `blob:test/${++objectUrlCounter}`;
  URL.revokeObjectURL = () => {};
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
