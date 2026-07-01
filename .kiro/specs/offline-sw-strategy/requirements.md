# Requirements Document

## Introduction

This feature closes the gap between the app's "offline-capable" claim and its actual service worker implementation. The current `sw.js` precaches only three static URLs (`/PWACharSheet/`, `index.html`, `offline.html`) and relies on runtime caching for hashed build assets (JS, CSS, fonts). If the browser evicts its HTTP cache before the user revisits the app, those assets are lost and the app fails to load offline.

This spec adds two capabilities:
1. A build-time precache manifest so the service worker proactively caches all app shell assets during installation, guaranteeing offline availability regardless of browser cache eviction.
2. An "update available" prompt so users are informed when a new version is ready, instead of the service worker hot-swapping immediately via `skipWaiting()`/`clients.claim()`.

## Glossary

- **Service_Worker**: The script registered at `sw.js` that intercepts network requests and manages caches for the PWA.
- **Precache_Manifest**: A build-generated list of versioned asset URLs (with content hashes) that the Service_Worker caches during installation.
- **App_Shell**: The minimal set of HTML, CSS, JavaScript, and font assets required to render the application UI without network access.
- **Build_Plugin**: A Vite plugin that runs at build time to generate the Precache_Manifest and inject it into the Service_Worker output.
- **Update_Prompt**: A UI component displayed to the user when a new Service_Worker version has installed and is waiting to activate.
- **Waiting_Worker**: A new Service_Worker that has finished installation but has not yet activated because the previous version still controls open clients.
- **Cache_Version**: A version identifier embedded in cache names, used to distinguish and evict outdated caches during activation.

## Requirements

### Requirement 1: Build-Time Precache Manifest Generation

**User Story:** As a developer, I want the build process to automatically generate a list of all app shell assets with their content hashes, so that the service worker can precache them without manual maintenance.

#### Acceptance Criteria

1. WHEN a production build completes, THE Build_Plugin SHALL generate a Precache_Manifest containing all HTML, CSS, and JavaScript files from the build output directory, including static files copied from the public folder that match these types.
2. WHEN a production build completes, THE Build_Plugin SHALL include font files with extensions woff2 and woff present in the build output directory in the Precache_Manifest.
3. THE Build_Plugin SHALL represent each entry in the Precache_Manifest as a URL path relative to the configured Vite base path and a content-based revision hash.
4. IF a file in the build output already contains a content hash in its filename, THEN THE Build_Plugin SHALL use that filename hash as the revision and SHALL use a separately computed hash for files without content hashes in their filenames.
5. THE Build_Plugin SHALL inject the Precache_Manifest into the Service_Worker output file as a JavaScript variable assignment so it is available at runtime without additional network requests.
6. WHEN the Precache_Manifest is generated, THE Build_Plugin SHALL exclude source map files, and any files not matching the types specified in criteria 1 and 2.

### Requirement 2: Service Worker Precache Installation

**User Story:** As a user, I want the app to cache all required assets when the service worker first installs, so that the app works offline even if the browser evicts its HTTP cache.

#### Acceptance Criteria

1. WHEN the Service_Worker installs, THE Service_Worker SHALL cache every asset listed in the Precache_Manifest.
2. IF any Precache_Manifest asset download returns a non-ok HTTP response or a network error during installation, THEN THE Service_Worker SHALL reject the install event so that the Service_Worker does not activate and the previous version remains in control.
3. WHEN a new Service_Worker version installs, THE Service_Worker SHALL cache only assets whose revision hashes differ from the previously cached versions, skipping assets that already exist in the cache with a matching revision hash.
4. WHEN the Service_Worker activates, THE Service_Worker SHALL remove all previously cached assets whose URLs are no longer present in the current Precache_Manifest.

### Requirement 3: Cache-First Serving for Precached Assets

**User Story:** As a user, I want the app to load instantly from cache regardless of network conditions, so that I can access my character sheets reliably offline.

#### Acceptance Criteria

1. WHEN a request URL matches an entry in the Precache_Manifest, THE Service_Worker SHALL respond with the cached version without making a network request.
2. IF a precached asset is missing from the cache at request time, THEN THE Service_Worker SHALL fetch the asset from the network and cache only successful responses before returning them to the client.
3. IF a precached asset is missing from the cache and the network fetch fails, THEN THE Service_Worker SHALL respond with a 503 Service Unavailable status.
4. WHILE the network is unavailable, WHEN a navigation request is received, THE Service_Worker SHALL serve the cached App_Shell HTML.
5. IF a navigation request fails and no cached App_Shell HTML is available, THEN THE Service_Worker SHALL serve the offline.html fallback page.

