# Implementation Plan: App Cleanup and Optimization

## Overview

This plan implements a comprehensive codebase cleanup and optimization pass for the WFRP 4e PWA Character Sheet. Tasks are organized into parallelizable workstreams: dead code removal, logic consolidation, performance optimization (code splitting, font self-hosting, lazy data), PWA hardening, code quality improvements, and project organization. The implementation language is TypeScript (React/Vite).

## Tasks

- [x] 1. Dead code removal and stale build artifact cleanup
  - [x] 1.1 Delete unused asset files and update imports
    - Delete `src/assets/react.svg`, `src/assets/vite.svg`, and `src/assets/hero.png`
    - Remove any import statements or path references to these files across the codebase
    - Verify the build completes with zero errors
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [x] 1.2 Delete unreferenced `src/styles/theme.ts`
    - Delete `src/styles/theme.ts`
    - Verify no import references remain
    - _Requirements: 1.4, 1.6_

  - [x] 1.3 Move `careeradvanceschemes.json` to `src/data/`
    - Move `careeradvanceschemes.json` from project root to `src/data/careeradvanceschemes.json`
    - Update all import paths referencing this file
    - Verify build and tests pass
    - _Requirements: 1.5, 1.6_

  - [x] 1.4 Remove stale build artifacts from VCS and update `.gitignore`
    - Run `git rm -r --cached assets/ dist/` to untrack committed build output
    - Run `git rm --cached 404.html manifest.json favicon.svg icons.svg` and `git rm -r --cached icons/` for root-level duplicates of `public/` contents
    - Add entries to `.gitignore` with `/` prefix notation: `/assets/`, `/dist/`, `/404.html`, `/manifest.json`, `/favicon.svg`, `/icons/`, `/icons.svg`
    - Verify `git ls-files assets/ dist/` returns no results
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Calculator module consolidation
  - [x] 2.1 Implement unified armour-point function in `src/logic/calculators.ts`
    - Add `ArmourPointOptions` interface and `APResult` interface as defined in the design
    - Implement `calculateArmourPointsUnified(armourItems, options?)` function
    - Refactor `calculateArmourPoints` and `computeAPByLocation` to become thin wrappers that delegate to the unified function
    - Ensure existing call signatures are preserved
    - _Requirements: 3.1, 3.3, 3.4_

  - [x] 2.2 Implement core wound calculation function in `src/logic/calculators.ts`
    - Extract a `calculateWoundsCore(strength, toughness, willpower, hardyLevel, woundsUseSB)` function
    - Refactor `syncWoundFields` and `computeWoundMaximum` to delegate to the core function
    - Preserve existing call signatures and return types
    - _Requirements: 3.2, 3.3_

  - [x] 2.3 Write property test for unified AP function equivalence (worn filter)
    - **Property 1: Unified AP function equivalence (worn filter)**
    - Create `src/logic/__tests__/calculators.consolidation.property.test.ts`
    - Generate arbitrary armour item lists with fast-check
    - Assert `calculateArmourPointsUnified(items, { filterByWorn: true })` matches `computeAPByLocation(items)` for all six locations
    - **Validates: Requirements 3.1, 3.3**

  - [x] 2.4 Write property test for unified AP function equivalence (all items)
    - **Property 2: Unified AP function equivalence (all items)**
    - In `src/logic/__tests__/calculators.consolidation.property.test.ts`
    - Assert `calculateArmourPointsUnified(items, { filterByWorn: false })` matches `calculateArmourPoints(items)` for all six locations
    - **Validates: Requirements 3.1, 3.4**

  - [x] 2.5 Write property test for wound calculation consistency
    - **Property 3: Wound calculation consistency**
    - In `src/logic/__tests__/calculators.consolidation.property.test.ts`
    - For arbitrary S, T, WP ∈ [0,99], hardyLevel ∈ [0,5], woundsUseSB flag
    - Assert `syncWoundFields` result components sum equals `computeWoundMaximum` output
    - **Validates: Requirements 3.2, 3.3**

