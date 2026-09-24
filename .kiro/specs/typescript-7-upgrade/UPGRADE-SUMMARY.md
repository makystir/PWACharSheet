# TypeScript 7.0 Upgrade — Change Summary

_Review document for the `typescript-7-upgrade` spec (Requirement 8)._

This upgrade moved the toolchain from TypeScript **5.9.3** to the native Go
compiler **7.0.2**, and closed a pre-existing gap: the build and CI never
type-checked. It is a **tooling-only change** with **no WFRP4e game-mechanics
impact**, with one exception noted below (a latent WillPower Bonus bug that the
new type-check surfaced and that is now fixed into rulebook compliance).

---

## 1. Version change

| | Before | After |
| --- | --- | --- |
| `typescript` (compiler / `tsc`) | `~5.9.3` | **`7.0.2`** (native Go compiler, "Project Corsa") |
| Staging path | — | 5.9.3 → 6.0.3 → 7.0.2 (each step verified clean) |

Because the project was two majors behind, the bump was staged through **6.0.3**
first to surface any deprecation-turned-hard-error options, then to **7.0.2**.
6.0.3 passed clean with no deprecation warnings, so the move to 7.0.2 was
low-risk.

The install is aliased for tooling compatibility (see §4), so in `package.json`
the real 7.0.2 compiler is pulled in as `@typescript/native`
(`npm:typescript@7.0.2`), which still provides the `tsc` binary used by
`typecheck` / `build`.

## 2. tsconfig changes

**None.** All three configs (`tsconfig.json`, `tsconfig.app.json`,
`tsconfig.node.json`) were reviewed against the 7.0 checklist and were already
aligned:

- No hard-error options present (no `baseUrl`/`paths`, no `target: es5`, no
  `esModuleInterop: false`, no `moduleResolution: node/classic`, no
  `ignoreDeprecations`).
- `target` (`ES2023`), `module` (`ESNext`), and `moduleResolution` (`bundler`)
  are all explicit, so 7.0's default shifts change nothing.
- `types` explicit per config (`["vite/client"]` app, `["node"]` node).
- All leaf configs use `noEmit: true`, so `rootDir` emit-nesting is not
  applicable.

## 3. Type errors fixed

### The baseline surprise

The project had **never type-checked** before this work — `vite build` only
transpiles. The very first `tsc --build` run (still on 5.9.3, to establish the
baseline per Req 1) surfaced roughly **1,983 latent type errors** that had
accumulated invisibly. All were fixed **at the source** so the baseline was
clean before any version bump, and so the diff at 7.0 would show only genuine
7.0 regressions (of which there were none — see §5).

The fixes broke down into these categories:

| Category | ~Count | What it was |
| --- | ---: | --- |
| Test setup — `@testing-library/jest-dom` import | ~1,801 | A single missing/incorrect jest-dom matcher import in test setup cascaded across the suite; fixing it cleared the bulk at once. |
| Source (`src/`) fixes | ~31 | Real type gaps in application code, including one genuine game-logic bug (below). |
| Test-file fixes | ~150 | Per-file typing gaps in `__tests__` (assertion typing, mock shapes, generics). |

### The one genuine game-logic bug — `getBurnoutRisk` WPB

`src/logic/magicalBurnout.ts :: getBurnoutRisk` was computing the WillPower Bonus
incorrectly. It now derives WPB from the **full WillPower total**
(`Initial + Advances + Bonus`) via the shared `getBonus` helper:

```ts
const wp = character.chars.WP;
const wpBonus = getBonus(wp.i + wp.a + wp.b);
```

- **Rule basis:** a characteristic's Bonus is the tens digit of its *current*
  value — **Core p.55** — and Magical Burnout risk is (overcast SL − WPB)% per
  the **High Elf Player's Guide p.84**. Both are cited in the source file.
- This is the **only** change with any game-mechanics effect, and it brings the
  calculation **into** rulebook compliance rather than altering intended
  behavior.

## 4. ESLint / compiler-API decision

`typescript-eslint@8.70.1` imports the TypeScript compiler API directly and
does not accept TS 7.0 (peer dependency `>=4.8.4 <6.1.0`); it crashes on 7.0's
not-yet-stable API. Per the official TS 7.0 migration guidance
(run side-by-side with 6.0), the fix is **npm aliases**, wired in
`package.json`:

- `typescript` → `npm:@typescript/typescript6@^6.0.2` — the re-exported 6.0 API,
  so ESLint's parser keeps working.
- `@typescript/native` → `npm:typescript@7.0.2` — the real 7.0 compiler, which
  still ships the `tsc` binary used by `typecheck` and the build gate.

**This is a temporary workaround.** There is a `TODO` in `package.json` to drop
both aliases and restore a plain `"typescript": "7.0.2"` once `typescript-eslint`
ships stable-API support for TS ≥7.1
(tracking: typescript-eslint issue **#10940**). ESLint now completes without
compiler-API crashes.

## 5. New type errors from the 7.0 bump itself

**None.** The baseline (5.9.3), 6.0.3, and 7.0.2 type-checks were all clean
against the fixed source. The 7.0 native port is faithful to 6.0 checking
semantics, so no new diagnostics appeared from the version change alone — every
error fixed in §3 pre-existed the bump.

## 6. Build / CI changes

- **`build`** → `tsc --build && vite build` (type-check now gates the bundle).
- **`build:docker`** → `tsc --build && vite build --base /` (same gate).
- **`typecheck`** script added: `tsc --build --noEmit`.
- **`test`** script added: `vitest run`.
- **CI (`.github/workflows/pages.yml`)** — an explicit `npm run typecheck` step
  runs after `npm ci` and before `npm run build`; Node stays at **22** (matches
  `.nvmrc` / `engines`).
- **Docker (`deploy.yml` / `Dockerfile`)** — no direct edit; they inherit the
  gate through the updated `build:docker` script.
- `--checkers` parallelism flags were **not** added (only warranted by a
  measured slowdown).

## 7. Verification

All green:

- `npm run typecheck` — passes.
- `npm run test` — passes (**4,706 tests across 411 files**).
- `npm run build` — produces a working `dist`.
- Temporary comparison files `ts-baseline.txt` and `ts7.txt` were deleted.

## 8. Flagged for human review

1. **Large latent-error fix batch (~180 files touched).** The clean-baseline
   work spanned source and test files. The source fixes deserve a careful read,
   especially:
   - the **`magicalBurnout` WPB change** (§3) — the only game-logic behavior
     change; confirm it matches Core p.55 / High Elf Player's Guide p.84;
   - any **skill-filter generic** change made during the source pass.
2. **The `typescript-eslint` alias is a temporary workaround** (§4). Track
   typescript-eslint #10940 and remove both npm aliases at TS 7.1.

## 9. Rollback

Revert `package.json`, `eslint.config.js`, and `.github/workflows/pages.yml`,
then run `npm install`. The staged version history keeps each step reversible.

## 10. WFRP4e rules-compliance note

This is a **tooling-only** change and does not affect WFRP4e rules compliance —
**except** the `getBurnoutRisk` WPB fix, which corrects a latent calculation
bug **into** compliance with Core p.55 and the High Elf Player's Guide p.84. No
other mechanic, cost table, or rule was changed.
