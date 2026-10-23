# Design: Proactive Combat & Psychology Reminders

## Overview

This feature turns data the app already tracks (active conditions and
Psychology Tracker traits) into a small, **passive** list of tests the player
*should consider* making on their turn, each with a **one-tap-to-roll** action
that runs the *existing* dice roller and records the result in roll history. It
never auto-applies anything: the player reads the result and acts. This is the
confirmed product decision (passive surfacing + one-tap-to-roll, no silent
automation of consequences).

The core engineering move is **consolidation, not addition**: the condition
reminder strings that `src/logic/end-of-turn.ts` emits today are duplicated
knowledge that would drift from a new panel. We extract a single pure module,
`src/logic/reminders.ts`, that is the one source of truth for "which test does
this condition/psychology trait call for, at what difficulty, citing which
rule." `end-of-turn.ts` is refactored to *consume* that module for its reminder
strings while keeping its existing output **byte-identical** (its damage math
and `EndOfTurnEffect` shape do not change). A new `CombatReminders` component
renders the derived list inside the combat dashboard and wires each roll-backed
reminder into the existing `RollDialog` → `RollResultDisplay` → `addRoll` flow.

Stack is locked to the existing one: **Vite + React 18 + TypeScript, CSS
Modules, Vitest + fast-check**. No new runtime dependencies.

---

## 1. Rulebook grounding (rules-compliance)

Every mechanic below was read in `docs/WarhammerFantasyRoleplay4e.md` and will
be cited in a code comment at its definition in `reminders.ts`. No mechanic is
invented; where the rule is not a single unambiguous test, the reminder is
marked **informational** (no roll button) and the ambiguity is listed in
§9 Open Questions.

Conditions — Master Condition List, Core pp.168–171 (section begins at the
"Conditions" heading, md line ~8071):

| Condition | Test the app surfaces | Difficulty | Roll-backed? | Citation |
|---|---|---|---|---|
| Stunned | Endurance | Challenging (+0) | Yes | Core p.169: "attempt a **Challenging (+0) Endurance** Test … each SL removes an extra Stunned Condition." (Master Condition List, pp.168–169) |
| Broken | Cool | **Varies by circumstance** (default Challenging +0) | Yes (default diff, player adjusts) | Core p.169: "at the end of each Round, you may attempt a **Cool** Test … Difficulty determined by the circumstances". Note: cannot rally while Engaged — see §9. |
| Poisoned | Endurance | Challenging (+0) | Yes | Core p.169: "At the end of each Round, you may attempt an **Endurance** Test … each SL removing an extra Poisoned Condition." |
| Ablaze | Athletics | Challenging (+0), GM-modified | Yes (default diff) | Core p.168: "removed with a successful **Athletics** Test … Difficulty … modified by circumstances." |
| Entangled | Opposed Strength | n/a (opposed) | **No — informational** | Core p.169: "win an **Opposed Strength** Test against the source" — opposed, no fixed TN. See §9. |
| Blinded | — (auto-removes) | n/a | No — informational | Core p.169: "One Blinded Condition is removed at the end of every other Round." |
| Deafened | — (auto-removes) | n/a | No — informational | Core p.169: "One Deafened condition is removed at the end of every other Round." |
| Bleeding | — (damage/Heal by another) | n/a | No — informational | Core p.168: removed by **Heal** Test (an ally acts) or healing; self has no turn test. |

Psychology traits — Psychology section, Core pp.189–191 (md lines ~9027–9093).
Surfaced only when the **Psychology Tracker** house rule is on
(`character.houseRules.usePsychologyTracker`). The app already stores the exact
rule-reminder strings in `PSYCHOLOGY_REMINDERS` (`src/logic/psychology.ts`); the
derivation reuses those strings verbatim as the reminder `description` and adds
the test/difficulty metadata below.

