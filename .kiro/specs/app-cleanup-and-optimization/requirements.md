# Requirements Document

## Introduction

This feature covers a comprehensive codebase cleanup, housekeeping, and optimization pass for the WFRP 4e PWA Character Sheet application. The scope includes removing dead code and stale build artifacts, consolidating duplicate logic, improving bundle size and performance through code splitting and font self-hosting, hardening PWA capabilities with proper caching and offline support, fixing TypeScript strictness issues, improving accessibility, cleaning up build/CI configuration, and organizing the root directory.

## Glossary

- **Build_System**: The Vite 8 bundler and associated configuration responsible for compiling, bundling, and outputting the application
- **Service_Worker**: The JavaScript worker thread that intercepts network requests and provides offline caching for the PWA
- **App_Shell**: The minimal HTML, CSS, and JavaScript required to render the application layout and navigation
- **Router**: The hash-based routing logic in `App.tsx` that determines which page component to render
- **Calculator_Module**: The `src/logic/calculators.ts` module containing armour point and wound calculation functions
- **Dice_Roller_Module**: The `src/logic/dice-roller.ts` module containing opposed test resolution functions
- **Manifest**: The `public/manifest.json` file that defines PWA metadata, icons, and display behavior
- **CI_Pipeline**: The GitHub Actions workflows (`deploy.yml` and `pages.yml`) that build and deploy the application
- **ErrorBoundary**: The React error boundary component in `App.tsx` that catches and displays runtime errors
- **VCS**: Version control system (Git) used to track source code changes

## Requirements

### Requirement 1: Dead Code Removal

**User Story:** As a developer, I want unused files and scaffold leftovers removed from the source tree, so that the codebase is lean and free of confusion about what is actively used.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE Build_System SHALL produce a successful build (zero TypeScript compilation errors and zero Vite bundling errors) with no import statements, require calls, or path strings referencing `src/assets/react.svg` or `src/assets/vite.svg`
2. WHEN the cleanup is complete, THE source tree SHALL NOT contain `src/assets/react.svg` or `src/assets/vite.svg`
3. WHEN the cleanup is complete, THE source tree SHALL NOT contain `src/assets/hero.png` (confirmed unreferenced)
4. WHEN the cleanup is complete, THE source tree SHALL NOT contain `src/styles/theme.ts` (confirmed unreferenced; theming uses CSS custom properties in `global.css`)
5. WHEN the cleanup is complete, THE file `careeradvanceschemes.json` SHALL reside in `src/data/` rather than the project root, and all existing import or require paths referencing it SHALL be updated to reflect the new location
6. WHEN the cleanup is complete, THE Build_System SHALL produce a passing test suite with zero failures caused by missing files or broken import paths

### Requirement 2: Stale Build Artifact Removal

**User Story:** As a developer, I want committed build artifacts removed from version control and prevented from being recommitted, so that the repository stays small and the source of truth is the source code alone.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE VCS SHALL NOT track the root-level `assets/` folder (compiled JS/CSS build output), verified by `git ls-files assets/` returning no results
2. WHEN the cleanup is complete, THE VCS SHALL NOT track the root-level `dist/` folder, verified by `git ls-files dist/` returning no results
3. WHEN the cleanup is complete, THE VCS SHALL NOT track root-level duplicates of `public/` contents: `404.html`, `manifest.json`, `favicon.svg`, `icons/`, `icons.svg`, verified by `git ls-files` returning no results for each listed path
4. WHEN the cleanup is complete, THE `.gitignore` file SHALL contain entries that exclude from tracking the root-level paths `assets/`, `dist/`, `404.html`, `manifest.json`, `favicon.svg`, `icons/`, and `icons.svg`, using `/` prefix notation to scope entries to the repository root only
5. WHEN the cleanup is complete, THE Build_System SHALL produce a zero-exit-code build via `vite build` and the application SHALL serve without console errors referencing missing files that were present in `public/`
6. IF a developer stages a file matching any path listed in criterion 4, THEN THE VCS SHALL reject the file from tracking due to the `.gitignore` entry, verified by `git add <path>` resulting in no staged changes for that path

### Requirement 3: Duplicate Logic Consolidation in Calculator Module

**User Story:** As a developer, I want overlapping armour-point and wound-calculation functions consolidated, so that bug fixes apply in one place and the logic is easier to reason about.