- [x] 3. Dice roller module consolidation
  - [x] 3.1 Refactor `resolveOpposedTest` to delegate to `calculateOpposedResult`
    - In `src/logic/dice-roller.ts`, modify `resolveOpposedTest` to compute player/opponent SL via `resolveRoll`, then delegate winner and netSL determination to `calculateOpposedResult`
    - Remove any inline winner-determination logic from `resolveOpposedTest`
    - Preserve existing function signatures and return types
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [x] 3.2 Write property test for opposed test delegation consistency
    - **Property 4: Opposed test delegation consistency**
    - Create `src/logic/__tests__/dice-roller.consolidation.property.test.ts`
    - For arbitrary playerTarget ∈ [1,200], playerRoll ∈ [1,100], opponentTarget ∈ [1,200], opponentRoll ∈ [1,100]
    - Assert `resolveOpposedTest` winner/netSL equals calling `calculateOpposedResult(resolveRoll(...).sl, resolveRoll(...).sl, ...)` directly
    - **Validates: Requirements 4.1, 4.3**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Code splitting with React.lazy
  - [x] 5.1 Create `LazyErrorBoundary` and `LoadingIndicator` components
    - Create a `LazyErrorBoundary` component that catches chunk-load errors and renders a retry button
    - Create a `LoadingIndicator` component with `role="status"` and `aria-label="Loading page content"`
    - Create a `PageLoader` wrapper component combining `Suspense` + `LazyErrorBoundary`
    - _Requirements: 5.2, 5.3_

  - [x] 5.2 Convert page imports to `React.lazy` in `App.tsx`
    - Replace static imports of CombatPage, EstatePage, EndeavoursPage, RetinuePage, AdvancementPage, SettingsPage with `React.lazy(() => import(...))`
    - Keep CharacterPage as a static import (default route)
    - Wrap lazy page renders in `PageLoader` component
    - Add default exports to page components if they only have named exports
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.3 Configure Vite `manualChunks` for vendor and data splitting
    - Add `rollupOptions.output.manualChunks` function to `vite.config.ts`
    - Route `node_modules` imports to a `vendor` chunk
    - Route large data files (careers, talents, weapons, spells, critical-wound-tables, diseases) to individual `data-*` chunks
    - _Requirements: 5.4, 5.5_

  - [x] 5.4 Write unit tests for LazyErrorBoundary and LoadingIndicator
    - Test that LoadingIndicator renders with `role="status"` and accessible label
    - Test that LazyErrorBoundary renders error message and retry button on chunk failure
    - _Requirements: 5.2, 5.3_

- [x] 6. Self-hosted fonts via @fontsource
  - [x] 6.1 Install @fontsource packages and configure font imports
    - Install `@fontsource/cinzel` and `@fontsource/inter`
    - Add CSS imports for Cinzel (400, 600, 700) and Inter (300, 400, 500, 600) in `src/main.tsx`
    - Remove any `@import` or `url()` references to `fonts.googleapis.com` or `fonts.gstatic.com` from `global.css`
    - Verify fonts render correctly in development
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Lazy-loading static data modules
  - [x] 7.1 Convert static data imports to dynamic imports
    - Identify data modules: careers, talents, weapons, spells, critical-wound-tables, diseases
    - Convert their imports in consuming components to `await import(...)` or use a loading pattern with Suspense
    - Ensure loading indicators display while data is fetched
    - Ensure error handling triggers on import failure with retry option
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Checkpoint - Ensure all tests pass after performance changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Service worker caching strategy
  - [x] 9.1 Implement versioned service worker in `public/sw.js`
    - Implement `CACHE_VERSION` constant and named caches (app-shell, fonts, images)
    - Implement `install` event handler to precache app shell URLs including `offline.html`
    - Implement `activate` event handler to delete old versioned caches and claim clients
    - Implement `fetch` event handler with cache-first for fonts/images, network-first with offline fallback for navigation, and stale-while-revalidate for JS/CSS
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_

  - [x] 9.2 Create `public/offline.html` fallback page
    - Create a self-contained HTML page indicating content is unavailable offline
    - Include a link back to the app shell root
    - Style consistently with the application theme
    - _Requirements: 8.5, 8.6_

  - [x] 9.3 Register service worker in `index.html`
    - Add SW registration script to `index.html` (or `main.tsx`)
    - Ensure registration only occurs in production or when served via HTTPS/localhost
    - _Requirements: 8.1, 8.4_