| Type | Test | Difficulty | Roll-backed? | Citation |
|---|---|---|---|---|
| Fear (Rating) | Cool (Extended) — `rollName: "Cool (overcome Fear)"` | Challenging (+0) — **adjustable default** | Yes | Core p.190: "pass on an **Extended Cool** Test … You may not move closer … without passing a **Challenging (+0) Cool** Test. If it comes closer … pass a **Challenging (+0) Cool** Test, or gain a Broken Condition." The single Roll button is one **Challenging (+0) Cool Test**; the player interprets its SL against the accumulating Extended total (see §9.7). |
| Terror (Rating) | Cool | Challenging (+0) — **adjustable default** | Yes | Core p.190: "make a **Cool** Test. If you fail, you receive … Broken conditions equal to the creature's Terror Rating…". NB: the *description* shown is the verbatim `PSYCHOLOGY_REMINDERS.Terror` string ("gain Broken condition and Fatigued conditions equal to Terror rating"); the citation prose here must not be re-authored into the panel — only the app's own string is surfaced (see note below and §9.9). |
| Frenzy | Willpower (to resist) | Challenging (+0) — **adjustable default** | Yes | Core p.190: Frenzy entered/resisted via a **Willpower** Test. |
| Animosity | Cool (Psychology) | Challenging (+0) — **GM-set, adjustable default** | Yes | Core p.189: "Psychology Test … with the Difficulty **set by the GM**" to end; verbally abuse target on failure. See §9.10. |
| Hatred | Cool (Psychology) | Challenging (+0) — **GM-set, adjustable default** | Yes | Core p.189–190: Psychology Test (Difficulty set by GM, p.189); must attack hated group, +1 SL vs them. See §9.10. |
| Prejudice | Cool (Psychology) | Challenging (+0) — **GM-set, adjustable default** | Yes | Core p.189–190: Psychology Test (Difficulty set by GM, p.189); must insult target. See §9.10. |
| Phobia | Cool | Challenging (+0) — **GM-set, adjustable default** | Yes | Core p.191: "Treat the object of the Phobia as causing Fear 1" → resolves as a Psychology/Cool Test (Difficulty set by GM, p.189). See §9.10. |
| Trauma | — (GM discretion) | n/a | **No — informational** | `PSYCHOLOGY_REMINDERS.Trauma`: "Cool Test when reminded … penalties at GM discretion." Non-deterministic — see §9. |

> Ambiguity note baked into the table: WFRP calls the psychology resolution a
> "Psychology Test," which is a **Cool** Test in 4e for these traits. The app's
> own `PSYCHOLOGY_REMINDERS` already phrase Animosity/Hatred/Prejudice/Phobia as
> "Must pass **Cool** Test," so the roll button uses Cool. This is consistent
> with existing app behaviour; it is still listed in §9 for sign-off.
>
> Description source-of-truth note: psychology reminder `description` text is the
> **verbatim** `PSYCHOLOGY_REMINDERS[type]` string — this module does **not**
> re-author psychology prose. That means the surfaced strings are exactly what
> the app already shows elsewhere, so no new wording is introduced and nothing
> can drift. One consequence: `PSYCHOLOGY_REMINDERS.Terror` says the failure
> result is "Broken condition **and Fatigued** conditions equal to Terror rating,"
> whereas Core p.190 describes Broken conditions equal to the Terror Rating. This
> is a pre-existing app wording choice, **not** introduced by this feature; the
> deriver reuses the app string unchanged. The discrepancy is flagged in §9.9 so
> it can be reconciled (in `psychology.ts`, out of scope here) rather than being
> silently re-decided by this module.

---

## 2. New pure module: `src/logic/reminders.ts`

A React-free, deterministic module. Unit- and property-testable in isolation,
mirroring the `attack-consequences.ts` precedent.

### Exported types

```ts
/** Which characteristic/skill a reminder's one-tap roll uses. */
export type ReminderTest =
  | { kind: 'characteristic'; char: CharacteristicKey } // Cool/Endurance/etc resolved off chars
  | { kind: 'skill'; skillName: string; fallbackChar: CharacteristicKey }; // prefer skill advances, else bare char

export type ReminderSource = 'condition' | 'psychology';

export interface CombatReminder {
  /** Stable key for React lists & dedupe, e.g. "condition:Stunned" or "psych:<traitId>". */
  id: string;
  source: ReminderSource;
  /** Condition name or psychology trait display (e.g. "Fear (Rating 2)"). */
  label: string;
  /**
   * Human-readable rule reminder. For conditions this is byte-identical to the
   * string end-of-turn.ts emits today; for psychology it is PSYCHOLOGY_REMINDERS[type].
   */
  description: string;
  /** Present ⇒ a one-tap roll button is shown. Absent ⇒ informational only. */
  test?: {
    def: ReminderTest;
    difficulty: DifficultyLevel;
    /** Display name passed to performRoll, e.g. "Endurance (remove Stunned)". */
    rollName: string;
  };
  /** Rulebook citation, surfaced in the reminder's info tooltip. */
  citation: string;
}
```

`CharacteristicKey` and `DifficultyLevel` import from `types/character` and
`logic/dice-roller` respectively — no new vocabulary.

### Exported functions

