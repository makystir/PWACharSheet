# Requirements: TypeScript 7.0 Upgrade

## Introduction

This spec covers upgrading the project's TypeScript toolchain from the current
version (**5.9.3**) to the latest supported **TypeScript 7.0** release
(**7.0.2**, the current npm `latest` dist-tag), the native Go port of the
compiler ("Project Corsa") that reached general availability on July 8, 2026.
_(7.1.0 exists only as an unsupported `next`/dev build and is out of scope.)_ The port is
faithful to TypeScript 6.0's type-checking semantics, so the primary risks are
not new type errors but rather (a) deprecated compiler options that became hard
errors, (b) silent default-value changes, and (c) tooling that depends on the
not-yet-stable compiler API (notably `typescript-eslint`, which this project
uses).

Because the project is currently on 5.9.x — two majors behind — the upgrade
proceeds in stages: first to **6.0** to surface and clear deprecation warnings,
then to **7.0**. This mirrors Microsoft's recommended path and keeps each step
small and reversible.

This upgrade also closes a pre-existing gap: the project has **no type-check
step** in its build (`vite build` transpiles but does not type-check) and CI
never runs `tsc`. The upgrade adds a real type-check gate so the faster compiler
actually protects the build.

### Current state (verified)

- `typescript`: `~5.9.3`; `typescript-eslint`: `^8.70.1`.
- Three tsconfigs: root (project references only), `tsconfig.app.json` (src),
  `tsconfig.node.json` (vite.config.ts).
- Both leaf configs already use `moduleResolution: "bundler"`,
  `module: "esnext"`, `strict: true`, explicit `types`, and `noEmit: true`.
- **None** of the 7.0 hard-error options are present (no `baseUrl`, no `paths`,
  no `target: es5`, no `esModuleInterop: false`, no `moduleResolution: node`,
  no `ignoreDeprecations`).
- Scripts: `dev`, `build` (`vite build`), `build:docker`, `preview`. No
  `typecheck` or `lint` script; no `tsc` invocation anywhere.
- CI: `.github/workflows/pages.yml` runs `npm ci` + `npm run build` on Node 22;
  `.github/workflows/deploy.yml` builds a Docker image. Neither type-checks.
- ESLint flat config uses `typescript-eslint`, which imports the TypeScript
  compiler API.

### Sources

- Migration guide: <https://gist.github.com/nafiskabbo/01ccb4970515413076f3759486c39755>
- Announcing TypeScript 7.0: <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- TypeScript 7.0 RC: <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0-rc/>

_Content from external sources was rephrased for compliance with licensing restrictions._

---

## Requirements

### Requirement 1 — Establish a type-check baseline before upgrading

**User Story:** As a developer, I want a recorded baseline of the current type
state, so that after the upgrade I can distinguish real regressions from
expected changes.

#### Acceptance Criteria

1. WHEN the upgrade work begins THEN a `typecheck` npm script SHALL exist that
   runs `tsc --build --noEmit` (or `tsc -p` per config) against the current
   5.9.3 compiler.
2. WHEN the baseline type-check is run on the unchanged codebase THEN it SHALL
   complete and its full output SHALL be captured to a baseline file for later
   comparison.
3. IF the baseline type-check reports any errors on the current code THEN those
   errors SHALL be recorded and fixed (per the fix-errors rule) or explicitly
   documented before the version bump, so the baseline is clean.
4. WHEN stale build artifacts exist THEN all `*.tsbuildinfo` files outside
   `node_modules` SHALL be deleted before the upgrade, because the Go compiler's
   incremental format is not compatible with the old one.

### Requirement 2 — Stage through TypeScript 6.0 to clear deprecations

**User Story:** As a developer, I want to pass through 6.0 first, so that any
option that becomes a hard error in 7.0 is surfaced as a warning I can fix in a
small, reversible step.

#### Acceptance Criteria

1. WHEN upgrading THEN TypeScript SHALL first be moved to `6.x` and a full
   type-check run.
2. WHEN the 6.0 type-check emits deprecation warnings THEN each warning SHALL be
   resolved by fixing the underlying option, NOT by adding
   `ignoreDeprecations: "6.0"` (which stops working in 7.0).
3. WHEN the 6.0 stage is complete THEN the type-check SHALL pass with no
   deprecation warnings and no new errors relative to the Requirement 1
   baseline.
4. IF no deprecated options are present (expected, given current state) THEN
   this stage SHALL be documented as a clean pass and the work MAY proceed
   directly to 7.0.

### Requirement 3 — Upgrade to TypeScript 7.0

**User Story:** As a developer, I want the project on TypeScript 7.0, so that
type-checks and builds benefit from the faster native compiler.

#### Acceptance Criteria

1. WHEN the upgrade is applied THEN `devDependencies.typescript` in
   `package.json` SHALL be pinned to `7.0.2` (the latest supported release /
   npm `latest` dist-tag) for reproducible CI.
2. WHEN dependencies are installed THEN `npx tsc --version` SHALL report
   `7.0.2`.
