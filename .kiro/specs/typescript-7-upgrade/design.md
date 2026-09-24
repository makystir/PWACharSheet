# Design: TypeScript 7.0 Upgrade

## Overview

Upgrade the toolchain from TypeScript **5.9.3** to **7.0.2** (latest supported
release / npm `latest`). The 7.0 compiler is a native Go port with type-checking
semantics faithful to 6.0, so the design treats this as a **low-risk, staged
tooling change** rather than a code migration. The main deliverables are:

1. A staged version bump (5.9 → 6.0 to clear deprecations → 7.0.2).
2. A new type-check gate wired into `build`, `build:docker`, and CI.
3. A compatibility strategy for `typescript-eslint` against the not-yet-stable
   7.0 compiler API.

The design is intentionally conservative: explicit configs, recorded baselines,
diff-driven fixes, and a documented rollback.

## Architecture / Context

### Affected files

| File | Change |
|------|--------|
| `package.json` | Bump `typescript` → `7.0.2`; add `typecheck` script; update `build` and `build:docker` to type-check first; possibly add `@typescript/typescript6` alias for ESLint. |
| `tsconfig.app.json` | Review only; expected no change (already 7.0-aligned). |
| `tsconfig.node.json` | Review only; expected no change. |
| `tsconfig.json` | Review only (references-only root); expected no change. |
| `.github/workflows/pages.yml` | Add a type-check step before/within build. |
| `eslint.config.js` | Only if the compiler-API alias is needed. |
| `node_modules/.tmp/*.tsbuildinfo` | Deleted (stale, incompatible incremental format). |

### What is NOT changing

- No source-code refactors beyond fixing genuine new type errors.
- No new strictness flags (out of scope — this is a version upgrade, not a
  strictness tightening).
- No game mechanics (tooling-only; WFRP4e rules compliance unaffected).
- `deploy.yml` (Docker) — it calls `docker build`, which runs the Dockerfile;
  type-checking flows in through the updated `build` script the Dockerfile uses.
  Verified during implementation; no direct edit expected.

## Detailed Design

### 1. Baseline (Req 1)

Add a `typecheck` script and capture a clean baseline on the **current 5.9.3**
compiler before touching versions.

```jsonc
// package.json scripts (added)
"typecheck": "tsc --build --noEmit"
```

Steps:
1. `npm run typecheck` on unchanged code → save output to `ts-baseline.txt`
   (git-ignored / temp).
2. Delete stale incremental artifacts:
   `Get-ChildItem -Recurse -Filter *.tsbuildinfo | Where-Object { $_.FullName -notmatch 'node_modules' } | Remove-Item`
   — note: the project's `.tsbuildinfo` files live under `node_modules/.tmp`
   (per `tsBuildInfoFile`), which the Go compiler will regenerate; they are
   removed so the new incremental format starts clean.
3. If the baseline shows any errors, fix them first (fix-errors rule) so the
   comparison point is clean.

> Note on `tsc --build --noEmit`: the root `tsconfig.json` uses project
> references, so `--build` is the correct driver. `--noEmit` is redundant with
> the per-config `noEmit: true` but is kept explicit for clarity and to make the
> script safe if a config ever emits.

### 2. Stage through 6.0 (Req 2)

```
npm install -D typescript@6
npm run typecheck
```

Expected result given current config: **clean pass, no deprecation warnings**,
because none of the deprecated options are present. If warnings appear, fix the
underlying option (never `ignoreDeprecations`). Document the outcome. This stage
is a safety checkpoint, not expected to require code changes.

### 3. Upgrade to 7.0.2 (Req 3)

```
npm install -D typescript@7.0.2
npx tsc --version   # expect 7.0.2
npm run typecheck > ts7.txt 2>&1
# compare ts7.txt against ts-baseline.txt
```

Every new diagnostic must map to a known 7.0 change (strict default already on
here; moved defaults; removed options). Fix at the source; no blanket
suppression. Given the config is already `strict` and bundler-mode, we expect
**zero or near-zero** new errors.

### 4. tsconfig reconciliation (Req 4)

Verification checklist (all currently **pass**, so this is confirm-not-change):

| 7.0 concern | Current value | Action |
|-------------|---------------|--------|
| `baseUrl` / `paths` | absent | none |
| `target: es5` | `ES2023` | none (explicit, safe) |
| `module` default shift | `ESNext` (explicit) | none |
| `moduleResolution` node/classic | `bundler` (explicit) | none |
| `esModuleInterop: false` | absent (default-on) | none |
| `types` auto-discovery | explicit (`vite/client` / `node`) | none |
| `rootDir` emit nesting | `noEmit: true` everywhere | N/A |
| `ignoreDeprecations` | absent | none |

If any check fails at implementation time (it should not), fix per the migration
table and record it.

### 5. typescript-eslint compatibility (Req 5)

`typescript-eslint@8.70.1` imports the TypeScript compiler API, which is not
stable in 7.0. Strategy — **test first, alias only if needed**:

1. After installing 7.0.2, run ESLint over the codebase.
2. **If it works** (no compiler-API crash): do nothing. Prefer this — fewer
   moving parts.