```ts
/**
 * Single source of truth for condition-driven reminders. Pure, order-stable
 * (iterates CONDITION_REMINDER_ORDER, not the input array, so output order is
 * deterministic regardless of condition insertion order).
 */
export function deriveConditionReminders(
  conditions: { name: string; level: number }[],
): CombatReminder[];

/**
 * Single source of truth for psychology-driven reminders. Returns [] unless
 * enabled is true (caller passes houseRules.usePsychologyTracker).
 */
export function derivePsychologyReminders(
  traits: PsychologyTrait[],
  enabled: boolean,
): CombatReminder[];

/** Convenience: condition + psychology, conditions first. */
export function deriveAllReminders(params: {
  conditions: { name: string; level: number }[];
  psychologyTraits: PsychologyTrait[];
  psychologyEnabled: boolean;
}): CombatReminder[];

/**
 * The exact reminder description string for a condition, or undefined if that
 * condition has no reminder. THIS is what end-of-turn.ts calls so the two never
 * drift. Returns byte-identical strings to today's inline literals.
 */
export function conditionReminderText(conditionName: string): string | undefined;
```

### Internal derivation data

A single module-private table keyed by condition name holds `{ description,
test?, citation }`, plus a `CONDITION_REMINDER_ORDER` array that reproduces the
order `end-of-turn.ts` currently pushes reminders (Stunned, Poisoned, Broken,
Blinded, Deafened) so that when `end-of-turn.ts` consumes
`conditionReminderText` its effect array stays in the same order. Psychology
derivation maps each `PsychologyTrait.type` to its row in the §1 table and reads
`PSYCHOLOGY_REMINDERS[type]` for the description so no psychology string is
re-authored here.

**Byte-identical strings (must match end-of-turn.ts today):**
- Stunned → `"Endurance Test (Challenging +0) required to remove"`
- Poisoned → `"Endurance Test to remove (each SL removes extra)"`
- Broken → `"Cool Test to remove"`
- Blinded → `"1 level removed every other round"`
- Deafened → `"1 level removed every other round"`

These five literals move verbatim into the `reminders.ts` table. The panel
displays the same `description`, so there is exactly one place to change them.

---

## 3. Refactor of `end-of-turn.ts` (output must stay byte-identical)

`processEndOfTurn` keeps its full signature, damage math, `removedConditions`
logic, `roundAdvanced`, and the exact push order. The **only** change: the five
reminder effects stop using inline string literals and instead call
`conditionReminderText(name)`:

```ts
// before
effects.push({ type: 'reminder', condition: 'Stunned',
  description: 'Endurance Test (Challenging +0) required to remove' });

// after — same object shape, same string, sourced from the shared module
effects.push({ type: 'reminder', condition: 'Stunned',
  description: conditionReminderText('Stunned')! }); // Core p.169 (cited in reminders.ts)
```

Because `conditionReminderText` returns the identical literal, every existing
`EndOfTurnEffect` is unchanged field-for-field. The damage effects (Bleeding,
Ablaze, Poisoned damage), `remove_condition` (Surprised), `newWounds`,
`roundAdvanced`, and the Poisoned-reminder-in-addition-to-damage branch are
untouched. **Existing end-of-turn tests stay green with no edits** — this is the
acceptance bar for the refactor. The non-null assertion is safe because the five
names are compile-time known to exist in the table; a unit test asserts
`conditionReminderText` returns a string for each of those five names so a future
table edit can never silently break the `!`.

No behavioural change: `end-of-turn.ts` still emits reminders *as part of the
End-of-Turn report only*. The new panel is an additional, independent consumer
of `reminders.ts`; it does not call `processEndOfTurn` and does not change when
or how end-of-turn automation runs.

---

## 4. UI surface

### Placement decision

**Recommendation: a compact section inside the full `CombatDashboard`, rendered
only during active combat, directly above the "End Turn" button.** Rejected
alternatives and why:

- *A start-of-round modal* — too intrusive; the product decision is passive
  surfacing, and a blocking modal each round fights that. Rejected.
- *A separate top-level panel on CombatPage* — duplicates the dashboard's role
  as the combat status hub and competes with the mode panels. Rejected.
- *Both dashboard + start-of-round* — more surface area than the "least
  intrusive" constraint allows. Rejected.

The dashboard already owns wounds, advantage, conditions, round counter, and the
End-Turn action, so reminders belong there as a natural "before you end your
turn, consider these" prompt. It renders in `CombatDashboardFull` (not the
compact sticky strip, which stays minimal). The compact strip
(`CombatDashboardCompact`) is unchanged.

### In combat vs out of combat

**Recommendation: reminders appear only during active combat** (`inCombat`
true). Condition/psychology tests in WFRP are resolved per-round in combat;
outside combat there is no round structure to prompt against, and the Psychology
Tracker already lists traits with their reminder text on the Character page.
Surfacing roll buttons out of combat would invite rolls with no round context.
Psychology reminders therefore show in combat **and** only when the Psychology
Tracker house rule is on. (Listed in §9 as a confirmable product call.)

### New component: `src/components/combat/CombatReminders.tsx` (+ `.module.css`)

Props:

```ts
export interface CombatRemindersProps {
  reminders: CombatReminder[];
  /** Opens the shared RollDialog seeded with this reminder's test. */
  onRollReminder: (reminder: CombatReminder) => void;
}
```

Rendering:
- If `reminders.length === 0`, render nothing (zero DOM — consistent with the
  existing "zero DOM when disabled" pattern used for Yenlui/Psychology gating).
- Otherwise a titled section ("Reminders", with the existing `AlertTriangle`
  lucide icon used elsewhere in the dashboard) listing each reminder as a row:
  label + description, an info button that opens the shared `Tooltip` showing the
  rulebook citation, and — when `reminder.test` is present — a **Roll** button
  (`aria-label={`Roll ${reminder.test.rollName}`}`) that calls
  `onRollReminder(reminder)`. Informational reminders show no Roll button.
- Follows existing CSS-module conventions (`CombatReminders.module.css`),
  reusing the dashboard's `pressable` micro-interaction class for the button.

The component is presentational/pure (no derivation, no roll resolution) so it is
straightforward to component-test.

### One-tap roll wiring (lives in `CombatDashboardFull`)

The dashboard already imports `character` and renders combat controls, but roll
dialogs currently live on `CombatPage`/`QuickRollBar`. To avoid threading new
roll plumbing through the dashboard, the roll flow is owned by
`CombatDashboardFull` locally, mirroring `QuickRollBar`'s self-contained pattern:

0. **Undefined-`character` guard (feasibility).** `character?` is optional on
   `CombatDashboardProps` (verified; the dashboard already guards `character &&`
   for its end-turn TB/AP math). Because psychology derivation and *all* roll
   target resolution read `character` (`psychologyTraits`, `chars`), the reminder
   flow is gated on `character` being defined:
   - When `character` is **undefined**, the dashboard still derives **condition
     reminders only** (these need `conditions`, not `character`) by calling
     `deriveConditionReminders(conditions)`, and passes `psychologyEnabled: false`
     so no psychology reminders appear. Crucially, the dashboard **strips the
     `test` from every reminder** before handing them to `CombatReminders` when
     `character` is undefined (map each reminder to `{ ...r, test: undefined }`),
     so every row renders informational-only with **no Roll button** — a Roll
     button can never appear without a sheet to resolve a target against.
   - `onRollReminder` **early-returns** when `character` is undefined, so no
     `RollDialog` can ever open without a `character`. This makes §6's
     "characteristic resolution cannot throw" guarantee hold unconditionally:
     target resolution only runs once `character` is known-defined.
   In normal use inside `CombatPage`, `character` is always provided; this guard
   is a defensive contract, asserted by a component test (empty/no-button render
   when `character` is undefined).
1. When `character` **is** defined, `CombatDashboardFull` computes `reminders`
   via `deriveAllReminders(...)` from `conditions`, `character.psychologyTraits ??
   []`, and `character.houseRules?.usePsychologyTracker ?? false`, memoised with
   `useMemo` on those inputs.
2. It renders `<CombatReminders reminders={reminders} onRollReminder={...} />`.
3. `onRollReminder(reminder)` first checks `character` is defined (early-return
   otherwise, per step 0), then resolves the **base target** from the reminder's
   `test.def` against `character` (see §5) and opens the existing
   `RollDialog` (`skillOrCharName={test.rollName}`,
   `baseTarget`, pre-selected `difficulty` where `RollDialog` supports a default,
   matching how `CombatPage.openWeaponRoll` seeds `defaultDifficulty`).
4. On result, it shows `RollResultDisplay` and calls a new optional
   `onRoll?: (r: RollResult) => void` dashboard prop so `CombatPage` can forward
   to `addRoll` (the existing roll-history sink shown in Status mode). If
   `onRoll` is absent the roll still displays; it simply is not persisted.

`CombatPage` passes `onRoll={(r) => addRoll?.(r)}` to both dashboard instances
(desktop full + the compact branch is unaffected because reminders only render in
the full variant). No change to `RollDialog`, `RollResultDisplay`, or
`dice-roller.ts`.

> **calculated-total-tooltips compliance:** the reminder rows show the rule
> description and citation but do **not** display a *calculated total*. The one
> calculated number in this flow is the roll's **base target** inside
> `RollDialog`, which already renders its own breakdown. If a reminder row is
> later changed to display a computed target number inline, that number must get
> a `Tooltip` breakdown (`Initial + Advances + Bonus + Skill = Target`) via
> `src/components/shared/Tooltip.tsx`, per the calculated-total rule. This is
> called out so the implementer does not add a bare total without a tooltip.

---

## 5. Resolving the roll target (reuse existing math only)

Target resolution reuses `computeSkillTarget` / `computeCharacteristicTarget`
exactly as `QuickRollBar` and `CombatPage` already do — no new formula:

