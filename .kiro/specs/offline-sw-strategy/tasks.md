# Implementation Plan: Offline Service Worker Strategy

## Overview

This plan implements a build-time precache manifest system and controlled service worker update flow. The approach replaces the existing hand-maintained `public/sw.js` with a custom Vite plugin that generates a precache manifest at build, a new service worker source that uses that manifest, a registration module for lifecycle management, and a React-based update banner.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - [x] 1.1 Create core type definitions and directory structure
    - Create `src/build/` directory for the Vite plugin
    - Create `src/sw/` directory for service worker modules
    - Define shared `PrecacheEntry` interface in `src/sw/types.ts`
    - Define `SWPrecachePluginOptions` interface in `src/build/types.ts`
    - Define `SWUpdateState`, `SWUpdateListener`, and `SkipWaitingMessage` types in `src/sw/types.ts`
    - _Requirements: 1.3, 1.5, 4.4_

- [x] 2. Implement the Vite precache manifest plugin
  - [x] 2.1 Implement `vite-plugin-sw-precache.ts`
    - Create `src/build/vite-plugin-sw-precache.ts`
    - Implement `closeBundle` hook that walks the output directory recursively
    - Filter files against `include`/`exclude` regex patterns (include HTML, CSS, JS, woff2, woff; exclude .map files)
    - Compute revision hashes: extract embedded hash from filenames matching `name-[hexhash].ext` pattern, or compute MD5 of file content for others
    - Read SW source template, replace `self.__PRECACHE_MANIFEST__` placeholder with JSON manifest array
    - Write final `sw.js` to dist directory
    - Handle error cases: missing SW source template (throw), empty output dir (warn + empty manifest), file read errors (throw)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Write property tests for manifest file type filtering
    - **Property 1: Manifest file type filtering**
    - **Validates: Requirements 1.1, 1.2, 1.6**
    - Create `src/build/__tests__/vite-plugin-sw-precache.property.test.ts`
    - Generate random file listings and verify only .html, .css, .js, .woff2, .woff files are included and .map files are excluded

  - [x] 2.3 Write property tests for manifest entry URL format
    - **Property 2: Manifest entry URL format**
    - **Validates: Requirements 1.3**
    - Generate random file paths and base configs, verify URL = basePath + relativePath and revision is non-empty hex

  - [x] 2.4 Write property tests for revision hash derivation
    - **Property 3: Revision hash derivation**
    - **Validates: Requirements 1.4**
    - Generate filenames with and without embedded hashes, verify correct revision source selection

  - [x] 2.5 Write unit tests for the Vite plugin
    - Create `src/build/__tests__/vite-plugin-sw-precache.test.ts`
    - Test with mock file system: known file sets, empty directory, only .map files, mixed extensions
    - Test error handling for missing template and file read failures
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement service worker install and activate handlers
  - [x] 4.1 Implement SW install handler in `src/sw/install.ts`
    - Read `PRECACHE_MANIFEST` injected variable
    - Open precache, diff against existing entries by revision
    - Fetch only changed/new assets, call `event.waitUntil()`
    - Do NOT call `skipWaiting()` — SW must enter waiting state
    - Reject install event if any fetch fails (non-ok or network error)
    - _Requirements: 2.1, 2.2, 2.3, 4.1_

  - [x] 4.2 Implement SW activate handler in `src/sw/activate.ts`
    - Delete all caches whose names do not end with the current `CACHE_VERSION`
    - Remove cached entries whose URLs are absent from the current manifest
    - Call `clients.claim()`
    - Log errors to console on cache deletion failures, resolve activate event successfully
    - _Requirements: 2.4, 6.1, 6.2, 6.3_

  - [x] 4.3 Write property tests for install caching all manifest entries
    - **Property 4: Install caches all manifest entries**
    - **Validates: Requirements 2.1**
    - Create `src/sw/__tests__/sw-install.property.test.ts`
    - Generate random manifests with mock fetch, verify all entries cached after install

  - [x] 4.4 Write property tests for install failure on non-ok fetch
    - **Property 5: Install fails on any non-ok fetch**
    - **Validates: Requirements 2.2**
    - Generate manifests with random failures injected, verify install rejects

  - [x] 4.5 Write property tests for differential install
    - **Property 6: Differential install fetches only changed entries**
    - **Validates: Requirements 2.3**
    - Generate old/new manifest pairs, verify only changed/new entries are fetched

  - [x] 4.6 Write property tests for activation stale cache removal
    - **Property 7: Activation removes stale caches and entries**
    - **Validates: Requirements 2.4, 6.1, 6.2**
    - Create `src/sw/__tests__/sw-activate.property.test.ts`
    - Generate cache name sets and version identifiers, verify stale caches deleted and stale entries purged

  - [x] 4.7 Write unit tests for install and activate handlers
    - Create `src/sw/__tests__/sw-install.test.ts` and `src/sw/__tests__/sw-activate.test.ts`
    - Mock `caches` and `fetch` APIs
    - Test install with known manifests, verify failure on bad responses
    - Test activate with known cache sets, verify stale deletion and error handling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_