#### Acceptance Criteria

1. WHEN a caller needs armour points per location, THE Calculator_Module SHALL expose a single unified armour-point function that accepts an options parameter controlling whether to filter by worn status and whether shield AP is included, replacing the overlapping logic currently split between `calculateArmourPoints` and `computeAPByLocation`
2. WHEN a caller needs the wound maximum, THE Calculator_Module SHALL expose a single core wound-calculation function, and the wrapper functions (`syncWoundFields`, `computeWoundMaximum`) SHALL delegate to that core implementation without adding independent calculation logic beyond parameter adaptation and return-type mapping
3. THE Calculator_Module's wrapper functions (`syncWoundFields`, `computeWoundMaximum`) SHALL preserve their existing call signatures so that current callers and tests require no changes
4. THE Calculator_Module SHALL NOT export both `calculateArmourPoints` and `computeAPByLocation` as independent implementations performing overlapping logic
5. WHEN the consolidation is complete, THE project's full test suite (unit and property tests) SHALL pass with no regressions and no skipped tests that previously passed

### Requirement 4: Duplicate Logic Consolidation in Dice Roller Module

**User Story:** As a developer, I want the opposed-test resolution functions to share implementation, so that the combat resolution logic has a single source of truth.

#### Acceptance Criteria

1. WHEN opposed test resolution is needed, THE Dice_Roller_Module SHALL implement `resolveOpposedTest` such that it delegates winner determination (including tie-breaking) to `calculateOpposedResult` rather than containing its own inline winner-determination logic.
2. THE `calculateOpposedResult` function SHALL remain the single source of truth for computing the `winner` field from `playerSL`, `opponentSL`, and optional `playerTarget`/`opponentTarget` parameters, with no winner-determination logic duplicated elsewhere in the module.
3. WHEN `resolveOpposedTest` is called, THE function SHALL compute player and opponent SL values via `resolveRoll`, then pass those SL values and the target numbers to `calculateOpposedResult` to obtain the `netSL` and `winner` fields of the returned `OpposedTestResult`.
4. WHEN the consolidation is complete, THE existing test suite SHALL pass with no regressions, including all unit tests in `dice-roller.test.ts`, `dice-roller.property.test.ts`, and `rules-compliance.property.test.ts`.
5. IF any caller imports both `resolveOpposedTest` and `calculateOpposedResult`, THEN THE public API signatures and return types of both functions SHALL remain backward-compatible with no changes to parameter order, parameter types, or return shape.

### Requirement 5: Code Splitting for Non-Default Pages

**User Story:** As a user, I want the initial page load to be fast, so that I can start interacting with my character sheet without waiting for all pages to download.

#### Acceptance Criteria

1. THE Router SHALL load CombatPage, EstatePage, EndeavoursPage, RetinuePage, AdvancementPage, and SettingsPage using `React.lazy()` with dynamic imports, while CharacterPage SHALL remain in the main bundle as the default route
2. WHILE a lazily-loaded page is being fetched, THE Router SHALL display a visible loading indicator within a `React.Suspense` boundary that includes an accessible label (e.g., aria-label or visible text) indicating content is loading
3. IF a lazily-loaded chunk fails to fetch due to a network error, THEN THE Router SHALL display an error message indicating the page could not be loaded and provide a retry mechanism to re-attempt the load
4. WHEN the application is built, THE Build_System SHALL produce separate chunks for each lazily-loaded page, verifiable by the presence of at least 6 distinct chunk files in the build output corresponding to the lazy-loaded pages
5. WHEN the application is built, THE Build_System SHALL produce a separate vendor chunk containing third-party dependencies from node_modules and separate data-module chunks for application data files, configured via a `manualChunks` function in the Vite `rollupOptions` build configuration

### Requirement 6: Self-Hosted Fonts

**User Story:** As a user with limited or no internet connectivity, I want fonts to be bundled with the application, so that the UI renders correctly offline without depending on Google Fonts CDN.

#### Acceptance Criteria