- `ReminderTest.kind === 'skill'` (Cool, Endurance, Athletics are Skills in
  WFRP, each tied to a characteristic): find the skill by name in
  `[...character.bSkills, ...character.aSkills]`. If found, read the skill's own
  `c` field for the characteristic and compute base target =
  `computeSkillTarget(charVal.i, charVal.a, charVal.b, skill.a)` where
  `charVal = character.chars[skill.c]` — this is byte-for-byte the pattern
  `QuickRollBar.buildQuickSkills` and `AttackFlow` already use (verified). If the
  skill is absent from the sheet (the normal untrained case), fall back to the
  bare characteristic total
  `computeCharacteristicTarget(charVal.i, charVal.a, charVal.b)` on the reminder
  table's `fallbackChar` (WFRP: an untrained Skill still tests off its
  characteristic). The characteristic groupings per the Core skill list are
  **Cool → Willpower (WP)**, **Endurance → Toughness (T)**, **Athletics →
  Agility (Ag)**; these are read from the skill's `c` field when the skill is on
  the sheet, and from the explicit `fallbackChar` constant when it is not.
  (Note on the existing `: skill.a` fallback: `Skill.c` is typed as a free-form
  `string`, so `character.chars[skill.c]` can be `undefined` for a non-standard
  or legacy skill whose `c` is not one of the ten `CharacteristicKey`s. The
  `: skill.a` branch in `QuickRollBar.buildQuickSkills` is therefore a **live
  defensive guard**, not dead code, and must be left untouched. The reminder
  deriver avoids this situation entirely by resolving the characteristic from the
  reminder table's `fallbackChar` — a known-good `CharacteristicKey` — rather
  than reading it off `skill.c`, which is strictly safer than the existing
  pattern.)
- `ReminderTest.kind === 'characteristic'`: base target =
  `computeCharacteristicTarget(char.i, char.a, char.b)`.

`fallbackChar` values in the reminder table (used only when the skill is not on
the sheet): Cool → `WP`, Endurance → `T`, Athletics → `Ag`, Frenzy (Willpower) →
`WP`. These are the characteristic groupings per the Core skill list and are
cited in a comment at the table.

Difficulty passes straight into the existing `performRoll`/`RollDialog` via
`DifficultyLevel`; the player can override in the dialog (important for Broken
and Ablaze whose RAW difficulty is circumstance-dependent, and for the
psychology Cool/Willpower tests whose difficulty is GM-set per Core p.189 — the
app seeds a sensible default and lets the player adjust, never inventing a fixed
value; see §9.1, §9.3, §9.10).

