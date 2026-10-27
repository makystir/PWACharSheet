# Implementation Plan — Downtime / Endeavour Assistant

Derived from the APPROVED `design.md` and `requirements.md` in this folder. The
design decisions are faithfully sequenced here; no architecture is re-decided.
The work is strictly additive: one new pure rule module, one value-preserving
refactor of `reminders-target.ts`, one-line registration in `engine.ts`, and new
tests. No existing rule module, mutator, type, UI component, ordering table, or
existing test changes behaviour.

Steering carried forward on every task:
- **rules-compliance** — every endeavour/test/cost/difficulty is grounded in
  `docs/WarhammerFantasyRoleplay4e.md` (verified in the design's "Verified source
  quotes" section) and cited in a `// Core p.NNN` code comment; NEVER invent a
  mechanic; the three flagged ambiguities (OQ-3 off-class penalty, OQ-6 Unusual
  Learning/Research skill, OQ-7 unverified class endeavours) stay as rationale
  notes / guidance-only, never silently resolved.
- **calculated-total-tooltips** — the only calculated total surfaced (a seeded
  Test's base target) ships as a `SuggestionTotal { label, display, lines }` whose
  `lines` come from the engine (`resolveSeededTarget`), rendered by the existing
  `SuggestionItem` → `TooltipTriggerCell` + `Tooltip` path; no UI change.
- **fix-errors** — fix any error surfaced by the verification commands (incl.
  pre-existing) at the root cause; no `@ts-ignore`/`eslint-disable` beyond the one
  sanctioned `react-hooks/set-state-in-effect` already in `Tooltip.tsx`, reused
  only if genuinely needed.

Offline-first / local-only / no-network throughout. The `SuggestionSource`
sync-or-async boundary in `types.ts` is left byte-identical; the deterministic
default stays synchronous.

Verification commands used below (from `package.json`; the design's AC-1..AC-4):
- `npx tsc --build --force --noEmit` (AC-1)
- `npm run build` (AC-2)
- `npm run test` (= `vitest run`) (AC-3)
- `npx eslint .` (AC-4)

---

- [ ] 1. Establish the green baseline before any change.
      Run the full verification suite once so later regressions are attributable.
      Files: none (read-only).
      Verify: `npx tsc --build --force --noEmit`, `npm run build`, `npm run test`,
      `npx eslint .` all clean. Record the pre-existing test count. If anything is
      already red, stop and report before proceeding (fix-errors applies, but a
      pre-existing failure must be understood first).

- [ ] 2. Value-preserving refactor of `reminders-target.ts`: extract
      `resolveSeededTarget(character, def): { total; lines }` and reduce
      `resolveReminderBaseTarget` to `resolveSeededTarget(...).total`.
      Implement `resolveSeededTarget` exactly as the design's "Calculated-total
      tooltips" code block: three branches (characteristic / found-skill /
      untrained-skill). In the skill branch derive the label characteristic the
      SAME safe way as the value — `charKey = (skill.c as CharacteristicKey) in
      character.chars ? skill.c : def.fallbackChar` (Finding 2: never read the
      free-form `skill.c` for display; the repo has rows like `Melee ()` /
      `Stealth ()`), and use `charKey` for BOTH the computed value and the
      breakdown line. `resolveReminderBaseTarget` keeps its exact signature and
      returns `resolveSeededTarget(...).total`, so every existing caller
      (`useAssistantActions`, `CombatDashboard`) gets a byte-identical number.
      Reuse `computeSkillTarget` / `computeCharacteristicTarget` (no new formula —
      this is a refactor, not a new resolver). Add a `// Core p.117
      skill→characteristic mapping` comment on the skill branch. NO
      alternative-placement "seeded-target.ts" — total and lines MUST come from
      one branch of one function (Finding 6).
      Files: `src/logic/reminders-target.ts`.
      Verify: `npx tsc --build --force --noEmit` clean; `npm run test` — the
      existing `useAssistantActions.test.tsx`, `catalog-integration.test.ts`, and
      combat tests that consume `resolveReminderBaseTarget` stay green UNCHANGED
      (byte-identical return value).

- [ ] 3. Create the pure recommendation module
      `src/logic/assistant/rules/downtime-recommendations.ts` exporting
      `downtimeRecommendationSuggestions(character, ctx): Suggestion[]`.
      Guards first: `if (ctx.inCombat) return []` (FR-1.3) and
      `if (hasActiveEndeavours(character)) return []` (Decision 3 mutual
      exclusion). Then build triggers T1→T4 in fixed order, tracking a
      `Set<string>` of emitted endeavour NAMES for the semantic-dedupe guard
      (Finding 3). Reuse the `diseases.ts` `slugify` shape for stable ids. Imports:
      `hasActiveEndeavours`, `CLASS_ENDEAVOURS` from `../../endeavours`;
      `getActiveCriticalWounds` from `../../critical-wounds` (T1 is its first
      caller — benign activation of the dormant export); `resolveSeededTarget`
      from `../../reminders-target`; types `ReminderTest`, `DifficultyLevel`,
      `Suggestion`, `SuggestionContext`, `Character`. No React/storage/navigation/
      network; no mutation; tolerant of frozen input. Top-of-function
      `// Core p.195-201 (Between Adventures — Endeavours)` comment.
      Implement exactly per design Decision 2/3:
      - **T1 Wounded → Healing (guidance-only, navigate, no roll, no totals).**
        Predicate `wCur < W` OR `getActiveCriticalWounds(criticalWounds).length > 0`
        OR `(diseases ?? []).length > 0`. id `endeavour:rec:healing`, title names
        `ENDEAVOUR_TEMPLATES` "Healing", urgency `recommended`, navigate
        `endeavours`. Rationale = applicable clauses joined with `"; "` in fixed
        order (wounds, criticals, diseases) per Finding 9. Citation Core p.196-198.
        Does NOT duplicate the `diseases.ts`/`critical-wounds.ts` ids or roll
        affordances.
      - **T2 Low coin → Income + Banking (guidance-only).** Predicate
        `wGC === 0 && wSS === 0` (OQ-4 decided). Emit `endeavour:rec:income`
        (names "Income") and `endeavour:rec:banking` (names "Banking"), both
        navigate `endeavours`, no roll. Rationale echoes the three coin fields
        verbatim with NO arithmetic (Finding 10). Citation Core p.198 (names
        Banking p.196).
      - **T3 Unspent XP → Training (guidance-only).** Predicate `xpCur > 0`. id
        `endeavour:rec:training` (names "Training"), navigate `endeavours`, no
        roll. Rationale notes XP + distinct from `learnable.ts`'s
        `advancement:learnable` (distinct id AND category `endeavour`). Mention
        Unusual Learning as guidance only (OQ-6). Citation Core p.198.
      - **T4 Class surfacing.** Predicate `character.class` non-empty AND a key in
        `CLASS_ENDEAVOURS`; else emit nothing (mirrors `buildPickerItems`). Emit up
        to 2 `endeavour:rec:class:<slug>` in catalog order, SKIPPING any endeavour
        name already emitted by T1–T3 (the dedupe guard). For a class endeavour in
        the seeded set (Study a Mark, Latest News, Foment Dissent) attach the
        seeded `roll` action (Task 4) PLUS a `secondaryAction` navigate
        `endeavours`; otherwise navigate-only. Add the off-class "−1 Difficulty
        Level (Core p.200); adjust in the dialog" note to the rationale when the
        character's class is not listed for that endeavour (OQ-3 — note only, never
        pre-applied). Per-endeavour Core citation from the design table.
      Enforce the hard ceiling of 6 (1+2+1+2) and the class cap of 2 by
      construction.
      Files: `src/logic/assistant/rules/downtime-recommendations.ts`.
      Verify: `npx tsc --build --force --noEmit` clean; module compiles with no new
      eslint findings (`npx eslint src/logic/assistant/rules/downtime-recommendations.ts`).

- [ ] 4. Add the seeded-roll table and wire the three bare-skill seeds inside the
      new module.
      Add a private const `SEEDABLE_CLASS_ENDEAVOURS: Record<string, { def:
      ReminderTest; difficulty: DifficultyLevel; citation: string; rollName:
      string }>` keyed by the exact `CLASS_ENDEAVOURS` name, containing EXACTLY
      three rows, each with a `// Core p.NNN` quoted-RAW comment:
      - `'Study a Mark'` → `{ kind:'skill', skillName:'Perception', fallbackChar:'I' }`,
        `Challenging`, rollName `'Study a Mark (Perception)'`, Core p.201.
      - `'Latest News'` → `{ kind:'skill', skillName:'Gossip', fallbackChar:'Fel' }`,
        `Challenging`, rollName `'The Latest News (Gossip)'`, Core p.201.
      - `'Foment Dissent'` → `{ kind:'skill', skillName:'Gossip', fallbackChar:'Fel' }`,
        `Average` (stage 1 only; rationale notes stage 2 Charm is GM-set), rollName
        `'Foment Dissent (Gossip)'`, Core p.200.
      `Perception` (c:`I`) and `Gossip` (c:`Fel`) are verified BARE basic rows in
      `BLANK_CHARACTER.bSkills`, so `resolveSeededTarget` hits the real row and
      reflects advances — no characteristic seeds are emitted. For each seeded
      suggestion, compute the base target via `resolveSeededTarget(character, def)`
      and attach `totals: [{ label: 'Base Target', display: String(total), lines }]`
      (FR-5.1/5.2); the module MUST NOT recompute the total. Any class endeavour not
      in this table (incl. all OQ-7 unverified ones, Combat Training, Research Lore,
      Reputation) stays navigate-only. All navigate actions use page `endeavours`
      (route `endeavours:` is in the catalog-integration valid set).
      Files: `src/logic/assistant/rules/downtime-recommendations.ts` (same file as
      Task 3).
      Verify: `npx tsc --build --force --noEmit` clean.

- [ ] 5. Register the module in the engine.
      Add one import of `downtimeRecommendationSuggestions` and one spread
      `...downtimeRecommendationSuggestions(character, context)` inside
      `getSuggestions`, beside the other catalog-expansion modules (after
      `downtimeSuggestions`). Do NOT touch `orderSuggestions`, `types.ts`, or the
      `SuggestionSource` boundary; category `'endeavour'` already exists in the
      ordering tables.
      Files: `src/logic/assistant/engine.ts`.
      Verify: `npx tsc --build --force --noEmit` clean; `npm run test` — existing
      `engine.test.ts`, `downtime.test.ts`, `catalog-integration.test.ts` stay green
      UNCHANGED (new module only ADDS `endeavour:rec:*` ids; no existing id/route
      changes).

- [ ] 6. Write the unit + fast-check tests for the module
      (`src/logic/assistant/__tests__/downtime-recommendations.test.ts`).
      Follow the `engine.test.ts` harness (`makeCharacter` from `BLANK_CHARACTER`,
      `assertNoFunctions`, `fast-check`, `CTX_PEACE`/`CTX_COMBAT`). Cover:
      - P1 pure/deterministic/serializable: identical `(character, context)` →
        deep-equal; `structuredClone` input equal output; `assertNoFunctions` on
        every emitted suggestion; tolerant of `Object.freeze` (AC-9).
      - P2 catalog-only (fast-check over arbitrary tracked state incl. class from
        `Object.keys(CLASS_ENDEAVOURS)` ∪ junk): every emitted endeavour name ∈
        `GENERAL_ENDEAVOURS ∪ CLASS_ENDEAVOURS[class] ∪ ENDEAVOUR_TEMPLATES` (AC-5).
      - P3 healing iff `wCur<W` OR active critical OR active disease (and
        `!inCombat && !hasActiveEndeavours`) (AC-5).
      - P4 mutual exclusion: module empty when `endeavourSuggestions` non-empty; no
        emitted id equals `endeavour:active`/`endeavour:available`; emitted endeavour
        NAMES distinct (Finding 3) (AC-8).
      - P5 citations: every emitted suggestion and every roll seed has a non-empty
        `citation` (AC-11).
      - Unit: T1/T2/T3/T4 fire on predicate with right name/id/category
        `'endeavour'`/action kind; the three seeds carry a `roll` whose `Base
        Target` total === `resolveReminderBaseTarget(character, def)` AND whose
        `lines` sum to that total AND whose difficulty matches
        (`Challenging`/`Challenging`/`Average`) (AC-6); bare-skill correctness (a
        trained Perception/Gossip yields a base target DIFFERENT from the bare
        characteristic, proving advances resolve); malformed-`skill.c` label safety
        (garbage `c` → well-formed line naming `fallbackChar`, no throw — Finding 2);
        guidance-only (Healing, Income, Banking, Training, Combat Training, Research
        Lore, Reputation) → navigate action, NO roll action/secondary (AC-7);
        semantic dedupe (constructed fixture where a class name could overlap T1–T3)
        — guard skips it; emission cap `length <= 6` and class cap = 2 (e.g.
        Warriors surfaces exactly 2 in catalog order); navigate routes only
        `endeavours:`.
      Files: `src/logic/assistant/__tests__/downtime-recommendations.test.ts`.
      Verify: `npm run test` — the new suite passes; all pre-existing suites still
      green and unedited.

- [ ] 7. Write the component tests for the seeded-total tooltip + guidance-only
      no-roll render (`src/components/assistant/__tests__/SuggestionItem.downtime.test.tsx`).
      Using `@testing-library/react`, render `SuggestionItem` with a seeded
      suggestion carrying a `Base Target` `SuggestionTotal`; assert the breakdown
      tooltip opens via `TooltipTriggerCell` and the rendered lines EQUAL the
      engine-provided `total.lines` (not recomputed) (AC-10). Assert a
      guidance-only recommendation renders NO roll button (only the navigate button)
      (AC-7). Re-assert the no-mutation contract by invoking the roll affordance
      through a mocked `onAction` against a snapshotted character/`EndeavourEntry.status`
      (reuse the `useAssistantActions.test.tsx` "never mutates" style) (AC-6).
      Files: `src/components/assistant/__tests__/SuggestionItem.downtime.test.tsx`.
      Verify: `npm run test` — new component suite passes.

- [ ] 8. Full regression + lint gate.
      Run the complete verification suite and confirm the pre-existing tests from
      Task 1 are all still green and unchanged, plus the new suites pass. Fix any
      error at its root cause (fix-errors); no new suppression beyond the one
      sanctioned `react-hooks/set-state-in-effect` in `Tooltip.tsx` (only if
      genuinely needed). Confirm no edits leaked into `rules/endeavours.ts`,
      `rules/downtime.ts`, `types.ts`, `ordering.ts`, `useAssistantActions.ts`,
      `SuggestionItem.tsx`, `App.tsx`, `EndeavoursPage.tsx`, `RollDialog.tsx`, or any
      catalog/mutator file.
      Files: none (verification only).
      Verify: `npx tsc --build --force --noEmit` (AC-1), `npm run build` (AC-2),
      `npm run test` (AC-3), `npx eslint .` (AC-4) — all clean, 0 eslint errors and
      no new warnings.

---

## Notes on flagged ambiguities (carried, not resolved)

- **OQ-3** (off-class −1 Difficulty, Core p.200): seeds carry the BASE RAW
  difficulty; the penalty is a rationale note the player applies in the dialog. Not
  pre-applied (would invent a modified TN).
- **OQ-6** (Unusual Learning / Research Lore "most relevant" skill): guidance-only;
  never seeded.
- **OQ-7** (Up In Arms / unverified class endeavours — Drill, Challenge, Seek
  Patronage, etc.): surface navigate-only under T4; no seeded roll, since their
  exact Tests are not verifiable from the inlined Core text.

If any of these need a different decision, flag to the user rather than inventing a
value.