1. THE Build_System SHALL bundle Cinzel (weights 400, 600, 700) and Inter (weights 300, 400, 500, 600) fonts from `@fontsource/cinzel` and `@fontsource/inter` packages into the production build output
2. WHEN the application loads offline, THE App_Shell SHALL render text using the self-hosted Cinzel and Inter fonts without issuing any network requests to external font CDNs
3. THE stylesheet `global.css` SHALL NOT contain any `@import` or `url()` references to `fonts.googleapis.com` or `fonts.gstatic.com`
4. WHEN the production build completes, THE Build_System SHALL include font files for all specified weights such that each font-family declaration in the application resolves to a locally-served file

### Requirement 7: Lazy-Loading Static Data Modules

**User Story:** As a user, I want large reference data (careers, talents, weapons, spells, critical-wound-tables, diseases) loaded only when needed, so that initial bundle size is minimized.

#### Acceptance Criteria

1. WHEN a page that imports a lazy-loaded data module is navigated to, THE Application SHALL trigger a dynamic import of that data module before rendering the page content
2. WHILE a lazy-loaded data module is being fetched, THE Application SHALL display a loading indicator in place of the page content
3. IF a dynamic import of a lazy-loaded data module fails, THEN THE Application SHALL display an error message indicating the module could not be loaded and offer a retry action
4. THE Build_System SHALL produce at least one separate chunk per lazy-loaded data module (careers, talents, weapons, spells, critical-wound-tables, diseases) so that each is independently cacheable
5. WHEN the application is built, THE entry-point JavaScript bundle SHALL NOT contain the contents of any lazy-loaded data module, verifiable by inspecting the Vite build output for chunk separation

### Requirement 8: Service Worker Caching Strategy

**User Story:** As a user, I want the application to work reliably offline after the first visit, so that I can use my character sheet during sessions without internet.

#### Acceptance Criteria

1. WHEN the Service_Worker is installed, THE Service_Worker SHALL precache all App_Shell resources (the root HTML document, CSS files, and JavaScript chunks) so they are available offline without requiring a prior fetch for each resource
2. THE Service_Worker SHALL implement a cache-first strategy for self-hosted font files
3. THE Service_Worker SHALL implement a cache-first strategy for static image assets (SVG icons, PNG images referenced in the application)
4. WHEN the Service_Worker detects that a new version of the sw.js file is available during a navigation request, THE Service_Worker SHALL install the updated worker and refresh the cached App_Shell resources upon activation, removing caches from the previous version
5. IF a network request fails and no cached response exists, THEN THE Service_Worker SHALL respond with a cached offline fallback page that indicates the requested content is unavailable offline and provides a link to return to the cached App_Shell
6. THE `public/` folder SHALL contain an `offline.html` fallback page that the Service_Worker precaches on installation
7. WHEN the Service_Worker activates after an update, THE Service_Worker SHALL delete any previously versioned caches that do not match the current cache version identifier

### Requirement 9: PWA Manifest and Icon Improvements

**User Story:** As a user installing the PWA on mobile, I want proper icon support across platforms, so that the app icon renders correctly on home screens and app launchers.

#### Acceptance Criteria

1. THE Manifest SHALL include at least one icon entry with `"purpose": "any maskable"` set on an icon of size 192x192 or larger
2. THE Manifest SHALL include PNG icon entries at 192x192 and 512x512 sizes with `"type": "image/png"` specified for each entry
3. THE `public/icons/` folder SHALL contain `icon-192.png` and `icon-512.png` raster files
4. THE `index.html` SHALL contain a `<link rel="apple-touch-icon" sizes="180x180">` tag with an `href` attribute referencing a 180x180 PNG icon path
5. THE `public/icons/` folder SHALL contain an `icon-180.png` file for the Apple touch icon

### Requirement 10: TypeScript Strictness Fixes

**User Story:** As a developer, I want all type-unsafe casts eliminated from production source code, so that the type system provides maximum safety guarantees.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE file `src/logic/talents.ts` SHALL NOT contain `{} as any` and SHALL initialize `Record<CharacteristicKey, number>` using either `Object.fromEntries` with a mapped array or a loop that assigns each key before returning, such that the resulting variable requires no `as any` or `as unknown` cast
2. WHEN the cleanup is complete, THE file `src/storage/migration.ts` SHALL NOT contain any `as unknown as` cast chains and SHALL use either a type guard function that validates the shape of the merged object before returning it as `Character`, or a generic signature on `deepMerge` that returns the target type without requiring manual cast
3. THE `tsconfig.app.json` SHALL retain `"strict": true` (confirmed already set)
4. WHEN the cleanup is complete, THE Build_System SHALL produce a successful build with zero TypeScript errors when running the project's type-check command against the `src/` directory
5. WHEN the cleanup is complete, THE `src/` directory SHALL contain zero occurrences of `as any` or `as unknown as` in any `.ts` or `.tsx` file