**`rollName` is explicit per reminder** so the surfaced test is never ambiguous
when RAW has more than one candidate test. Fear, in particular, has three RAW
Cool tests (the Extended overcome-Fear test plus the "move closer" and "it comes
closer" Challenging (+0) tests); the one-tap button uses `rollName: "Cool
(overcome Fear)"` and represents a single Challenging (+0) Cool Test, with the
player interpreting the returned SL against the accumulating Extended total
(§9.7). Each table row's `rollName` likewise names its purpose, e.g. `"Endurance
(remove Stunned)"`, `"Cool (rally from Broken)"`.

---

## 6. Error handling and validation

Each input and failure mode is specified concretely:

- **Undefined `character` prop.** `character?` is optional on the dashboard. Per
  §4 step 0, when it is undefined the dashboard derives condition reminders only,
  strips every `test` so no Roll button renders, and `onRollReminder`
  early-returns — so no target resolution ever runs without a sheet. Recoverable,
  no throw, no user-facing error.
- **Missing characteristic/skill on the sheet** (only reachable when `character`
  is defined). `character.chars[key]` is always present (DEFAULT_CHARS guarantees
  all ten keys), so characteristic resolution cannot throw. A missing *skill* is
  the normal untrained case → fall back to the bare characteristic via the table's
  `fallbackChar` (above). Recoverable, no log, no user-facing error.
- **Unknown condition name.** `conditionReminderText` returns `undefined` for any
  name not in the table (e.g. Entangled/Fatigued have no turn-test reminder); the
  deriver simply omits it. `end-of-turn.ts` only ever calls it with the five known
  names, so its `!` is safe (guarded by the §3 unit test). No throw.
- **Psychology trait with missing rating** (Fear/Terror). The label shows
  `Fear (Rating ?)` when `rating` is undefined, and the roll still resolves (the
  Cool Test TN does not depend on the rating — the rating is the SL threshold the
  *player* judges). Recoverable, informational.
- **`psychologyTraits` undefined.** Optional on `Character`; the deriver coalesces
  to `[]`. No throw.
- **Roll resolution failure.** Delegated entirely to the existing
  `RollDialog`/`performRoll`, which already clamp and validate roll input. The
  dashboard's existing `handleEndTurn` try/catch pattern is the precedent; the
  reminder roll path has no new failure surface beyond what `RollDialog` owns, so
  no additional try/catch is added (adding an empty one would violate the
  fix-errors "no swallowing" rule).

**Invariants and ownership:**
- *Passivity invariant* ("a reminder roll never mutates character state"):
  enforced at the UI layer — `onRollReminder` only opens a dialog and forwards the
  result to `addRoll` (history), never to `updateCharacter`/`update`. A component
  test asserts no condition/wound/advantage mutation occurs on a reminder roll.
- *Single-source-of-truth invariant* ("condition reminder strings match
  end-of-turn output"): enforced in `reminders.ts` (the table) and verified by a
  property test (§7) that cross-checks `conditionReminderText` against the strings
  `processEndOfTurn` emits.
- *Order invariant*: `deriveConditionReminders` iterates a fixed order array, so
  output order is independent of input order — a property the fast-check suite
  asserts directly.

---

## 7. Test plan (fix-errors: all green, root-cause, no skips/ignores)

Unit (`src/logic/__tests__/reminders.test.ts`):
- `conditionReminderText` returns the exact expected literal for each of Stunned,
  Poisoned, Broken, Blinded, Deafened; returns `undefined` for Entangled,
  Fatigued, Prone, Surprised, Unconscious, and an unknown name.
- `deriveConditionReminders` maps each roll-backed condition to the correct
  `test` (char/skill, difficulty) and citation; marks Blinded/Deafened/Bleeding
  informational (no `test`).
- `derivePsychologyReminders` returns `[]` when `enabled` is false; otherwise maps
  each of the eight types to the §1 row, Trauma informational, Fear/Terror labels
  include the rating.

fast-check property tests (`reminders.property.test.ts`):
- **Exact-set property:** given an arbitrary set of conditions (from the known
  condition names) + psychology traits, the derived reminders are *exactly* the
  expected set — one reminder per reminder-bearing condition and per trait, with
  the correct `test` presence/absence, difficulty, and characteristic/skill. No
  spurious reminders, none missing.
- **Order stability:** shuffling the input condition array does not change output
  order (iterates `CONDITION_REMINDER_ORDER`).
- **End-of-turn parity:** for any condition set, filter `processEndOfTurn`'s
  effects to `effect.type === 'reminder'` (this excludes Surprised, which emits a
  `remove_condition` effect, and the damage half of Bleeding/Ablaze/Poisoned —
  note Poisoned emits *both* a `damage` and a `reminder` effect, and only the
  latter is compared). For each remaining reminder effect, assert
  `effect.description === conditionReminderText(effect.condition)` — the
  anti-drift guarantee, expressed as a property so it holds for all inputs.
- **Reverse-direction / single-source assertions** (concrete, not prose, so they
  cannot be dropped at implementation time):
  1. For each name in `CONDITION_REMINDER_ORDER`, assert
     `conditionReminderText(name)` is defined and a non-empty string (every
     ordered reminder is reachable — no orphan order entries).
  2. Assert no reminder description literal remains inline in `end-of-turn.ts`:
     a source-level check that the five byte-identical strings
     (`"Endurance Test (Challenging +0) required to remove"`,
     `"Endurance Test to remove (each SL removes extra)"`, `"Cool Test to
     remove"`, `"1 level removed every other round"`) do **not** appear as string
     literals in `src/logic/end-of-turn.ts` (read the file text in the test and
     assert absence), proving each string lives in exactly one place
     (`reminders.ts`).

Component tests (`src/components/combat/__tests__/CombatReminders.test.tsx`):
- Renders nothing for an empty list (zero DOM).
- Renders a Roll button only for reminders with a `test`; informational rows have
  no Roll button.
- Clicking Roll calls `onRollReminder` with the right reminder; the info button
  opens the `Tooltip` with the citation text.

Integration (dashboard wiring,
`src/components/combat/__tests__/CombatDashboard.reminders.test.tsx`):
- With Stunned applied in combat, the dashboard shows the Stunned reminder; tapping
  Roll opens `RollDialog` seeded with "Endurance" and Challenging difficulty; the
  result flows to the `onRoll` spy; **no** condition/wound/advantage mutation
  occurs (passivity invariant).
- With the Psychology Tracker house rule off, no psychology reminders render even
  when traits exist; with it on, they do.
- **Undefined `character` guard (finding 2):** with `character` undefined and a
  condition applied in combat, the dashboard renders the condition reminder row(s)
  with **no Roll button** and no psychology reminders, and invoking the reminder
  Roll path opens no `RollDialog` (`onRollReminder` early-returns).

Regression: the existing `end-of-turn` test file runs **unchanged** and passes,
proving byte-identical output after the refactor.

Verification commands (planned): `npm run lint`, `npx tsc --noEmit`,
`npm run test` (Vitest). Any surfaced lint/type/test/build error is fixed at root
cause — no `@ts-ignore`, `eslint-disable`, or skipped tests. The single sanctioned
`react-hooks/set-state-in-effect` disable (mirroring `Tooltip.tsx`) is **not**
expected to be needed here; the reminder roll flow is event-driven, not effect-
driven. If the memoised-derive ever needs an effect, the precedent may be reused
only with the same justifying comment.

---

## 8. Files touched

New:
- `src/logic/reminders.ts` — pure derivation + single source of truth.
- `src/components/combat/CombatReminders.tsx` + `CombatReminders.module.css`.
- Test files listed in §7.

Modified:
- `src/logic/end-of-turn.ts` — reminder strings sourced from `conditionReminderText`
  (output byte-identical; §3).
- `src/components/combat/CombatDashboard.tsx` — derive reminders, render
  `CombatReminders` in `CombatDashboardFull` above End Turn, own the reminder roll
  dialog flow, add optional `onRoll` prop.
- `src/components/pages/CombatPage.tsx` — pass `onRoll={(r) => addRoll?.(r)}` to the
  dashboard.

Unchanged (consumed as-is): `dice-roller.ts`, `RollDialog`, `RollResultDisplay`,
`psychology.ts` (`PSYCHOLOGY_REMINDERS` read, not edited), `conditions.ts` data,
`Tooltip.tsx`, `EndOfTurnReportModal`.

---

## 9. Open questions / ambiguities flagged (rules-compliance §6/§7)

1. **Broken difficulty (Core p.169).** RAW difficulty is "determined by the
   circumstances" (Average +20 when safely hidden … Very Hard –30 next to a
   daemon) — no fixed value. Design seeds **Challenging (+0)** as a neutral
   default the player adjusts in the dialog. Confirm this default, or prefer a
   different seed (e.g. Average +20).
2. **Broken while Engaged (Core p.169).** "You cannot Test to rally from being
   Broken if you are Engaged with an enemy." Should the Broken reminder's Roll
   button be **disabled** (with an explanatory tooltip) when
   `combatState.engaged` is true, or left enabled since the app can't always know
   true engagement state? Design currently leaves it enabled and informational;
   needs a ruling.
3. **Ablaze difficulty (Core p.168).** "Difficulty … modified by circumstances"
   (sand vs oil-soaked kitchen). Same treatment as Broken — default Challenging,
   player adjusts. Confirm.
4. **Entangled (Core p.169) — Opposed Strength.** This is an *opposed* test with no
   fixed TN and requires an opponent value the app doesn't hold, so it is surfaced
   as **informational only** (no Roll button). Confirm that's acceptable, or
   specify a default Strength Test the player makes solo.
5. **Trauma (psychology).** `PSYCHOLOGY_REMINDERS.Trauma` ends in "penalties at GM
   discretion" — non-deterministic. Surfaced **informational only**. Confirm.
6. **"Psychology Test" = Cool.** Animosity/Hatred/Prejudice/Phobia are resolved
   with a Cool Test in the app (consistent with existing `PSYCHOLOGY_REMINDERS`
   wording). Confirm Cool is the intended characteristic for the roll button for
   all of these (Frenzy uses Willpower per RAW).
7. **Fear as Extended Cool Test (Core p.190).** Fear is an *Extended* test
   (accumulate SL across rounds until ≥ Rating). The app's one-tap roll performs a
   *single* Cool Test and shows SL; it does not track the running Extended total.
   Confirm single-roll surfacing is acceptable (the player tracks accumulation), or
   whether an Extended-test accumulator is in scope (recommend out of scope for
   this feature).
8. **Out-of-combat psychology.** Design shows reminders only in active combat.
   Confirm psychology reminders are not wanted out of combat (they remain visible
   as static text in the Psychology Tracker panel regardless).
9. **Terror description wording (Core p.190 vs app string).** The app's existing
   `PSYCHOLOGY_REMINDERS.Terror` says a failed Terror test gives "Broken condition
   **and Fatigued** conditions equal to Terror rating." Core p.190 describes
   Broken conditions equal to the Terror Rating (plus SL below 0); it does not
   add Fatigued. This feature reuses the app's string **verbatim** (it does not
   re-author psychology prose), so the discrepancy is surfaced, not introduced,
   by this work. Confirm whether `psychology.ts` should be corrected to match RAW
   (a separate, out-of-scope edit) or the current wording is an intentional house
   interpretation. Either way, `reminders.ts` keeps reflecting whatever
   `PSYCHOLOGY_REMINDERS` holds so the two never diverge.
