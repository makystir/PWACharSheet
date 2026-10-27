# Design Review — Character Assistant (Revision 2)

Reviewed: `.agents/tasks/character-assistant/design.md` (Revision 2) against
`.agents/tasks/character-assistant/requirements.md`.

This revision claims to resolve the 2 HIGH / 4 MEDIUM / 5 NIT findings from the
prior review. I reviewed it fresh and verified every load-bearing claim against
the actual source, not against the design's assertions.

## Verdict

**APPROVED.** No HIGH or MEDIUM findings. The remaining items are NITs that do
not block implementation. Every key integration point the design relies on was
read and confirmed to exist with the shape the design assumes, and the two prior
HIGH findings (corruption/Pure Soul, roll-seed difficulty) are genuinely fixed.

---

## Verified Assumptions

Each was checked by reading the cited source.

1. **Command-palette provider shape** — `src/components/command-palette/CommandPaletteContext.tsx`
   exposes exactly `isOpen / open() / close() / toggle()` via a context +
   `useCommandPaletteContext()` hook that throws outside its provider. The
   `AssistantContextValue` in the design mirrors this verbatim. ✔
2. **Combat "in combat" signal (OQ-4)** — `CombatPage.tsx` sets
   `const inCombat = character.combatState.inCombat;` and passes it to
   `CombatDashboard`. The design reads `SuggestionContext.inCombat` from the same
   `character.combatState.inCombat`. Single source of truth confirmed. ✔
3. **`reminders.ts` consumed, not forked** — `deriveAllReminders(...)` exists and
   returns `CombatReminder[]` with `label`, `description`, `test?` (with `def` /
   `difficulty` / `rollName`) and a `citation` string. The adapter maps
   `description → rationale`, `citation → suggestion.citation`, and
   `test → roll` action, reusing the exact `ReminderTest` shape. The informational
   fallback `{ kind: 'navigate', page: 'combat' }` targets a real `PageSection`. ✔
4. **Reminder roll seed path (Finding 2)** — `CombatDashboard.tsx` has
   `resolveReminderBaseTarget(character, def)` and `handleRollReminder` which set
   a `{ name, baseTarget, difficulty }` state and render `RollDialog` with
   `defaultDifficulty={reminderRoll.difficulty}`. `RollDialog` accepts
   `defaultDifficulty` (confirmed in `CombatPage.tsx` and dice-roller-ui tests).
   The quick-roll state in `App.tsx` is `{ name, baseTarget }` **without**
   difficulty — so the design's claim that the quick-roll path is insufficient and
   that a new shell state carrying `difficulty` is needed is correct. ✔
5. **Advancement readiness extraction (Finding 5 sibling)** — `AdvancementPage.tsx`
   computes `readyToProgress = charsMet && skillsMet && talentsMet` **inline**
   (not exported). The design's "extract `isReadyToAdvance` and have the page call
   it" is a real, behaviour-preserving refactor. ✔
6. **Encumbrance calculators** — `calculateMaxEncumbrance(chars, strongBackLevel,
   sturdyLevel)` and `calculateCoinWeight(gc, ss, d)` exist in `calculators.ts`;
   `getEncumbranceBreakdown` / `getTrappingEncBreakdown` exist in
   `breakdown-helpers.ts`; `calculateCarriedTrappingEnc` / `calculateArmourEncumbrance`
   exist in `encumbrance.ts`. There is **no** single current-total helper today,
   so the design's new `calculateCarriedEncumbrance` reducer is justified. ✔
7. **Strong Back / Sturdy level read (Finding 5)** — `sheet-totals.ts` reads
   `character.talents.find(t => t.n === 'Strong Back')?.lvl ?? 0` and the same for
   `'Sturdy'`, then calls `calculateMaxEncumbrance(character.chars,
   strongBackLevel, sturdyLevel)`. The design's engine reads the two levels
   identically — a true match, not an invented path. ✔