### Requirement 11: Accessibility Improvements

**User Story:** As a user relying on assistive technology, I want proper ARIA landmarks and non-color-dependent indicators, so that I can navigate and understand the application state.

#### Acceptance Criteria

1. THE `index.html` SHALL contain a skip-to-content link as the first focusable element inside `<body>` that targets the main content container via a matching fragment identifier (e.g., `href="#main-content"` pointing to an element with `id="main-content"`), is visually hidden by default, and becomes visible when focused
2. THE ErrorBoundary component SHALL render its error message container with `role="alert"` so screen readers announce errors immediately upon rendering
3. WHILE a character condition is active, THE condition indicator SHALL display the condition name as a text label within the badge, ensuring the active state is perceivable without relying solely on color

### Requirement 12: Build and Configuration Hygiene

**User Story:** As a developer, I want consistent and reproducible builds with proper Node version pinning and test coverage reporting, so that CI is reliable and local development matches production.

#### Acceptance Criteria

1. THE Dockerfile SHALL use `npm ci` instead of `npm install` for dependency installation in the build stage
2. THE project root SHALL contain an `.nvmrc` file specifying the pinned Node.js major version as `20`
3. THE `package.json` SHALL contain an `"engines"` field specifying `"node": ">=20"`
4. THE Vite test configuration SHALL include a `coverage` object within `test` specifying `provider: 'v8'` and `reporter: ['text', 'lcov']`
5. THE `.github/workflows` directory SHALL contain both `deploy.yml` (Docker self-hosted deployment) and `pages.yml` (GitHub Pages deployment) workflow files
6. THE Dockerfile, `.nvmrc`, `pages.yml` `node-version`, and `package.json` `engines` field SHALL all reference the same Node.js major version (20)

### Requirement 13: CSS Housekeeping

**User Story:** As a developer, I want clean, consistent styling with no dead CSS or mixed approaches, so that the design system is maintainable.

#### Acceptance Criteria

1. THE source tree SHALL NOT contain CSS class declarations in `.module.css` files that are not referenced by any source file importing that module
2. THE ErrorBoundary component in `App.tsx` SHALL use a CSS module for its styling instead of inline styles, preserving the existing visual layout and appearance
3. WHEN `vite build` is executed after all CSS changes are applied, THE Build_System SHALL produce a successful build with zero warnings emitted by Vite's CSS processing pipeline
4. THE source tree SHALL NOT contain inline `style` attributes in component render methods where a co-located CSS module exists for that component

### Requirement 14: Root Directory Organization

**User Story:** As a developer, I want documentation files organized in a `docs/` folder, so that the project root is clean and navigable.

#### Acceptance Criteria

1. WHEN the cleanup is complete, THE project root SHALL contain a `docs/` directory
2. WHEN the cleanup is complete, THE `docs/` folder SHALL contain: `dwarfguide.md`, `highelfguide.md`, `PLAYER-GUIDE.md`, `GAP_ANALYSIS.md`, `RULES_COMPLIANCE_AUDIT.md`, and `Errata.pdf`
3. WHEN the cleanup is complete, THE project root SHALL NOT contain `dwarfguide.md`, `highelfguide.md`, `PLAYER-GUIDE.md`, `GAP_ANALYSIS.md`, `RULES_COMPLIANCE_AUDIT.md`, or `Errata.pdf` as top-level files
4. WHEN the cleanup is complete, THE `.gitignore` SHALL update any ignore patterns that reference moved files by root-relative path (e.g., `/dwarfguide.md`) to use the new `docs/` path, and SHALL leave glob patterns (e.g., `*.pdf`) and bare filename patterns (e.g., `dwarfguide.md`) unchanged since they match regardless of directory depth
5. WHEN the cleanup is complete, THE `README.md` SHALL update any relative links or references to the moved files to point to their new `docs/` location (e.g., `./dwarfguide.md` becomes `./docs/dwarfguide.md`)