10. **Psychology-test difficulty is GM-set (Core p.189).** The "Psychology Test"
    rule states the Difficulty is **set by the GM**; RAW fixes no value for
    Animosity, Hatred, Prejudice, or Phobia (nor for the secondary Fear/Terror
    Cool Tests). Exactly as Broken (§9.1) and Ablaze (§9.3) are handled, the
    design seeds **Challenging (+0)** purely as a neutral, adjustable default
    that the player overrides in the `RollDialog` Difficulty `<select>` — it is
    **not** an invented threshold, and `reminders.ts` cites Core p.189 at each
    psychology row's difficulty. Confirm Challenging (+0) is an acceptable neutral
    seed, or prefer a different default. (Frenzy uses a Willpower Test per RAW,
    but its difficulty is likewise GM-set and seeded the same way.)

---

## 10. Non-goals

- No change to end-of-turn automation behaviour (damage application and existing
  reminder output stay identical).
- No auto-roll, no auto-removal of conditions, no auto-application of psychology
  consequences. One tap = one explicit, player-initiated roll.
- No Extended-test accumulator, no opponent modelling for opposed tests (Entangled,
  Pummel-style), no GM-side tooling.
- No new runtime dependencies; no changes to the dice engine or roll history
  storage.

---

## 11. Review responses (revision pass)