8. **Corruption trigger + Pure Soul (Finding 1 / OQ-2)** — `corruption.ts`:
   `getCorruptionThreshold(chars, pureSoulLevel) = TB + WPB + pureSoulLevel` and
   `getPureSoulLevel(talents)` exist. The design fires on
   `corr > getCorruptionThreshold(chars, getPureSoulLevel(talents))` with Pure
   Soul included — consistent with the helper. ✔
9. **Corruption navigate target (Finding 4)** — `CorruptionCard` is rendered in
   `src/components/pages/character/NotesTab.tsx`; `PageSection` has no
   `'corruption'` member; `CharSubTab`/`VALID_SUBTABS` include `'notes'` and
   `'gear'`. So `{ page: 'character', subTab: 'notes' }` (corruption) and
   `{ page: 'character', subTab: 'gear' }` (encumbrance) are valid routes. ✔
10. **Nav touch-end pattern (FR-9.2 / NFR-5)** — `Navigation.tsx` renders Search /
    Shortcuts with `onClick={() => open()}` + `onTouchEnd={(e) => {
    e.preventDefault(); open(); }}` and these do **not** call `onPageChange` /
    `handleNavTouchEnd`. The design's `AssistantTrigger` follows the same pattern
    and never calls `onPageChange`, so it cannot regress the nav touch fix. ✔
11. **`resolveReminderBaseTarget` fallback** — for a `skill` def whose skill is not
    on the sheet, it falls back to `fallbackChar`. So the corruption Endurance test
    (`fallbackChar: 'T'`) always resolves a base target even for a character
    lacking the Endurance skill — matching the design's error-handling claim. ✔
12. **Serializable action union** — `SuggestionAction` is `navigate | roll` only
    (`openSection` dropped); both members are plain data with no functions. The
    `roll` member's `test.def` is the existing `ReminderTest` union, which is plain
    data. JSON-serializability is structurally sound. ✔

## Unverified / Wrong Assumptions

None. Every claim I spot-checked held up. The design's "Responses to design
review" section accurately describes the current source (I independently
confirmed Findings 1, 2, 4, 5 are real and correctly addressed).

The only items the design itself leaves open are explicitly flagged for reviewer
confirmation (OQ-2 `>` vs `>=`; OQ-5 snooze duration + key). These are not wrong
assumptions — they are deliberately surfaced product decisions with a concrete,
defensible default chosen for each, so implementation is unambiguous either way.

---

## Findings