3. **If it crashes/misbehaves**: add the compatibility alias so ESLint keeps the
   6.0 API while the build uses 7.0.
4. Record the decision and a TODO to drop the alias once 7.1's stable API lands
   and `typescript-eslint` supports it.

#### Outcome (implemented in Task 6)

**ESLint crashed** against TS 7.0.2, so the alias branch was taken. Running
`npx eslint .` produced a hard error before linting any file:

```
Error: typescript-eslint does not support TS 7.0.
```

`typescript-eslint@8.70.1` explicitly rejects TS 7.0 (peer range
`>=4.8.4 <6.1.0`) and points to the migration guide. The alias was wired
exactly as the guide prescribes, using npm aliases in `package.json`:

```jsonc
// devDependencies
"@typescript/native": "npm:typescript@7.0.2",     // real TS 7.0 — provides `tsc`
"typescript": "npm:@typescript/typescript6@^6.0.2" // re-exported 6.0 API for eslint
```

- `typescript-eslint` imports the compiler via the `typescript` peer dependency;
  aliasing `typescript` → `@typescript/typescript6` gives it the stable 6.0 API,
  so ESLint's parser loads without crashing.
- `@typescript/native` → `typescript@7.0.2` keeps the real 7.0 compiler installed;
  it still ships the `tsc` binary, so `npx tsc --version` reports `7.0.2` and
  `npm run typecheck` / the build type-check on 7.0.2 unchanged.
- No change to `eslint.config.js` was needed — the npm alias alone resolves the
  compiler; no `parserOptions` change required.

**Verified after wiring:** `npm install` completes with no peer-dep error;
`npx tsc --version` → `7.0.2`; `npx eslint .` → exit 0 (only the pre-existing
`react-refresh/only-export-components` warnings, which are intentionally
`warn`-level, remain — zero errors, no compiler-API crash);
`npm run typecheck` → exit 0.

**TODO (drop the alias at TS 7.1):** once `typescript-eslint` supports the stable
API in TS 7.1, remove both aliases and restore a plain `"typescript": "7.0.2"`
(or `7.1.x`). Tracking issue:
<https://github.com/typescript-eslint/typescript-eslint/issues/10940>. The same
TODO is recorded in `package.json` under the `//typescript-eslint-compat` key.

> This "test first" branch is deliberate: adding the alias unconditionally adds
> complexity that may be unnecessary if the installed `typescript-eslint`
> already tolerates 7.0. In this case testing confirmed the alias was required.

### 6. Build + CI type-check gate (Req 6) — confirmed

`package.json` scripts:

```jsonc
"typecheck": "tsc --build --noEmit",
"build": "tsc --build && vite build",
"build:docker": "tsc --build && vite build --base /"
```

- `tsc --build` (without `--noEmit`) is used in `build` so it participates in
  the project-reference build graph; since all leaf configs are `noEmit: true`,
  it type-checks without emitting `.js`, then Vite does the actual bundling.
- CI (`pages.yml`) already runs `npm run build`; because `build` now
  type-checks first, **CI gains the gate automatically**. To surface type
  errors as a distinct, earlier failure we add an explicit step:

```yaml
# .github/workflows/pages.yml (build job, before `npm run build`)
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
```

- Parallelism flags (`--checkers`) are **not** added now; only if a measured CI
  slowdown justifies it (Req 6.3).
- Node stays at 22 (matches `.nvmrc` and `engines`).

### 7. Verification (Req 7)

- `npm run typecheck` → passes.
- `npm run test` (vitest) → passes. A `"test": "vitest run"` script SHALL be
  added (none exists today) to give verification a stable, non-watch entry
  point. _(Confirmed decision.)_
- `npm run build` → produces working `dist`.
- Remove temp `ts-baseline.txt` / `ts7.txt` (or add to `.gitignore`).

## Rollback plan

The change is confined to `package.json`, CI YAML, and possibly
`eslint.config.js`. Rollback = revert those files and run `npm install` to
restore `typescript@5.9.3`. No source or config-semantic changes are expected,
so rollback is clean. Recommend doing the upgrade on a branch and merging via PR.

## Risks & mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| `typescript-eslint` incompatible with 7.0 API | Medium | Test first; `@typescript/typescript6` alias fallback (Req 5). |
| New type errors from moved defaults | Low | Configs already explicit + strict; diff against baseline. |
| Stale `.tsbuildinfo` corrupts incremental build | Low | Delete before upgrade (Req 1.4). |
| CI build time increases | Low | Native compiler is ~10x faster; measure before adding `--checkers`. |
| Vite/plugin-react expecting older TS | Low | Verify `npm run build` post-upgrade; Vite transpiles via esbuild, not tsc. |

## Resolved decisions

1. **`test` script** — confirmed: add `"test": "vitest run"` so verification
   (and any future CI test gate) has a stable, non-watch entry point.
2. **CI typecheck step** — confirmed: keep an explicit `npm run typecheck` step
   in `pages.yml` before `npm run build`, for a clearer/earlier failure signal
   in addition to the gate now built into `build`.