3. WHEN the 7.0 type-check is run THEN its output SHALL be diffed against the
   baseline, AND every new error SHALL map to a documented 7.0 change (strict
   default, moved defaults, or removed option).
4. WHEN new type errors surface THEN they SHALL be fixed properly at the source,
   NOT suppressed with `@ts-ignore`, `@ts-expect-error`, or by disabling
   `strict`, unless a specific suppression is justified and explained.
5. WHEN the upgrade is complete THEN `npm run typecheck` and `npm run build`
   SHALL both succeed locally.

### Requirement 4 — Reconcile tsconfig with 7.0 defaults and removals

**User Story:** As a developer, I want the tsconfig files reviewed against 7.0's
new defaults and removed options, so that build behavior is explicit and does
not silently change.

#### Acceptance Criteria

1. WHEN the tsconfigs are reviewed THEN any option that is a hard error in 7.0
   (`baseUrl`, `paths` relative to `baseUrl`, `target: es5`,
   `esModuleInterop: false`, `allowSyntheticDefaultImports: false`,
   `moduleResolution: node/node10/classic`, `module: amd/umd/system/none`,
   `ignoreDeprecations`) SHALL be confirmed absent or removed/rewritten. _(Note:
   current inspection shows none are present.)_
2. WHEN relying on defaults THEN `target`, `module`, and `moduleResolution`
   SHALL remain explicitly set (they already are: `ES2023` / `ESNext` /
   `bundler`) so 7.0's default shifts do not change behavior.
3. WHEN the `types` field is reviewed THEN it SHALL remain explicitly set per
   config (`["vite/client"]` for app, `["node"]` for node) to match 7.0's
   non-auto-discovery behavior.
4. IF `rootDir` is relevant to any config THEN it SHALL be set explicitly;
   because all leaf configs use `noEmit: true`, emit-path nesting is not a
   concern and this MAY be documented as not applicable.
5. WHEN tsconfig changes are made THEN each change SHALL be summarized in the
   design/task notes for review.

### Requirement 5 — Keep typescript-eslint working via the 6.0 compiler API

**User Story:** As a developer, I want linting to keep working after the
upgrade, so that the lint gate is not broken by 7.0's not-yet-stable compiler
API.

#### Acceptance Criteria

1. WHEN TypeScript 7.0 is installed THEN the compatibility risk for
   `typescript-eslint` (which imports the compiler API) SHALL be evaluated.
2. IF `typescript-eslint` fails or misbehaves against the 7.0 API THEN the
   `@typescript/typescript6` compatibility alias SHALL be added so ESLint uses
   the 6.0 API while the build/type-check uses 7.0, per the migration guide.
3. WHEN the compatibility approach is chosen THEN it SHALL be documented,
   including the intent to remove the alias once tooling supports the stable
   API in TypeScript 7.1.
4. WHEN the approach is applied THEN running ESLint over the codebase SHALL
   complete without compiler-API crashes.

### Requirement 6 — Add a type-check gate to build and CI

**User Story:** As a maintainer, I want type errors to fail the build and CI, so
that the upgrade delivers real safety and not just speed.

#### Acceptance Criteria

1. WHEN the `build` script runs THEN it SHALL type-check before bundling by
   running `tsc --build && vite build`, so type errors fail the build.
   _(Confirmed decision. This closes a pre-existing gap where `vite build` did
   not type-check. The `build:docker` script SHALL be updated the same way.)_
2. WHEN CI runs (`pages.yml`) THEN it SHALL execute the type-check step so type
   errors block deployment.
3. IF adding the type-check to CI meaningfully increases build time THEN the
   7.0 parallelism flags (e.g. `--checkers`) MAY be considered, but SHALL only
   be added when measured, not preemptively.
4. WHEN CI is updated THEN the Node version SHALL remain compatible with the
   project's `engines`/`.nvmrc` (Node 22) requirement.

### Requirement 7 — Verify the app and tests still work

**User Story:** As a developer, I want the full verification suite to pass after
the upgrade, so that I know the app builds and behaves the same.

#### Acceptance Criteria

1. WHEN the upgrade is complete THEN the existing test suite (vitest) SHALL run
   and pass.
2. WHEN the app is built THEN `npm run build` SHALL produce a working `dist`
   output.
3. IF any test or build breakage is introduced by the upgrade THEN it SHALL be
   fixed at the root cause before the upgrade is considered complete.
4. WHEN verification finishes THEN any temporary baseline/diff files created for
   comparison SHALL be cleaned up or added to `.gitignore` as appropriate.

### Requirement 8 — Documentation and reviewability

**User Story:** As a reviewer, I want a clear record of what changed and why, so
that the upgrade is easy to review and roll back if needed.

#### Acceptance Criteria

1. WHEN the upgrade is complete THEN a short summary SHALL list: the version
   change, every tsconfig change, every new type error fixed, the
   eslint/compiler-API decision, and the build/CI changes.
2. WHEN anything was uncertain or interpreted THEN it SHALL be flagged for human
   review rather than resolved silently.
3. WHEN the upgrade touches no game mechanics THEN this SHALL be noted (this is
   a tooling-only change and does not affect WFRP4e rules compliance).
