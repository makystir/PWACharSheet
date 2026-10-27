# Review — Downtime / Endeavour Assistant

Commit under review: `bad5e396` — *feat: situation-aware downtime/endeavour
recommendations + guided resolve*.

Verdict: **APPROVED** — no blocking findings.

## Scope of change (production)

The diff touches exactly three production files, all additive:

- `src/logic/assistant/rules/downtime-recommendations.ts` (NEW) — the pure rule module.
- `src/logic/reminders-target.ts` — value-preserving refactor extracting
  `resolveSeededTarget` (`{ total, lines }`) and reducing
  `resolveReminderBaseTarget` to `resolveSeededTarget(...).total`.
- `src/logic/assistant/engine.ts` — one import + one spread registering the module.

Plus two NEW test files. No existing production or test file was modified
(verified via `git show --stat` against `rules/endeavours.ts`, `rules/downtime.ts`,
`ordering.ts`, `useAssistantActions.ts`, `SuggestionItem.tsx`, `App.tsx`, and the
existing assistant test suites — none appear in the diff).

## Blocking criteria — results

### rules-compliance — PASS
Every recommendation names a catalogued endeavour and every mechanic carries a
`// Core p.NNN` comment. Spot-checked the three seeded Tests against
`docs/WarhammerFantasyRoleplay4e.md`:
- **Study a Mark** (p.201, Rogues): *"Attempt a **Challenging (+0) Perception**
  Test"* → seeded `skill Perception`, `Challenging`. Exact match.
- **The Latest News** (Rangers/Riverfolk): *"Attempt a **Challenging (+0) Gossip**
  Test"* → seeded `skill Gossip`, `Challenging`. Exact match.
- **Foment Dissent** (p.200, Burghers/Peasants): stage 1 *"an **Average (+20)
  Gossip** Test"*, stage 2 GM-set Charm → seeded stage-1 `Gossip` at `Average`;
  rationale notes stage 2 is GM-set and not seeded. Exact match.
No invented endeavour, effect, cost, or difficulty. Ambiguities (Combat Training's
"Melee or Ranged", Research Lore's specialisation/untrained branch, Reputation's
"Career Skill", off-class −1 difficulty) are flagged in comments/rationale and
left guidance-only, never silently resolved. Max wounds is derived via the
canonical `deriveSheetTotals(...).wounds.total` (Core p.36–37) — no re-implemented
formula.

### Recommendations stay within the catalog — PASS
`title` values map (via the test's `endeavourNameOf`, stripping the " endeavour"
suffix) to real catalog names: Healing/Income/Banking/Training ∈
`ENDEAVOUR_TEMPLATES ∪ GENERAL_ENDEAVOURS`; class items come straight from
`CLASS_ENDEAVOURS[class]`. T4 emits nothing for empty/unmatched class (mirrors
`buildPickerItems`). The fast-check property (P2, 200 runs) asserts every emitted
name is in the catalog for arbitrary tracked state including junk classes. All
recommendations read only already-tracked fields (`wCur`, criticals, diseases,
`wGC`/`wSS`/`wD`, `xpCur`, `class`, chars for derived max wounds).

### No double-firing with endeavours.ts / downtime.ts — PASS
The module early-returns `[]` when `hasActiveEndeavours(character)` (shared
predicate, same source of truth) → mutually exclusive with `endeavour:active`.
Every emitted id is namespaced `endeavour:rec:*`, distinct from
`endeavour:available`/`endeavour:active`. P4 property (200 runs) asserts the module
and `endeavourSuggestions` are never both non-empty, no id collides, ids are
unique, and emitted endeavour NAMES are distinct (semantic-dedupe guard).

### Guided resolve routes through the existing seam only — PASS
Seeded rolls use the existing `{ kind: 'roll'; test: { def, difficulty, rollName } }`
`SuggestionAction` with the `ReminderTest` shape; base target resolves through the
existing `resolveSeededTarget`/`resolveReminderBaseTarget`. The module never
mutates the character, changes `EndeavourEntry.status`, applies money/XP/effects,
auto-rolls, or auto-completes. No parallel mutator is introduced — the player acts
via the existing roll dialog and Endeavours-page controls (navigate secondary
action). The component test (AC-6) confirms clicking the roll button only invokes
`onAction` with the descriptor and leaves the character byte-identical.

### Roll affordance only on Test-driven endeavours — PASS
Exactly three bare-skill Test endeavours carry a `roll` (Study a Mark, Latest News,
Foment Dissent stage 1). All narrative/flat-mechanic (Healing, Income, Banking,
Training) and specialisation/player-chosen/GM-set class endeavours (Combat
Training, Research Lore, Reputation, and all OQ-7 unverified ones) are
navigate-only with no `roll`/`secondaryAction`/`totals`. Matches the design table.
Unit + component tests assert both directions (AC-7).

### SuggestionSource boundary / purity — PASS
The `SuggestionSource` sync-or-async contract in `types.ts` is untouched; the
module is synchronous. No network/LLM/backend/telemetry added. P1 asserts
determinism, serializability (no functions, JSON round-trip), and tolerance of a
frozen input clone.

### No suppressions — PASS
Grep of the module for `eslint-disable`/`@ts-ignore`/`@ts-expect-error`/`.skip`/
`xit`/`xdescribe` returns nothing. The commit records `npx eslint .` = 0 errors,
3 pre-existing react-refresh warnings in untouched files, no new warnings.

### Calculated-total tooltip — PASS
The one surfaced calculated total (a seeded Base Target) ships as
`SuggestionTotal { label: 'Base Target', display, lines }`, rendered by the
existing `SuggestionItem` → `TooltipTriggerCell` + `Tooltip`. `total` and `lines`
come from one branch of `resolveSeededTarget`, so they cannot drift. The breakdown
shows Initial + Advances + Bonus for the characteristic plus the skill advances and
the summed total. The malformed-`skill.c` path falls back to `fallbackChar` for
both value and label (no bogus characteristic shown, no throw). Component test
AC-10 asserts the tooltip renders the engine lines verbatim, not recomputed.

### Existing tests kept green unchanged — PASS
No existing test file appears in the diff. Only the two NEW test files were added.

## Verification evidence (read from commit message, not re-run)
- `npx tsc --build --force --noEmit` → clean (exit 0).
- `npm run build` → succeeds (exit 0).
- `npx eslint .` → 0 errors, 3 pre-existing warnings in untouched files, no new.
- `npx vitest --run` → new suites all green (24 tests). The commit notes pre-existing
  PrintLayout and heavy property suites time out only under full-suite parallel
  jsdom load (matching the pre-change baseline) and pass in isolation; no touched
  file fails. This is a recorded, pre-existing, non-regressing condition — not a
  blocker for this change.

Evidence is present and sufficient; no spot-check re-run was required. I
independently confirmed the three rulebook citations and the value-preserving
nature of the `reminders-target.ts` refactor (the new `in character.chars` key
guard yields the same characteristic as the former `?? fallback` result for both
valid and invalid `skill.c`).

## Non-blocking observations (not findings, no action required)
- `getActiveCriticalWounds` gains its first caller (T1); the dormant export's doc
  comment could be updated, but this is cosmetic and out of scope.