### Requirement 4: Controlled Service Worker Activation

**User Story:** As a user, I want the new service worker to wait until I choose to reload, so that the app does not unexpectedly refresh or break during active use.

#### Acceptance Criteria

1. WHEN a new Service_Worker finishes installation, THE Service_Worker SHALL enter the waiting state without calling skipWaiting() automatically.
2. WHILE a Waiting_Worker exists, THE Service_Worker SHALL not activate until it receives a skipWaiting message from a client.
3. WHILE a Waiting_Worker exists and the user has not accepted the update, THE Service_Worker SHALL remain in the waiting state across page navigations and reloads.
4. WHEN the user accepts the update via the Update_Prompt, THE application SHALL send a postMessage to the Waiting_Worker with a type indicating it should call skipWaiting().
5. WHEN the Waiting_Worker receives the skipWaiting message, THE Service_Worker SHALL call skipWaiting() to activate and then claim all open clients.
6. IF the application sends a skipWaiting message and the Waiting_Worker does not activate within 5 seconds, THEN THE application SHALL display an error indication to the user and suggest a manual page reload.

### Requirement 5: Update Available Notification

**User Story:** As a user, I want to see a prompt when a new version of the app is available, so that I can choose when to reload and get the latest features.

#### Acceptance Criteria

1. WHEN the Service_Worker registration detects a Waiting_Worker, THE application SHALL display the Update_Prompt to the user as a non-modal, dismissible banner that does not block interaction with the rest of the application.
2. THE Update_Prompt SHALL display a message indicating that a new version is available, and SHALL present both a reload action and a dismiss action.
3. WHEN the user activates the reload action, THE application SHALL instruct the Waiting_Worker to activate and then reload the page.
4. IF the Waiting_Worker fails to activate after the user accepts the reload action, THEN THE application SHALL display an error indication and retain the Update_Prompt so the user may retry.
5. WHEN the user dismisses the Update_Prompt, THE application SHALL hide the prompt for the remainder of the current page session and allow the user to continue using the current version.
6. WHEN the controllerchange event fires on the Service_Worker registration, THE application SHALL reload the page to load the new version.

### Requirement 6: Old Cache Cleanup During Activation

**User Story:** As a user, I want the service worker to clean up outdated caches when a new version activates, so that storage space is not wasted on stale assets.

#### Acceptance Criteria

1. WHEN a new Service_Worker activates, THE Service_Worker SHALL delete all caches whose names do not end with the current Cache_Version identifier.
2. WHEN a new Service_Worker activates, THE Service_Worker SHALL retain only the caches used for precached app-shell assets, fonts, and images that include the current Cache_Version in their name.
3. IF deletion of one or more caches fails during activation, THEN THE Service_Worker SHALL log the error to the console and resolve the activate event successfully so that activation is not blocked.

### Requirement 7: Runtime Caching for Non-Precached Assets

**User Story:** As a user, I want images and lazily-loaded resources to be cached as I use them, so that previously visited content remains available offline.

#### Acceptance Criteria

1. WHEN a same-origin image request is received (matching file extensions: svg, png, jpg, webp, ico), THE Service_Worker SHALL use a cache-first strategy, serving from the image cache if available, or fetching from the network and caching the response only if the network response status is ok.
2. WHEN a same-origin font request is received (matching file extensions: woff2, woff, ttf, otf), THE Service_Worker SHALL use a cache-first strategy with the font cache, caching the response only if the network response status is ok.
3. IF the image cache exceeds 60 entries, THEN THE Service_Worker SHALL evict the least-recently-used entry before storing a new one.
4. IF a runtime-cached asset is not in the cache and the network request fails, THEN THE Service_Worker SHALL respond with a 503 Service Unavailable status.
5. THE Service_Worker SHALL not intercept cross-origin requests and SHALL let them pass through to the network without caching.

### Requirement 8: Service Worker Registration and Lifecycle Management

**User Story:** As a developer, I want a robust service worker registration module that handles lifecycle events, so that the update prompt and caching work correctly across page loads.

#### Acceptance Criteria

1. WHEN the application loads in a production environment and the browser supports the Service Worker API, THE application SHALL register the Service_Worker after the window load event fires.
2. WHEN registration succeeds, THE application SHALL listen for the updatefound event on the registration.
3. WHEN a new installing worker transitions to the waiting state, THE application SHALL notify the Update_Prompt component that an update is available.
4. WHEN registration succeeds and the registration already has a waiting worker, THE application SHALL immediately notify the Update_Prompt component that an update is available.
5. IF Service_Worker registration fails, THEN THE application SHALL log the failure to the console and continue operating without offline caching.