This pass resolves the findings in `design-review.json` (verdict
**CHANGES_REQUESTED** — 3 MEDIUM, 3 NIT), which reviews *this* reminders design
against source and `docs/`. Each finding is addressed below. (An earlier,
unrelated `design-review.json` had reviewed the crit-pipeline design; it has no
bearing here and is superseded by the current review.)

- **Finding 1 (MEDIUM — GM-set psychology difficulty flagged).** Resolved.
  Animosity/Hatred/Prejudice/Phobia (and the secondary Fear/Terror Cool tests)
  now mark Challenging (+0) as an **adjustable, GM-set default** in the §1
  psychology table, citing Core p.189 ("Difficulty set by the GM"), and a new
  **§9.10** open question records that RAW leaves psychology-test difficulty to
  the GM so the seed is a neutral default the player overrides in the dialog —
  the same treatment Broken (§9.1) and Ablaze (§9.3) already get. No invented
  threshold.

- **Finding 2 (MEDIUM — undefined-`character` behaviour).** Resolved. §4 adds
  **step 0**, an explicit undefined-`character` guard: when `character` is
  undefined the dashboard derives condition reminders only, strips every `test`
  so no Roll button can render, and `onRollReminder` early-returns so no
  `RollDialog` opens without a sheet. §6 adds a matching error-handling bullet and
  scopes the "characteristic resolution cannot throw" guarantee to the
  `character`-defined path. A component test asserts the no-button render.

- **Finding 3 (MEDIUM — false "dead branch" claim).** Resolved. §5's parenthetical
  no longer calls the `: skill.a` fallback dead code; it now states `Skill.c` is a
  free-form `string`, so `character.chars[skill.c]` can be `undefined` and the
  `QuickRollBar` guard is **live** and must be left untouched. The deriver resolves
  the characteristic from the table's `fallbackChar` (a known `CharacteristicKey`)
  instead — strictly safer. `QuickRollBar` is unchanged.

- **Finding 4 (NIT — Stunned page citation).** Resolved. Stunned is now cited at
  Core p.169 (Master Condition List pp.168–169) in both the §1 table and the §3
  refactor comment, consistent with the other conditions.

- **Finding 5 (NIT — ambiguous Fear button).** Resolved. The Fear row and §5 now
  specify `rollName: "Cool (overcome Fear)"`, state the single button is one
  Challenging (+0) Cool Test, and note the player interprets its SL against the
  accumulating Extended total (§9.7). §5 also documents that every row's
  `rollName` names its purpose so the surfaced test is unambiguous.

- **Finding 6 (NIT — vague reverse-direction property).** Resolved. §7 now states
  two concrete assertions: (1) for each `CONDITION_REMINDER_ORDER` name,
  `conditionReminderText(name)` is defined and non-empty; (2) a source-level check
  that none of the five byte-identical reminder literals appear inline in
  `end-of-turn.ts`, proving each string lives only in `reminders.ts`.

All cited integration points (`computeSkillTarget`, `computeCharacteristicTarget`,
`performRoll`, `DifficultyLevel`, `RollResult`, `PSYCHOLOGY_REMINDERS`,
`CombatDashboardProps.character?`) were re-confirmed against source during this
pass. The review's one open sub-point — whether the Broken Roll button should be
disabled when `combatState.engaged` (Core p.169 bars rallying while Engaged) —
remains a product ruling tracked in **§9.2**; the `combatState.engaged` flag the
answer needs is confirmed available, so it is answerable at sign-off.