- [x] 10. PWA manifest and icon improvements
  - [x] 10.1 Update manifest and add raster icon files
    - Update `public/manifest.json` to include PNG icon entries at 192x192 and 512x512 with `"type": "image/png"`
    - Add at least one icon with `"purpose": "any maskable"` at 192x192 or larger
    - Create or convert `public/icons/icon-192.png` and `public/icons/icon-512.png` raster files
    - Create `public/icons/icon-180.png` for Apple touch icon
    - Add `<link rel="apple-touch-icon" sizes="180x180" href="icons/icon-180.png">` to `index.html`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. TypeScript strictness fixes
  - [x] 11.1 Fix `as any` in `src/logic/talents.ts`
    - Replace `{} as any` with `Object.fromEntries(ALL_CHAR_KEYS.map(key => [key, 0])) as Record<CharacteristicKey, number>`
    - Verify no `as any` or `as unknown as` remains in the file
    - _Requirements: 10.1, 10.4, 10.5_

  - [x] 11.2 Fix cast chains in `src/storage/migration.ts`
    - Add a generic signature to `deepMerge` that returns `T` directly
    - Remove `as unknown as Character` cast chains from call sites
    - Verify no `as any` or `as unknown as` remains in the file
    - _Requirements: 10.2, 10.4, 10.5_

  - [x] 11.3 Audit remaining `src/` files for `as any` or `as unknown as`
    - Search all `.ts` and `.tsx` files in `src/` for remaining occurrences
    - Fix each occurrence using type-safe alternatives (type guards, generics, proper typing)
    - Verify `tsc --noEmit` passes with zero errors
    - _Requirements: 10.3, 10.4, 10.5_

- [x] 12. Accessibility improvements
  - [x] 12.1 Add skip-to-content link and main content landmark
    - Add `<a href="#main-content" class="skip-link">Skip to content</a>` as first focusable element in `<body>` of `index.html`
    - Add `.skip-link` CSS styles (visually hidden, visible on focus) to `global.css`
    - Ensure `PageContainer` renders its `<main>` element with `id="main-content"`
    - _Requirements: 11.1_

  - [x] 12.2 Add `role="alert"` to ErrorBoundary error rendering
    - In the ErrorBoundary component in `App.tsx`, add `role="alert"` to the error message container div
    - _Requirements: 11.2_

  - [x] 12.3 Add text labels to condition indicators
    - Ensure condition badges in the condition picker/display render the condition name as visible text
    - Verify state is perceivable without relying solely on color
    - _Requirements: 11.3_

- [x] 13. CSS housekeeping
  - [x] 13.1 Extract ErrorBoundary inline styles to a CSS module
    - Create a CSS module for the ErrorBoundary component (or add to an existing App module)
    - Replace all inline `style` attributes in the ErrorBoundary render method with CSS module class references
    - Preserve the existing visual layout and appearance
    - _Requirements: 13.2, 13.4_

  - [x] 13.2 Remove unused CSS class declarations
    - Audit all `.module.css` files for class names not referenced by their importing component
    - Remove dead CSS classes
    - Verify `vite build` produces zero CSS-related warnings
    - _Requirements: 13.1, 13.3_

- [x] 14. Build and CI configuration hygiene
  - [x] 14.1 Update Dockerfile and add Node version pinning
    - Replace `npm install` with `npm ci` in the Dockerfile build stage
    - Create `.nvmrc` file at project root with content `20`
    - Add `"engines": { "node": ">=20" }` to `package.json`
    - Ensure Dockerfile, `.nvmrc`, `pages.yml` `node-version`, and `package.json` engines all reference Node 20
    - _Requirements: 12.1, 12.2, 12.3, 12.6_

  - [x] 14.2 Add test coverage configuration to Vite config
    - Add `coverage: { provider: 'v8', reporter: ['text', 'lcov'] }` to the `test` section of `vite.config.ts`
    - _Requirements: 12.4_

- [x] 15. Root directory organization
  - [x] 15.1 Move documentation files to `docs/` folder
    - Create `docs/` directory
    - Move `dwarfguide.md`, `highelfguide.md`, `PLAYER-GUIDE.md`, `GAP_ANALYSIS.md`, `RULES_COMPLIANCE_AUDIT.md`, and `Errata.pdf` to `docs/`
    - Update any root-relative `.gitignore` patterns referencing moved files
    - Update relative links in `README.md` to point to new `docs/` locations
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 16. Final checkpoint - Ensure all tests pass and build succeeds
  - Run `npx vitest --run` to verify all tests pass
  - Run `npx tsc --noEmit` to verify zero TypeScript errors
  - Run `npx vite build` to verify clean build output
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Vite 8, React 19, TypeScript 5.9, vitest 4, and fast-check 4 (all already configured)
- Git operations (task 1.4) should be committed separately from code changes for clean VCS history

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "11.1", "11.2", "14.1", "14.2", "15.1"] },
    { "id": 1, "tasks": ["1.4", "2.1", "3.1", "6.1", "11.3", "12.1", "12.2", "12.3"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "5.1", "9.2", "10.1", "13.1"] },
    { "id": 3, "tasks": ["2.4", "2.5", "5.2", "9.1", "13.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "7.1", "9.3"] }
  ]
}
```
