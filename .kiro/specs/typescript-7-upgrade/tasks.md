# Tasks: TypeScript 7.0 Upgrade

Target: TypeScript **7.0.2** (latest supported). Staged 5.9 → 6.0 → 7.0.2.
Recommend doing this on a dedicated branch and merging via PR (see rollback plan
in design).

- [x] 1. Establish a clean type-check baseline on the current compiler
  - Add `"typecheck": "tsc --build --noEmit"` to `package.json` scripts.
  - Add `"test": "vitest run"` to `package.json` scripts (needed for verification).
  - Run `npm run typecheck` on the unchanged 5.9.3 code and save output to a
    temporary `ts-baseline.txt`.
  - If the baseline reports any errors, fix them at the source before proceeding
    so the comparison point is clean.
  - _Requirements: 1.1, 1.2, 1.3, 7 (test script)_

- [x] 2. Clear stale incremental build artifacts
  - Delete all `*.tsbuildinfo` files outside `node_modules` (and the project's
    `node_modules/.tmp/*.tsbuildinfo`, which the Go compiler regenerates in a
    new format).
  - _Requirements: 1.4_

- [x] 3. Stage through TypeScript 6.0
  - `npm install -D typescript@6`.
  - Run `npm run typecheck`; resolve any deprecation warnings by fixing the
    underlying option (do NOT use `ignoreDeprecations`).
  - Confirm a clean pass with no new errors vs. baseline; document the outcome
    (expected: clean, no changes needed).
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Upgrade to TypeScript 7.0.2
  - `npm install -D typescript@7.0.2` (pinned exact version).
  - Verify `npx tsc --version` reports `7.0.2`.
  - Run `npm run typecheck > ts7.txt 2>&1` and diff against `ts-baseline.txt`.
  - Map every new diagnostic to a documented 7.0 change and fix at the source
    (no `@ts-ignore` / disabling `strict` unless justified and explained).
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Reconcile tsconfig files with 7.0
  - Verify `tsconfig.app.json`, `tsconfig.node.json`, and root `tsconfig.json`
    against the 7.0 checklist (no `baseUrl`/`paths`, no `es5`, explicit
    `target`/`module`/`moduleResolution`/`types`, `noEmit` so `rootDir` N/A, no
    `ignoreDeprecations`).
  - Expected: no changes. If any check fails, fix per the migration table and
    record it.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Verify and reconcile `typescript-eslint`
  - Run ESLint over the codebase against TS 7.0.2.
  - If it works: no change (preferred).
  - If it crashes on the compiler API: add the `@typescript/typescript6` alias
    so ESLint uses the 6.0 API while the build uses 7.0.2; wire it per what
    `typescript-eslint` requires and document it.
  - Record the decision plus a TODO to drop the alias at TS 7.1.
  - Confirm ESLint completes without compiler-API crashes.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Add the type-check gate to build scripts
  - Update `"build"` → `"tsc --build && vite build"`.
  - Update `"build:docker"` → `"tsc --build && vite build --base /"`.
  - Confirm both fail on an intentional type error and pass on clean code.
  - _Requirements: 6.1_

- [x] 8. Add the type-check gate to CI
  - In `.github/workflows/pages.yml`, add an explicit `npm run typecheck` step
    after `npm ci` and before `npm run build`.
  - Keep Node at 22 (matches `.nvmrc` / `engines`).
  - Verify `deploy.yml`/Dockerfile inherit the gate via the updated `build`
    script (no direct edit expected; confirm).
  - Do NOT add `--checkers` yet (only if a measured slowdown warrants it).
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 9. Full verification
  - `npm run typecheck` passes.
  - `npm run test` (vitest) passes; fix any upgrade-introduced breakage at the
    root cause.
  - `npm run build` produces a working `dist`.
  - Remove temp `ts-baseline.txt` / `ts7.txt` (or add to `.gitignore`).
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10. Document the change for review
  - Summarize: version change (5.9.3 → 7.0.2), any tsconfig changes, any new
    type errors fixed, the eslint/compiler-API decision, and the build/CI
    changes.
  - Flag anything uncertain for human review.
  - Note that this is a tooling-only change with no WFRP4e game-mechanics impact.
  - _Requirements: 8.1, 8.2, 8.3_