- [x] 5. Implement service worker fetch handler
  - [x] 5.1 Implement SW fetch handler in `src/sw/fetch.ts`
    - Route precached URLs → cache-first (serve from precache, no network request)
    - If precached asset missing from cache → fetch from network, cache if ok
    - If precached asset missing and network fails → 503 response
    - Navigation requests → serve cached app shell HTML; if unavailable, serve `offline.html`; if no fallback → 503
    - Same-origin image requests (svg, png, jpg, webp, ico) → cache-first with image cache
    - Same-origin font requests (woff2, woff, ttf, otf) → cache-first with font cache
    - Image cache LRU eviction at 60 entries
    - Runtime cache miss + network failure → 503 response
    - Cross-origin requests → pass through without interception
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 5.2 Implement SW message handler in `src/sw/message.ts`
    - Listen for `{ type: 'SKIP_WAITING' }` messages
    - Call `self.skipWaiting()` when received
    - _Requirements: 4.2, 4.5_

  - [x] 5.3 Write property tests for cache-first serving
    - **Property 8: Cache-first serving for precached URLs**
    - **Validates: Requirements 3.1**
    - Create `src/sw/__tests__/sw-fetch.property.test.ts`
    - Generate URL sets matching manifest, verify cached response returned without network request

  - [x] 5.4 Write property tests for request routing by extension
    - **Property 9: Request routing by file extension**
    - **Validates: Requirements 7.1, 7.2**
    - Generate URLs with various extensions, verify correct routing to image or font cache strategy

  - [x] 5.5 Write property tests for image cache LRU eviction
    - **Property 10: Image cache LRU eviction**
    - **Validates: Requirements 7.3**
    - Create `src/sw/__tests__/sw-cache-lru.property.test.ts`
    - Generate insertion sequences exceeding 60 entries, verify LRU eviction and max 60 maintained

  - [x] 5.6 Write property tests for cross-origin passthrough
    - **Property 11: Cross-origin request passthrough**
    - **Validates: Requirements 7.5**
    - Generate URLs with different origins, verify no interception or caching

  - [x] 5.7 Write unit tests for fetch and message handlers
    - Create `src/sw/__tests__/sw-fetch.test.ts`
    - Mock `caches.match` and `fetch`, test routing for navigation, JS, images, fonts, cross-origin
    - Test offline fallback scenarios and 503 responses
    - Test message handler calls `skipWaiting()` on correct message type
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Compose service worker entry file
  - [x] 7.1 Create `src/sw.ts` entry file
    - Import and wire install, activate, fetch, and message handlers from `src/sw/` modules
    - Define cache name constants (`PRECACHE_NAME`, `RUNTIME_IMAGE_CACHE`, `RUNTIME_FONT_CACHE`) with `CACHE_VERSION`
    - Declare `self.__PRECACHE_MANIFEST__` placeholder for build-time injection
    - Set `IMAGE_CACHE_LIMIT = 60`
    - Register all event listeners (`install`, `activate`, `fetch`, `message`)
    - _Requirements: 2.1, 3.1, 4.1, 4.5, 7.1_