### NIT-1 — OQ-2 (`>` vs `>=`) left to reviewer, but rulebook-literal default is sound
`design.md` → FR-8.4 / "Remaining open questions". The design fires corruption on
the **strict `>`** from Core p.183 (`corr > threshold`), while the app's existing
`getCorruptionStatus` uses `>=` for its `'danger'` state (confirmed in
`corruption.ts`). This is a 1-point edge at exactly the threshold. The steering
rule (flag, don't silently resolve) is satisfied — the design flagged it and
picked the rulebook-literal reading. **Concrete guidance:** ship the strict `>`
(rulebook-accurate per p.183 "more … than") and make the rationale text match it;
accept that `CorruptionCard`'s banner (`corr >= threshold`) will light up one
point earlier than the Assistant fires. If UI consistency with the card is
preferred, switch both the trigger and the rationale to `>=` — do not mix. Either
is implementable from the current spec; no blocker.

### NIT-2 — OQ-5 snooze key/shape fixed in design but still labelled "confirm"
`design.md` → "Dismiss / snooze". The design specifies a single localStorage key
`assistant-dismissals` with shape `{ dismissed: string[]; snoozedUntil:
Record<string, number> }` and a 24h snooze, yet also asks the reviewer to confirm.
This is fully implementable as written. **Concrete guidance:** proceed with the
stated key/shape and 24h duration; treat the "confirm" as a product sign-off, not
a design gap. Ensure the key is namespaced (`assistant-dismissals`) so it cannot
collide with `Navigation`'s own collapse-state key.

### NIT-3 — Corruption rationale lists "WPB + TB"; helper order is "TB + WPB + Pure Soul"
`design.md` → FR-8.4 rationale string and `totals.lines` (`['TB n', 'WPB n',
'Pure Soul n']`). `getCorruptionThreshold` sums in `TB + WPB + pureSoul` order.
The rationale prose says "WPB + TB (+ Pure Soul)". Purely cosmetic (addition is
commutative), but for a calculated-total tooltip the line order should match the
displayed breakdown. **Concrete guidance:** keep the `totals.lines` order
(`TB, WPB, Pure Soul`) consistent with the helper and, ideally, with the
rationale wording, so the tooltip reads as `TB n + WPB n + Pure Soul n =
threshold`.

### NIT-4 — FR-8.5 informational reminders route to `page: 'combat'` unconditionally
`design.md` → FR-8.5 adapter: reminders without a `test` map to
`{ kind: 'navigate', page: 'combat' }`. That is a valid `PageSection`, but out of
combat (e.g. a lingering Blinded/Deafened condition with no active combat) the
navigation lands the player on the Combat page, which may be empty-feeling.
Non-blocking — the target is valid and the condition is edge-y. **Concrete
guidance:** acceptable as-is for v1; optionally note that informational reminders
are expected to be rare out of combat and still correctly route to Combat.

---

## Notes on the prior HIGH findings (confirmed fixed)

- **Finding 1 (Pure Soul)** — now included via
  `getCorruptionThreshold(chars, getPureSoulLevel(talents))`; matches the helper.
  Fixed.
- **Finding 2 (roll seed drops difficulty)** — the design now mirrors
  `handleRollReminder` exactly (resolve `baseTarget` via `resolveReminderBaseTarget`,
  carry `difficulty` through a new shell state into `RollDialog.defaultDifficulty`).
  Verified the quick-roll state genuinely lacks `difficulty`, so the new state is
  warranted. Fixed.
- **Findings 3, 4, 5, 6** (MEDIUM) — corruption action pair consistent across
  FR-8.4/OQ-3/AC14; navigate target `character/notes` confirmed real;
  overburdened `max` side reads talent levels as `sheet-totals.ts` does;
  `citation?: string` added to carry the citation as data. All verified against
  source. Fixed.

## Coverage of the reviewer's explicit checklist

- Suggestion/SuggestionSource/Action concrete, serializable, async-extensible,
  deterministic sync fallback — **met** (types are plain data; return type
  `Suggestion[] | Promise<Suggestion[]>` with documented sync narrowing).
- Engine pure / `action` is a descriptor the UI interprets, nothing auto-applies —
  **met** (purity test specified; UI-only dispatch; FR-6.3 invariant owned by UI).
- Mirrors command-palette provider/open()/overlay, wired at app shell — **met**
  (verified against `CommandPaletteContext.tsx`).
- Nav integration preserves onTouchEnd/reduced-busyness, closed-by-default,
  non-blocking — **met** (pattern verified; "non-blocking" scoped to closed state,
  open panel is an intentional modal matching the command palette).
- Combat reminders consumed/adapted, not forked — **met** (`deriveAllReminders`
  imported; `reminders.ts` untouched).
- Starter set maps only to already-computed data, each rule rulebook-cited, no
  invented mechanic; OQ-1 and mutation-test timing surfaced as open questions —
  **met** (OQ-1 resolved to `current > max` with exact p.293 wording; OQ-3 reframed
  to an Endurance Test to resist corruption, not a "mutation test").
- Accessibility (focus trap, ARIA, keyboard, announced count) — **met**.
- Calculated totals carry Tooltip breakdowns sourced from existing helpers —
  **met**.
- Testing covers fast-check property tests of the pure engine + component tests
  asserting no auto-apply — **met**.