- [x] 8. Implement service worker registration module
  - [x] 8.1 Implement `src/sw-register.ts`
    - Register SW after `window.load` event in production environment
    - Listen for `updatefound` event, track installing worker's `statechange`
    - Detect `registration.waiting` on initial registration check
    - Notify subscribers when a waiting worker is detected
    - Implement `applyUpdate()`: post `SKIP_WAITING` message, 5s timeout, listen for `controllerchange` → reload
    - Implement `dismiss()`: hide prompt for current session
    - Handle registration failure gracefully (log to console, app continues)
    - Skip registration if `navigator.serviceWorker` is not available
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 4.4, 4.6, 5.6_

  - [x] 8.2 Write unit tests for registration module
    - Create `src/hooks/__tests__/useSWUpdate.test.ts`
    - Mock `navigator.serviceWorker`
    - Test lifecycle event wiring, waiting worker detection, timeout behavior
    - Test error handling for unsupported browsers and failed registration
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Implement React context, hook, and UpdateBanner component
  - [x] 9.1 Create `SWUpdateContext` and `useSWUpdate` hook
    - Create `src/hooks/useSWUpdate.ts`
    - Implement React context with `SWUpdateContextValue` interface
    - Expose `updateAvailable`, `applying`, `error`, `applyUpdate`, `dismiss` via hook
    - Wire context provider to the registration module's subscribe/applyUpdate/dismiss API
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 9.2 Implement `UpdateBanner` component
    - Create `src/components/shared/UpdateBanner.tsx` and `UpdateBanner.module.css`
    - Render a fixed-position, non-modal banner at the bottom of the viewport
    - Display message "A new version is available"
    - Include "Reload" button (primary) and "Dismiss" button (secondary)
    - Show error state with retry affordance when activation fails
    - Add `role="status"` for accessibility (ARIA live region)
    - Only render when `updateAvailable` is true
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 4.6_

  - [x] 9.3 Write unit tests for UpdateBanner component
    - Create `src/components/shared/__tests__/UpdateBanner.test.tsx`
    - Render with React Testing Library
    - Verify hidden state, visible state, error state, applying state
    - Verify Reload and Dismiss button actions
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Integrate all components into the app
  - [x] 10.1 Wire Vite plugin into `vite.config.ts`
    - Import `swPrecachePlugin` from `./src/build/vite-plugin-sw-precache`
    - Add plugin to Vite config with options: `swSrc: 'src/sw.ts'`, `swDest: 'sw.js'`, include/exclude patterns for HTML, CSS, JS, woff2, woff (exclude .map and sw.js)
    - _Requirements: 1.5_

  - [x] 10.2 Add `SWUpdateProvider` and `UpdateBanner` to App root
    - Wrap App content with the `SWUpdateProvider` in `src/App.tsx`
    - Render `UpdateBanner` at the top level of the app component tree
    - _Requirements: 5.1, 5.6_

  - [x] 10.3 Remove old `public/sw.js` and update `index.html` registration
    - Delete `public/sw.js` (replaced by build-generated `dist/sw.js`)
    - Remove any inline SW registration script from `index.html` (registration now handled by `sw-register.ts`)
    - Ensure `offline.html` remains in `public/` for the navigation fallback
    - _Requirements: 1.5, 3.5_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `public/sw.js` is only removed in task 10.3 after the replacement is fully wired
- The project uses `fast-check` v4.8.0 for property-based tests and `vitest` as the test runner
- All code is TypeScript targeting the Vite + React stack

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "4.1", "4.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5", "4.3", "4.4", "4.5", "4.6", "4.7"] },
    { "id": 3, "tasks": ["5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "5.5", "5.6", "5.7", "7.1"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2", "9.1"] },
    { "id": 7, "tasks": ["9.2"] },
    { "id": 8, "tasks": ["9.3", "10.1", "10.2", "10.3"] }
  ]
}
```
