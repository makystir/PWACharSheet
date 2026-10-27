# Character Assistant — Technical Design

> **Revision 2** — reworked to resolve every finding in
> `.agents/tasks/character-assistant/design-review.json` (2 HIGH, 4 MEDIUM, 5
> NIT). See **Responses to design review** at the end for a per-finding mapping.

## Overview

The Character Assistant turns the app from a passive tracker into an active
assistant by surfacing state the app **already computes** (unspent XP, pending
endeavours, encumbrance, corruption, combat/psychology reminders) as a single,
consolidated, non-intrusive list of **suggestions** the player may act on with
one tap. It never decides for the player: every action routes through an
existing, explicit, player-confirmed flow (open the roll dialog, navigate to a
page/sub-tab, or invoke the real advance handler on the Advancement page).

The feature is built in three layers that mirror the existing command-palette
architecture exactly (provider + hook + portal overlay), so it introduces no new
paradigm:

1. **A pure engine** (`src/logic/assistant/…`) — a React-free, deterministic,
   offline function `getSuggestions(character, context): Suggestion[]` exposed
   behind a `SuggestionSource` interface. It performs no side effects and emits
   plain, JSON-serializable `Suggestion` objects whose `action` is a serializable
   **descriptor**, not a closure. The deterministic engine is the default source
   and the permanent offline fallback; the interface is typed so a future async
   (e.g. LLM-backed) source is a non-breaking addition.
2. **A provider + hook** (`src/components/assistant/AssistantContext.tsx`) —
   mirrors `CommandPaletteProvider`/`useCommandPaletteContext`, exposing
   `isOpen`/`open()`/`close()`/`toggle()`. Mounted at the app shell beside
   `CommandPaletteProvider`.
3. **The UI** — a persistent badge-carrying **trigger** rendered inside
   `Navigation` (desktop sidebar + mobile scroll row), and a dockable **panel**
   (slide-over drawer on desktop, bottom sheet on mobile) rendered via portal.
   The UI is the only layer that interprets an `action` descriptor and invokes
   the real handler.

The engine and the badge are fed by the **same** source call, so the count and
the panel contents can never disagree (FR-9.4). The feature is additive:
`reminders.ts`, `CombatReminders`, `AdvancementPage`, and the `Navigation`
badges are **consumed/extended, not rewritten**.

### Technology stack (locked once approved)

- TypeScript + React (function components + hooks), matching the codebase.
- CSS Modules for all component styling (`*.module.css`), matching
  `CommandPalette.module.css` / `Navigation.module.css`.
- `createPortal` into `document.body` for the overlay, matching `CommandPalette`
  and `Tooltip`.
- `lucide-react` for icons (the trigger icon is `Sparkles` or `Lightbulb`).
- Vitest + `fast-check` for engine property tests; `@testing-library/react` for
  component tests — matching the existing `reminders.ts` / command-palette test
  precedent.
- No new runtime dependencies. No network/backend/AI code is added.

---

## Module layout and files

### New files

```
src/logic/assistant/
  types.ts              // Suggestion, SuggestionAction, SuggestionContext,
                        // SuggestionSource, SuggestionCategory, SuggestionUrgency,
                        // SuggestionTotal
  engine.ts             // getSuggestions(...) + deterministicSuggestionSource
  visible.ts            // visibleSuggestions(...) — pure dismiss/snooze filter
  rules/
    advancement.ts      // FR-8.1
    endeavours.ts       // FR-8.2
    encumbrance.ts      // FR-8.3
    corruption.ts       // FR-8.4
    reminders.ts        // FR-8.5 — adapts CombatReminder -> Suggestion
  ordering.ts           // context-aware ordering + grouping (FR-3)
  __tests__/
    engine.property.test.ts
    engine.serializable.property.test.ts
    engine.purity.test.ts
    visible.test.ts
    rules.advancement.test.ts
    rules.endeavours.test.ts
    rules.encumbrance.test.ts
    rules.corruption.test.ts
    rules.reminders.test.ts
    ordering.test.ts

src/components/assistant/
  AssistantContext.tsx          // provider + hook (mirrors CommandPaletteContext)
  AssistantPanel.tsx            // drawer/sheet overlay (portal)
  AssistantPanel.module.css
  AssistantTrigger.tsx          // badge-carrying trigger button (shared by nav)
  AssistantTrigger.module.css
  SuggestionItem.tsx            // one row: title, rationale, action, dismiss/snooze
  SuggestionItem.module.css
  useAssistantActions.ts        // maps SuggestionAction -> real app handlers
  dismissStore.ts               // local-only dismiss/snooze persistence
  __tests__/
    AssistantPanel.test.tsx
    AssistantTrigger.test.tsx
    useAssistantActions.test.tsx
    dismissStore.test.ts
```

### Changed files (high-level diffs below)

- `src/App.tsx` — wrap with `AssistantProvider`; derive `SuggestionContext` and
  `Suggestion[]` from the character state already in scope; thread the trigger's
  badge count and the action handlers into `Navigation` and the panel; add a
  shell-level **reminder-roll state carrying `difficulty`** (see Finding 2).
- `src/components/layout/Navigation.tsx` — render `AssistantTrigger` beside the
  existing Search / Keyboard-Shortcuts triggers on both desktop and mobile,
  honouring the `onTouchEnd` preventDefault pattern and collapsed-sidebar
  behaviour. No change to `badgeItems` / nav-item badges.
- `src/logic/encumbrance.ts` — add `calculateCarriedEncumbrance(character)` (one
  shared reducer) so the engine, `GearTab`, and `PrintLayout` compute current
  encumbrance the **same** way.
- `src/logic/advancement.ts` — add `isReadyToAdvance(character)` (behaviour-
  preserving extraction of `AdvancementPage`'s inline `charsMet && skillsMet &&
  talentsMet`).
- `src/logic/endeavours.ts` (or the module that owns endeavour helpers) — add
  `hasActiveEndeavours(character)` (behaviour-preserving extraction of
  `App.tsx`'s `showEndeavoursBadge` predicate).
- `src/logic/reminders-target.ts` (new) — `resolveReminderBaseTarget(character,
  def)` extracted verbatim from `CombatDashboard.tsx` (behaviour-preserving) so
  both `CombatDashboard` and `useAssistantActions` share one implementation.

---

## The pure engine

### Exported types (`src/logic/assistant/types.ts`)

```ts
import type { Character } from '../../types/character';
import type { PageSection } from '../../components/layout/navItems';
import type { ReminderTest } from '../reminders';
import type { DifficultyLevel } from '../dice-roller';

/** Grouping key for a suggestion (FR-5.2). Extend by adding a member. */
export type SuggestionCategory =
  | 'combat'
  | 'advancement'
  | 'endeavour'
  | 'encumbrance'
  | 'corruption';

/**
 * Ordering/grouping signal (FR-5.2). Lower sorts first within a context.
 * `critical` = act now (overburdened, corruption at threshold, combat tests);
 * `recommended` = opinionated nudge (ready-to-advance);
 * `info` = soft reminder (unspent XP, endeavour to resolve).
 */
export type SuggestionUrgency = 'critical' | 'recommended' | 'info';

/**
 * A serializable descriptor the UI interprets to invoke an EXISTING handler
 * (FR-6). It is a discriminated union and MUST remain JSON-serializable: no
 * functions, DOM nodes, or class instances (FR-5.3). The engine never performs
 * the action — it only describes it.
 */
export type SuggestionAction =
  // Calls the existing navigate(page, subTab) threaded through App.tsx.
  // `page` is a real PageSection; `subTab` is a real sub-tab key for that page.
  | { kind: 'navigate'; page: PageSection; subTab?: string | null }
  // Opens the shared RollDialog seeded exactly as CombatDashboard.handleRollReminder:
  // the UI resolves `test.def` -> baseTarget via resolveReminderBaseTarget and
  // passes `test.difficulty` through to RollDialog's defaultDifficulty.
  // `test` REUSES the reminder test shape so no new roll logic is introduced.
  | { kind: 'roll'; test: { def: ReminderTest; difficulty: DifficultyLevel; rollName: string } };

/** A single recommendation. Plain data, JSON-serializable (FR-5.2 / FR-5.3). */
export interface Suggestion {
  /** Stable key for React lists, dedupe, and dismiss/snooze (FR-5.2). */
  id: string;
  /** Short human-readable label. */
  title: string;
  /** Brief "why" string; rulebook-cited where it encodes a rule (FR-10.1). */
  rationale: string;
  category: SuggestionCategory;
  urgency: SuggestionUrgency;
  action: SuggestionAction;
  /**
   * Optional **secondary** action (e.g. corruption's primary is a seeded roll,
   * secondary is "view Corruption panel"). Same descriptor union; serializable.
   */
  secondaryAction?: SuggestionAction;
  /**
   * Rulebook citation carried as DATA across the serializable boundary
   * (Finding 6 / FR-10.3 / AC18). For reminder-derived items this is
   * `CombatReminder.citation` VERBATIM; for native rules it is the same string
   * as the rule module's `// Core p.NNN` comment. The panel renders this
   * source-agnostically (it never re-derives it from reminders — FR-7.1).
   */
  citation?: string;
  /**
   * Optional calculated totals this suggestion displays, each with the
   * breakdown the panel renders through the shared Tooltip (FR-11). Plain data
   * only — the breakdown lines come from src/logic/breakdown-helpers.ts or the
   * reminder citation, never recomputed in the UI.
   */
  totals?: SuggestionTotal[];
}

export interface SuggestionTotal {
  /** e.g. "Encumbrance" or "Corruption". */
  label: string;
  /** Rendered value, e.g. "12 / 8". */
  display: string;
  /** Breakdown lines, e.g. ["Weapons 3", "Armour 1", "Trappings 7", "Coins 1"]. */
  lines: string[];
}

/**
 * Everything the engine needs beyond the character. Extensible WITHOUT a
 * breaking change: new optional fields only (FR-3.1).
 */
export interface SuggestionContext {
  /**
   * Single source of truth: character.combatState.inCombat — the exact signal
   * CombatPage passes to CombatDashboard (resolves OQ-4). The engine reads it
   * from context (not from the character) so the caller owns the one read.
   */
  inCombat: boolean;
}

/**
 * The boundary the panel consumes (FR-7). The panel knows nothing about how
 * suggestions are produced.
 *
 * FUTURE-PROOFING (FR-7.2): the return type is `Suggestion[] | Promise<Suggestion[]>`
 * so an async source (e.g. an LLM-backed source) is a NON-BREAKING extension —
 * the deterministic default returns the sync branch and remains the permanent
 * offline fallback (FR-7.3). Sync callers narrow with an `Array.isArray` guard
 * (see `visibleSuggestions` and the shell `useMemo`); the deterministic default
 * is ALWAYS synchronous, so the guard's sync branch is the only path taken today.
 */
export interface SuggestionSource {
  getSuggestions(
    character: Character | undefined,
    context: SuggestionContext,
  ): Suggestion[] | Promise<Suggestion[]>;
}
```

> **Note on the async union (Finding 7, NIT).** Every current consumer treats the
> result synchronously. To keep the type honest while not forcing an await path,
> callers narrow explicitly:
> ```ts
> const r = source.getSuggestions(character, ctx);
> const list: Suggestion[] = Array.isArray(r) ? r : []; // default source is always sync
> ```
> This is shown in both `visibleSuggestions` and the shell `useMemo` below so the
> snippets type-check as written. (A future async source would instead be consumed
> through an effect that sets state when the promise resolves; that addition does
> not change this interface — hence "non-breaking".)

### `engine.ts`

```ts
export const deterministicSuggestionSource: SuggestionSource = {
  // Always synchronous — the permanent offline fallback (FR-7.3).
  getSuggestions(character, context): Suggestion[] {
    return getSuggestions(character, context);
  },
};

/** Pure, deterministic, side-effect-free (FR-5.1). */
export function getSuggestions(
  character: Character | undefined,
  context: SuggestionContext,
): Suggestion[] {
  if (!character) return []; // NFR-6: absent sheet -> [] , never throws
  const raw = [
    ...advancementSuggestions(character),
    ...endeavourSuggestions(character),
    ...encumbranceSuggestions(character),
    ...corruptionSuggestions(character),
    ...reminderSuggestions(character, context),
  ];
  return orderSuggestions(raw, context); // FR-3.4 deterministic
}
```

Each `rules/*.ts` module is a pure function `(character) => Suggestion[]`. The
engine composes them, then `ordering.ts` sorts. The engine imports and REUSES
the existing calculators — it never recomputes a mechanic a second way:

- `advancement.ts` → `character.xpCur` and the extracted `isReadyToAdvance`.
- `endeavours.ts` → the extracted `hasActiveEndeavours` (same predicate as
  `showEndeavoursBadge`).
- `encumbrance.ts` → `calculateCarriedEncumbrance` + `calculateMaxEncumbrance`
  (with talent levels; see below) + `getEncumbranceLevel`.
- `corruption.ts` → `getCorruptionThreshold` / `getPureSoulLevel` (see corruption
  decision + OQ-2).
- `reminders.ts` → `deriveAllReminders` (consumed, not forked).

---

## Starter suggestion rules

### FR-8.1 — Advancement readiness

`readyToProgress` is currently computed **inline** inside `AdvancementPage.tsx`
(`charsMet && skillsMet && talentsMet`), not exported from a logic module. To
avoid both forking that logic and recomputing a mechanic a second way, the
design **extracts** the readiness predicate into a pure helper and has both the
page and the engine call it:

- Add `isReadyToAdvance(character): boolean` to `src/logic/advancement.ts` (the
  module that already owns `ADVANCE_LEVEL_FEE` and the advancement predicates).
  Move the `charsMet`/`skillsMet`/`talentsMet` computation verbatim into it;
  `AdvancementPage` then calls `isReadyToAdvance(character)` instead of its inline
  copy. This is a behaviour-preserving refactor (same inputs, same boolean) and
  keeps the engine and the page on one source of truth (NFR-2).
- Rule:
  - `xpCur > 0 && isReadyToAdvance(character)` → one suggestion, urgency
    `recommended`, title "Ready to advance your career", rationale "You meet the
    requirements and have XP to spend." Action `{ kind: 'navigate', page:
    'advancement' }`. **Opinionated recommendation only** — the real advance
    handler (`handleAdvanceLevel`) is invoked solely by the player on that page
    (FR-6.3 / AC9).
  - `xpCur > 0 && !isReadyToAdvance(character)` → one suggestion, urgency `info`,
    title "You have N unspent XP", action `{ kind: 'navigate', page:
    'advancement' }`.
  - `xpCur === 0` → nothing (mirrors `showAdvancementBadge = xpCur > 0`).

### FR-8.2 — Endeavours needing a result

Byte-identical predicate to `showEndeavoursBadge`:

```ts
character.endeavours.some(p => p.entries.some(
  e => e.status === 'pending' || e.status === 'in_progress'))
```

Emit one suggestion when true, urgency `info`, title "Resolve N endeavour(s)",
action `{ kind: 'navigate', page: 'endeavours' }`. To guarantee it never
diverges from `App.tsx`, this predicate is extracted to
`hasActiveEndeavours(character)` in a shared logic module and `App.tsx`'s
`showEndeavoursBadge` is switched to call it (behaviour-preserving; NFR-2).

### FR-8.3 — Overburdened (Core p.293)

Current encumbrance is currently computed inline in both `GearTab.tsx` and
`PrintLayout.tsx` as `eW + eA + eT + eCoin`. There is a breakdown helper
(`getTrappingEncBreakdown`) but **no single current-total helper**. To satisfy
"reuse existing calculators — do NOT recompute any mechanic a second way", add:

```ts
// src/logic/encumbrance.ts
// Core p.293: current Encumbrance = weapons + (worn-adjusted) armour +
// carried trappings + coin weight. Single source of truth consumed by the
// Gear view, PrintLayout, and the Assistant engine.
export function calculateCarriedEncumbrance(character: Character): number {
  const eW = character.weapons.reduce((s, w) => s + (parseFloat(w.enc) || 0), 0);
  const eA = character.armour.reduce((s, a) => s + calculateArmourEncumbrance(a.enc, a.worn), 0);
  const eT = calculateCarriedTrappingEnc(character.trappings, character.houseRules?.ignoreBackpackEnc ?? false);
  const eCoin = calculateCoinWeight(character.wGC, character.wSS, character.wD);
  return eW + eA + eT + eCoin;
}
```

`GearTab` and `PrintLayout` are then refactored to call it (behaviour-preserving;
their existing tests assert the same numbers).

**Max encumbrance — the `max` side (Finding 5, resolved).**
`calculateMaxEncumbrance(chars, strongBackLevel, sturdyLevel = 0)` (verified in
`src/logic/calculators.ts`) requires the **Strong Back** and **Sturdy** talent
levels — it is NOT derivable from `character.chars` alone. The pure engine obtains
these two levels the **same way `sheet-totals.ts` already does** (verified):

```ts
// src/logic/assistant/rules/encumbrance.ts
// Core p.293 (base SB+TB); p.146 (Strong Back +1/lvl, Sturdy +2/lvl).
const strongBackLevel = character.talents.find(t => t.n === 'Strong Back')?.lvl ?? 0;
const sturdyLevel = character.talents.find(t => t.n === 'Sturdy')?.lvl ?? 0;
const max = calculateMaxEncumbrance(character.chars, strongBackLevel, sturdyLevel);
const current = calculateCarriedEncumbrance(character);
```

This reuses the exact extraction `sheet-totals.ts` performs, so the engine does
not recompute the mechanic a second way — it calls the same `calculateMaxEncumbrance`
with talent levels read identically. (The engine is React-free, so it cannot read
the memoized `maxEncumbrance` from `useCharacter`; reading the two talent levels
inline is the self-contained equivalent and is unit-testable.)

Rule (**OQ-1 resolved — see below**): emit when `current > max`, urgency
`critical`, title "You are Overburdened", rationale cites the exact p.293 first
penalty band. Action `{ kind: 'navigate', page: 'character', subTab: 'gear' }`
(`'gear'` is a valid `character` sub-tab per `VALID_SUBTABS`; the encumbrance
indicator lives in the Gear tab). The suggestion carries a `totals` entry
`{ label: 'Encumbrance', display: '12 / 8', lines: [...] }` built from
`getTrappingEncBreakdown` + the weapon/armour/coin components + the max breakdown
(`getEncumbranceBreakdown`), rendered through the shared Tooltip (FR-11). The
`citation` field carries `"Core p.293: Overburdened"`.

### FR-8.4 — Corruption at/over threshold (Core p.183 + Pure Soul talent)

**Trigger (Finding 1, resolved — Pure Soul is INCLUDED).** The reviewer verified
the **Pure Soul** talent (p.182): *"You may gain extra Corruption points equal to
your level of Pure Soul before having to Test to see if you become corrupt."* So
Pure Soul **raises the Corrupting trigger**, and the app's existing
`getCorruptionThreshold = TB + WPB + Pure Soul` is the rulebook-accurate value.
The engine fires on the strict `>` from p.183 **including** Pure Soul:

```ts
// src/logic/assistant/rules/corruption.ts
// Core p.183 (Corrupting): test due when corr > WPB + TB.
// Pure Soul talent (p.182): adds its level to the trigger point.
// => test due when corr > (WPB + TB + Pure Soul) = corr > getCorruptionThreshold(chars, pureSoul).
const pureSoul = getPureSoulLevel(character.talents);
const threshold = getCorruptionThreshold(character.chars, pureSoul); // TB + WPB + Pure Soul
const due = character.corr > threshold; // strict > per p.183 (see remaining OQ-2 note on > vs >=)
```

The `totals` breakdown then matches the trigger exactly (no "shown vs used"
split): `{ label: 'Corruption', display: `${corr} / ${threshold}`,
lines: ['TB n', 'WPB n', 'Pure Soul n'] }`, sourced from the same
`getBonus`/`getPureSoulLevel` helpers `corruption.ts` uses. The `citation` field
carries `"Core p.183: Corrupting (+ Pure Soul talent, p.182)"`.

**What Test is due + action (OQ-3 + Finding 3, resolved consistently).** p.183
makes the trigger a **Challenging (+0) Endurance Test to resist corruption**; a
mutation is rolled only if that Test fails. The suggestion describes the Endurance
Test (not a "mutation test"):

- `urgency: 'critical'`
- `title: "Corruption Test due"`
- `rationale: "You have more Corruption than your WPB + TB (+ Pure Soul) — attempt a Challenging (+0) Endurance Test to resist corrupting (Core p.183)."`
- **Primary `action` — seeded roll** (matches p.183 "immediately attempt"):
  ```ts
  action: {
    kind: 'roll',
    test: {
      def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
      difficulty: 'Challenging',
      rollName: 'Endurance (resist Corruption)',
    },
  }
  ```
- **Secondary `secondaryAction` — view the Corruption panel** (Finding 4,
  resolved to a real route). The corruption UI is `CorruptionCard`, rendered in
  `src/components/pages/character/NotesTab.tsx` — it lives on the **character**
  page, **`notes`** sub-tab. There is **no `'corruption'` PageSection**. So:
  ```ts
  secondaryAction: { kind: 'navigate', page: 'character', subTab: 'notes' }
  ```

FR-8.4, OQ-3, and AC14 are now consistent: **primary = seeded Endurance roll;
secondary = navigate to `character/notes`**. Both are rendered as controls on the
one `SuggestionItem` (see the panel section). Neither auto-applies anything.

### FR-8.5 — Surface existing combat reminders (consume, do not fork)

`reminders.ts` is imported and called; it is **not** modified or duplicated. The
adapter in `rules/reminders.ts`:

```ts
import { deriveAllReminders, type CombatReminder } from '../../reminders';

function reminderToSuggestion(r: CombatReminder): Suggestion {
  return {
    id: `reminder:${r.id}`,            // namespaced so it can't collide
    title: r.label,
    rationale: r.description,           // reminder prose (verbatim)
    category: 'combat',
    urgency: 'critical',
    action: r.test
      ? { kind: 'roll', test: r.test }  // REUSES the reminder test shape (FR-6.4)
      : { kind: 'navigate', page: 'combat' }, // informational reminders -> go to combat
    citation: r.citation,               // Finding 6: carried as DATA, verbatim (FR-10.3)
  };
}

export function reminderSuggestions(character: Character, _ctx: SuggestionContext): Suggestion[] {
  return deriveAllReminders({
    conditions: character.conditions,
    psychologyTraits: character.psychologyTraits ?? [],
    psychologyEnabled: character.houseRules?.usePsychologyTracker ?? false,
  }).map(reminderToSuggestion);
}
```

`CombatReminder` has both `description` (short prose) and `citation` (the full
"Core p.NNN …" string). The adapter maps `description → rationale` and
`citation → suggestion.citation` **verbatim** — so the panel renders the citation
with no knowledge of the source (FR-7.1) and never re-authors it (FR-10.3). The
existing `CombatReminders` rendering in `CombatDashboard` is untouched. Reminders
appearing both there and in the Assistant panel is intended (the panel is the
consolidated view) — **OQ-6** confirms this duplication is acceptable and that
reminder suggestions count toward the badge while in combat.

---

## Ordering and grouping (FR-3)

`ordering.ts` groups by `category` and orders deterministically:

- **In combat** (`context.inCombat === true`): group order is `combat`,
  `encumbrance`, `corruption`, `advancement`, `endeavour`. Combat-first (FR-3.2).
- **Out of combat**: group order is `advancement`, `endeavour`, `corruption`,
  `encumbrance`, `combat`. Downtime/progression-first (FR-3.3). (Combat reminders
  are normally empty out of combat; if conditions persist they sort last.)

Within a group, sort by `urgency` (`critical` < `recommended` < `info`) then by a
stable tiebreaker (`id` lexical). Because inputs are plain data and the sort key
is total, identical `(character, context)` always yield the same ordered list
(FR-3.4 / AC5). The panel renders groups with a heading per non-empty category.

---

## The provider, hook, and app-shell wiring

`AssistantContext.tsx` mirrors `CommandPaletteContext.tsx` verbatim in shape:

```ts
export interface AssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}
export function AssistantProvider({ children }: { children: ReactNode }) { … }
export function useAssistantContext(): AssistantContextValue { … }
```

Wiring in `App.tsx`:

- Wrap the shell with `<AssistantProvider>` right beside `<CommandPaletteProvider>`
  (both inside `ErrorBoundary`):
  ```diff
    <CommandPaletteProvider>
  +   <AssistantProvider>
        <AppContent />
  +   </AssistantProvider>
    </CommandPaletteProvider>
  ```
- Inside `AppWithCharacter`, derive once (memoized), using the explicit sync
  narrowing (Finding 7):
  ```ts
  const assistantContext = useMemo<SuggestionContext>(
    () => ({ inCombat: character.combatState.inCombat }),
    [character.combatState.inCombat],
  );

  // Raw engine output (used for the dismiss-prune effect below).
  const rawSuggestions = useMemo<Suggestion[]>(() => {
    const r = deterministicSuggestionSource.getSuggestions(character, assistantContext);
    return Array.isArray(r) ? r : []; // default source is always sync (FR-7.3)
  }, [character, assistantContext]);

  // Visible = raw minus dismissed/snoozed (pure filter).
  const suggestions = useMemo(
    () => visibleSuggestions(rawSuggestions, dismissState, Date.now()),
    [rawSuggestions, dismissState],
  );
  ```
  `character` here is the SAME state `App.tsx` already uses to compute
  `showAdvancementBadge` / `showEndeavoursBadge`, so the badge count derives from
  one source (FR-9.4).
- **Dismiss GC/prune effect (Finding 8).** The "reappear on re-trigger" pruning
  is a WRITE, so it runs in an **effect** (never in render), keyed on the raw
  engine output:
  ```ts
  useEffect(() => {
    const activeIds = new Set(rawSuggestions.map(s => s.id));
    dismissStore.pruneDismissed(activeIds); // drops dismissed ids no longer emitted
  }, [rawSuggestions]);
  ```
  `visibleSuggestions` stays pure; the store write happens only in this effect.
- Render the panel once at the shell: `<AssistantPanel suggestions={suggestions}
  onAction={dispatchAction} onDismiss={…} onSnooze={…} />`, and pass the badge
  count + `open()` into `Navigation` for the trigger.
- `dispatchAction` lives in `useAssistantActions` and maps a `SuggestionAction`
  to the real handler already in scope. **The `roll` branch mirrors
  `CombatDashboard.handleRollReminder`, NOT the quick-roll path (Finding 2):**
  ```ts
  function dispatchAction(action: SuggestionAction) {
    switch (action.kind) {
      case 'navigate':
        navigate(action.page, action.subTab); // already threaded through App.tsx
        break;
      case 'roll': {
        // Quick-roll state ({ name, baseTarget }) is INSUFFICIENT: it has no
        // `difficulty` and does not resolve `def -> baseTarget`. Mirror
        // handleRollReminder instead.
        const baseTarget = resolveReminderBaseTarget(character, action.test.def); // extracted shared helper
        setReminderRollState({
          name: action.test.rollName,
          baseTarget,
          difficulty: action.test.difficulty,
        });
        break;
      }
      default: {
        const _exhaustive: never = action; // compile-time exhaustiveness
        console.warn('Assistant: unknown action', _exhaustive);
      }
    }
  }
  ```
  and a **new shell state** carries the difficulty through to `RollDialog`:
  ```ts
  const [reminderRollState, setReminderRollState] =
    useState<{ name: string; baseTarget: number; difficulty: DifficultyLevel } | null>(null);
  // …
  {reminderRollState && (
    <RollDialog
      skillOrCharName={reminderRollState.name}
      baseTarget={reminderRollState.baseTarget}
      defaultDifficulty={reminderRollState.difficulty}   // Finding 2: difficulty is honoured
      onRoll={handleReminderRollResult}
      onClose={() => setReminderRollState(null)}
    />
  )}
  ```
  (`RollDialog` accepts `defaultDifficulty?: DifficultyLevel`, verified.) This is
  a new state slot rather than overloading the existing `{ name, baseTarget }`
  quick-roll state, keeping the quick-roll path unchanged (NFR-2/NFR-5).

> **Why not `openSection` (Finding 10, resolved).** No v1 suggestion needs
> `openSection`; the `SuggestionAction` union is therefore **`navigate | roll`
> only**. The corruption "view panel" case is a plain `navigate` to
> `character/notes`. `openSection` is deferred until a consumer exists, removing
> the ambiguous "signal a CollapsibleSection via its storageKey" mechanism from
> v1 entirely.

---

## The trigger and badge (FR-1, FR-9, NFR-4)

`AssistantTrigger` is a single component rendered in `Navigation` in three
contexts, consistent with the Search/Shortcuts triggers:

- **Desktop expanded sidebar**: a labelled button ("Assistant") beside the
  Keyboard-Shortcuts button.
- **Desktop collapsed sidebar**: icon-only with `aria-label`/`title`, matching
  `navItemCollapsed`.
- **Mobile scroll row**: an entry in `mobileScrollRow` after Search/Shortcuts,
  using `onClick` **and** `onTouchEnd={(e) => { e.preventDefault();
  open(); }}` — the exact pattern the Search/Shortcuts buttons already use, so
  the nav touch-end fix is preserved (NFR-5 / FR-9.2). The trigger never calls
  `onPageChange`, so it cannot interfere with `handleNavTouchEnd`.

Badge (FR-1.2 / NFR-4):
- The count is `suggestions.length` (already dismiss/snooze-filtered).
- When `> 0`, render a numeric badge with an accessible name, e.g.
  `aria-label={`Assistant, ${count} suggestions`}` on the button, and the count
  inside a `<span aria-hidden>` so it is not double-announced. This is a
  **count**, not the decoration-only `badgeDot` used for nav items — assistive
  tech must hear the number (NFR-4 / AC2/AC19).
- When `0`, no count renders; the trigger stays visible and usable (FR-1.2).

---

## The panel: drawer vs bottom sheet (FR-2, NFR-4)

**Decision: one component, two presentations.** `AssistantPanel` renders the
same content tree and switches its container styling via the existing
`useMediaQuery('(max-width: 767px)')` breakpoint (the convention `Navigation`
already uses). On desktop the container is a right-side **slide-over drawer**; on
mobile it is a **bottom sheet**. Rejected alternative: two separate components
(`AssistantDrawer` + `AssistantBottomSheet`) — it duplicates the suggestion list,
focus logic, and ARIA, and the only real difference is CSS transform/position,
so a single component with a `data-variant="drawer|sheet"` attribute is simpler
and keeps behaviour identical across form factors.

Structure and behaviour mirror `CommandPalette` (the established overlay
precedent), reusing its proven focus/keyboard model:

- Rendered via `createPortal(…, document.body)`; returns `null` when `!isOpen`
  (closed by default; occupies no layout space; covers no primary content —
  FR-2.2 / AC3).
- `role="dialog"` with `aria-modal="true"` and a focus trap **while open**,
  consistent with the command palette (NFR-4).
- **"Non-blocking" clarification (Finding 9).** FR-2.2 "non-blocking" refers to
  the **closed** state: closed-by-default, zero layout footprint, covers no
  primary content. While **open**, the panel is an intentional modal dialog that
  matches the command palette (NFR-4) — `aria-modal="true"` + focus trap inert
  the background for assistive tech, which is the house standard. These are not
  in conflict: "non-intrusive/dismissible" describes the closed state and the
  easy exit (Escape/backdrop), not the open modal semantics. (A non-modal
  `role="complementary"` region was considered and rejected: it complicates focus
  return and keyboard dismissal, and diverges from the command-palette model.)
- `aria-label="Character Assistant"`; focus moves to the panel (its close button
  or first focusable) on open and is **restored to the trigger** on close, using
  the same `previousFocusRef` + `requestAnimationFrame` restore pattern as
  `CommandPalette` (NFR-4 / AC19).
- **Escape** closes; **Tab/Shift+Tab** are trapped within the panel; backdrop
  click closes — all reusing the command-palette handlers' structure.
- Each suggestion row (`SuggestionItem`) renders: title, rationale, a one-tap
  **primary action** button, an optional **secondary action** button (used by the
  corruption suggestion: "View Corruption"), an **info** affordance showing
  `suggestion.citation` + any `totals` breakdown tooltip, and **dismiss** +
  **snooze** controls. All controls are real `<button>`s reachable by keyboard
  (NFR-4 / AC4/AC19).

---

## Dismiss / snooze (FR-4, OQ-5)

**Decision (kept simple, local only):**

- `dismissStore.ts` persists a small record to `localStorage` under a single key
  `assistant-dismissals`, shape:
  ```ts
  interface DismissRecord { dismissed: string[]; snoozedUntil: Record<string, number>; }
  ```
  keyed by the suggestion's stable `id`. Reads/writes are wrapped in try/catch
  and degrade to an in-memory default on failure (private browsing / quota),
  mirroring `Navigation`'s `localStorage` handling. No network, ever (NFR-1).
- **Snooze**: time-based, a single fixed duration of **24 hours**
  (`snoozedUntil[id] = Date.now() + 24h`). A snoozed suggestion is filtered out
  until `Date.now() >= snoozedUntil[id]`. (A product/UX choice with no rulebook
  bearing; see remaining OQ-5 note.)
- **Dismiss**: a dismissed `id` is suppressed **until its underlying condition
  clears and re-triggers**. Because the engine re-emits a suggestion with the
  same stable `id` only while the condition holds, "re-trigger" is detected by
  the suggestion disappearing from the engine output and later reappearing. The
  prune that implements this (`dismissStore.pruneDismissed(activeIds)`) runs in
  the **shell effect** described above (Finding 8), where the current raw engine
  output is in hand — never during render and never inside the pure filter.
- Dismissed/snoozed suggestions do **not** contribute to the badge count
  (FR-4.3): `visibleSuggestions` filters before the count is taken, so count and
  panel always agree.

`visibleSuggestions(rawSuggestions, dismissState, now)` is the single **pure**
filter: input raw list → remove dismissed ids and snoozed-and-not-expired ids →
return. It performs no storage writes (those live in `dismissStore` methods
invoked by the UI/effect) and is unit-testable in isolation.

---

## Tooltips for calculated totals (FR-11)

Any calculated total the panel shows (encumbrance `current / max`, corruption
`points / threshold`, XP figure) is rendered through the shared
`Tooltip`/`TooltipTriggerCell` with a breakdown. The breakdown **lines come from
the engine's `SuggestionTotal.lines`**, which are built from the existing
breakdown helpers (`getTrappingEncBreakdown` + `getEncumbranceBreakdown` for
encumbrance; `getBonus`/`getPureSoulLevel` components for corruption; the XP
figure for advancement) — never recomputed in the UI. `SuggestionItem` owns a
`tooltipOpen` state and renders `<TooltipTriggerCell displayValue={total.display}
…>` + `<Tooltip title={total.label}>` exactly as other totals in the app do,
giving hover (desktop) and tap (touch) behaviour for free (FR-11.2).

---

## Rules compliance & citations (FR-10) + resolved ambiguities

Every rule-encoding suggestion carries a `// Core p.NNN` comment at its rule
module AND the same string as `suggestion.citation` data (Finding 6), following
the `reminders.ts` / `calculators.ts` precedent. Verified against
`docs/WarhammerFantasyRoleplay4e.md`:

- **OQ-1 — Overburdened trigger (Core p.293). RESOLVED.** The p.293 table reads
  "Up to limit → No penalties" and the first penalty band "Up to double limit →
  -1 Movement (min 3), -10 Agility, +1 Travel Fatigue". Mechanical penalties
  therefore begin only **above** the limit. **Decision: fire at `current > max`.**
  Rationale wording must quote the p.293 first band exactly and must **not**
  claim a penalty at exactly the limit. Comment/citation: `// Core p.293:
  Overburdened — penalties begin above carrying capacity ("Up to double limit")`.

- **OQ-2 — Corruption trigger: Pure Soul + `>` vs `>=`. RESOLVED (Finding 1).**
  Core p.183 "Corrupting" is a strict `>` on WPB + TB; the **Pure Soul** talent
  (p.182) explicitly adds its level to the trigger point. The rulebook-accurate
  trigger is therefore `corr > (WPB + TB + Pure Soul)`, which is exactly the
  app's existing `getCorruptionThreshold`. **Decision: fire on
  `corr > getCorruptionThreshold(chars, getPureSoulLevel(talents))`, Pure Soul
  INCLUDED, using the strict `>` from p.183.** The only legitimate remaining
  choice is the `>` (rulebook-literal) vs the app's `>=` (`getCorruptionStatus`
  'danger'); see the remaining open question below. Comment/citation:
  `// Core p.183 (Corrupting) + Pure Soul talent (p.182): test due when corr > WPB + TB + Pure Soul`.

- **OQ-3 — What Test "is due" + action. RESOLVED (and consistent, Finding 3).**
  p.183 makes the trigger a **Challenging (+0) Endurance Test to resist
  corruption**; a mutation is rolled only **if that Test is failed**. Title:
  "Corruption Test due"; rationale describes the Endurance Test (not a "mutation
  test"). **Primary action = seeded Endurance `roll`** (`{ def: { kind:
  'skill', skillName: 'Endurance', fallbackChar: 'T' }, difficulty: 'Challenging',
  rollName: 'Endurance (resist Corruption)' }`) matching p.183's "immediately
  attempt". **Secondary action = `navigate` to `character/notes`** (the real
  route hosting `CorruptionCard`; Finding 4). FR-8.4, OQ-3, and AC14 all now
  agree on this pair.

- **OQ-4 — "In combat" signal. RESOLVED.** `SuggestionContext.inCombat` is read
  from `character.combatState.inCombat`, the exact value `CombatPage` passes to
  `CombatDashboard`. One source of truth; no second notion of "in combat".

- **OQ-6 — Reminder double-surfacing. RESOLVED (accepted).** Reminders appear in
  both `CombatReminders` and the Assistant panel by design; reminder suggestions
  count toward the badge while in combat.

### Remaining open questions for the reviewer (do NOT guess)

- **OQ-2 (confirm `>` vs `>=` only):** The trigger includes Pure Soul (resolved).
  The remaining choice is whether to fire on the **rulebook-literal strict `>`**
  (`corr > threshold`, per p.183) or reuse the app's existing
  `getCorruptionStatus(corr, threshold) === 'danger'` which uses `>=`. The design
  defaults to the rulebook-literal `>`; confirm, or switch to `>=` for UI
  consistency with `CorruptionCard`. Whichever is chosen, the rationale text must
  match it. (This is a 1-point edge case at exactly the threshold.)
- **OQ-5 (confirm):** Snooze duration is set to a fixed **24h**. Confirm 24h (vs
  "until next session" or a chooser) and confirm the `assistant-dismissals`
  local key/shape.

No mechanic beyond what the app already computes is introduced (Out of Scope).

---

## Error handling and validation

Each failure path is concrete:

- **Absent/partial character** (`character === undefined`, or missing
  `endeavours`/`talents`/`conditions` arrays): `getSuggestions` returns `[]` and
  never throws (NFR-6). Each rule module coalesces optional arrays to `[]`
  exactly as `derivePsychologyReminders` does (`traits ?? []`). Not logged
  (expected state during load).
- **`localStorage` read/write failure** (private browsing, quota): `dismissStore`
  try/catch returns the in-memory default and silently continues (recoverable,
  not logged), matching `Navigation`'s existing storage handling.
- **Unknown/future `action.kind`** reaching `dispatchAction`: the UI handles only
  the two known kinds (`navigate`, `roll`) via an exhaustive `switch`; the
  `default` branch is a typed `never` assertion at compile time and a no-op +
  `console.warn` at runtime (recoverable; the player simply sees no navigation).
  This guards a future async source emitting an action the current UI does not
  understand.
- **`navigate`/`roll` target invalid** (e.g. a `subTab` the page rejects): the
  existing `navigate`/`RollDialog` paths already validate/normalise their inputs
  (`VALID_SUBTABS` in `CharacterPage`, `RollDialog` clamps its target); the
  Assistant adds no new validation and inherits that behaviour. Fatal to nothing.
- **`roll` with an unresolvable skill** (e.g. a character without Endurance):
  `resolveReminderBaseTarget` falls back to the test's `fallbackChar` (`'T'` for
  the corruption Endurance test), exactly as it does for `CombatDashboard` — so a
  base target always resolves and `RollDialog` always opens.

### Input validation at the engine boundary

- `context.inCombat` — required boolean; the caller always supplies it from
  `character.combatState.inCombat`. No coercion.
- `character` — optional; `undefined` → `[]`. All numeric reads
  (`xpCur`, encumbrance components, corruption points) are passed to the
  existing calculators, which already clamp (`getBonus` clamps negatives,
  `getEncumbranceLevel` guards `max <= 0`). The engine adds no parsing of its own.

### Invariant ownership

- **Purity / no side effects** (FR-5.1) is owned by the engine layer: rule
  modules and `visibleSuggestions` are pure functions over their arguments and
  import only other pure logic. The dismiss/snooze **writes** live in
  `dismissStore` methods, invoked by the UI and the shell prune effect — never by
  the engine. Enforced by a purity test (below).
- **Serializability** (FR-5.3) is owned by the type layer and verified by a
  property test; the `SuggestionAction` union has no function/closure members by
  construction, and `citation`/`totals` are plain strings/arrays.
- **"Never auto-applies"** (FR-6.3) is owned by the UI layer: only
  `useAssistantActions` can touch handlers, and it only ever *navigates* or
  *opens the roll dialog* — never calls an advance/apply/mutation handler
  directly.

---

## Testing strategy (NFR-3)

### Engine (Vitest + fast-check) — pure, React-free

- **Determinism (FR-3.4):** property — for arbitrary `(character, context)`,
  `getSuggestions` called twice returns deeply-equal, identically-ordered arrays.
- **Serializability (FR-5.3 / AC7):** property — every emitted `Suggestion`
  satisfies `deepEqual(s, JSON.parse(JSON.stringify(s)))` and contains no
  function values (recursively asserted), including `action`, `secondaryAction`,
  `citation`, and `totals`.
- **Purity (AC6):** test — `Object.freeze` the character (deep) and spy on
  `localStorage`, `history`/`navigate`, and any dialog setter; assert
  `getSuggestions` and `visibleSuggestions` throw nothing and touch none of them.
- **Advancement (AC11):** property — a "ready-to-advance" suggestion is emitted
  **iff** `xpCur > 0 && isReadyToAdvance(character)` (asserted against the real
  extracted predicate, not a re-implementation); the softer "N unspent XP"
  suggestion iff `xpCur > 0 && !isReadyToAdvance`; nothing at `xpCur === 0`.
- **Endeavours (AC12):** property — emitted iff the extracted
  `hasActiveEndeavours` holds (the exact `showEndeavoursBadge` predicate).
- **Overburdened (AC13):** property — emitted **iff**
  `calculateCarriedEncumbrance(character) > calculateMaxEncumbrance(character.chars,
  strongBackLevel, sturdyLevel)` (talent levels read as in `sheet-totals.ts`),
  with a p.293 `citation` present and a `navigate` action to the `gear` sub-tab.
- **Corruption (AC14):** property/example — emitted **iff**
  `character.corr > getCorruptionThreshold(character.chars, getPureSoulLevel(
  character.talents))` (Pure Soul INCLUDED, strict `>`; Finding 1), with the
  p.183 `citation`, a primary seeded Endurance `roll` action, and a secondary
  `navigate` to `character/notes`.
- **Reminders (AC15):** test — the reminder-derived suggestions equal
  `deriveAllReminders(...)` mapped through the adapter (asserts consumption, not
  forking), including `citation` carried verbatim from `r.citation`;
  `reminders.ts` is imported, not copied.
- **Ordering (AC5):** test — with `inCombat: true`, all `combat` suggestions
  precede the rest; with `inCombat: false`, advancement/endeavour precede the
  rest; order is stable across repeated calls.

### `visibleSuggestions` + `dismissStore`

- `visibleSuggestions` is pure: given raw + dismiss state + `now`, it removes
  dismissed ids and unexpired-snoozed ids and returns; it performs no writes
  (asserted with spied storage).
- `dismissStore` methods: dismiss adds an id; snooze sets `snoozedUntil`;
  `pruneDismissed(activeIds)` drops dismissed ids not in `activeIds` (the
  reappear-on-re-trigger GC). All with `localStorage` stubbed and **no** network
  (AC16). A `localStorage`-throwing stub exercises the in-memory fallback.

### Components (Testing Library)

- **Trigger (AC2/AC19):** renders a count when `> 0`, none when `0`; the button
  has an accessible name including the count; a stubbed touch `touchEnd` calls
  `open` and `preventDefault` (no synthesized-click leak).
- **Panel (AC3/AC4/AC8/AC9/AC19):** closed renders nothing; open renders grouped
  suggestions with title/rationale/action; clicking a `navigate` action calls the
  injected `navigate(page, subTab)`; clicking a `roll` action resolves a base
  target and opens the seeded `RollDialog` with the descriptor's `difficulty`
  passed as `defaultDifficulty` (Finding 2); the corruption suggestion renders
  **both** a primary roll control and a secondary "View Corruption" navigate
  control; **no action mutates the character** (the panel is given a frozen
  character and spied handlers — asserts no advance/apply handler is called);
  Escape closes and focus returns to the trigger; Tab is trapped.
- **`useAssistantActions` (Finding 2):** a `roll` dispatch sets the shell
  reminder-roll state with the resolved `baseTarget` and the descriptor's
  `difficulty` (not a dropped/defaulted difficulty); a `navigate` dispatch calls
  the injected navigate.
- **Tooltips (AC17):** a rendered total exposes a `TooltipTriggerCell`; opening it
  shows the breakdown lines; the citation is shown from `suggestion.citation`.

### Regression (NFR-5 / AC20)

- The full existing suite must pass unchanged. The extractions
  (`isReadyToAdvance`, `hasActiveEndeavours`, `resolveReminderBaseTarget`,
  `calculateCarriedEncumbrance`) are behaviour-preserving; their current call
  sites keep identical outputs, verified by the existing `AdvancementPage` /
  encumbrance / `CombatDashboard` tests. New code adds no `@ts-ignore` /
  `eslint-disable` and leaves lint/type-check clean.

---

## Summary of key decisions

1. **Architecture mirrors the command palette**: provider + hook + portal
   overlay; one `AssistantPanel` with drawer (desktop) / bottom-sheet (mobile)
   presentations switched on the existing `max-width: 767px` breakpoint.
2. **Pure engine behind `SuggestionSource`** with a sync default
   (`deterministicSuggestionSource`) and a return type
   `Suggestion[] | Promise<Suggestion[]>` so an async source is non-breaking;
   sync callers narrow with `Array.isArray` (shown in the wiring).
3. **`SuggestionAction` is a serializable discriminated union of `navigate |
   roll` only** (`openSection` deferred until a consumer exists); the UI
   interprets it and invokes existing handlers only — nothing auto-applies.
4. **`Suggestion.citation` carries the rulebook citation as data** so the panel
   renders it source-agnostically; reminder items carry `r.citation` verbatim.
5. **Four behaviour-preserving extractions / additions** to keep one source of
   truth: `isReadyToAdvance`, `hasActiveEndeavours`, `resolveReminderBaseTarget`
   (shared with `CombatDashboard`), and a new `calculateCarriedEncumbrance`
   reducer shared by `GearTab`/`PrintLayout`/engine.
6. **Combat reminders are consumed, not forked** via a `CombatReminder →
   Suggestion` adapter; `reminders.ts` and `CombatReminders` are untouched.
7. **`roll` actions seed the dialog via `handleRollReminder`'s path** — resolve
   `baseTarget` with the shared `resolveReminderBaseTarget` and pass
   `action.test.difficulty` to `RollDialog.defaultDifficulty` through a new
   shell reminder-roll state. The quick-roll `{ name, baseTarget }` state is
   explicitly insufficient and left unchanged.
8. **Corruption trigger includes Pure Soul**: fire on
   `corr > getCorruptionThreshold(chars, getPureSoulLevel(talents))` (Core p.183
   + Pure Soul talent p.182); primary action is a seeded Challenging (+0)
   Endurance Test, secondary action navigates to `character/notes`.
9. **Overburdened `max` side is self-contained**: the engine reads Strong Back /
   Sturdy levels exactly as `sheet-totals.ts` does and calls
   `calculateMaxEncumbrance`, firing at `current > max` (Core p.293).
10. **Dismiss/snooze, local only**: single `assistant-dismissals` localStorage
    record; 24h snooze; dismissed items reappear via a `pruneDismissed(activeIds)`
    GC run in a **shell effect** (never in render); filtered before the badge
    count so count and panel agree.
11. **Accessibility reuses the command-palette model**: labelled `role="dialog"`,
    focus trap, Escape close, focus restore to trigger; the badge is an announced
    **count**, not a decorative dot. "Non-blocking" (FR-2.2) describes the closed
    state; the open panel is an intentional modal dialog (NFR-4).
12. **Tooltips** reuse `Tooltip`/`TooltipTriggerCell` with breakdown lines sourced
    from existing breakdown helpers, never recomputed.

### Flagged rulebook ambiguities (confirmed against docs/, carried as open questions)

- **OQ-1 Overburdened** — resolved to fire at `current > max` (Core p.293 first
  penalty band begins above the limit); rationale must quote p.293 exactly.
- **OQ-2 Corruption trigger** — Pure Soul is INCLUDED (rulebook-accurate per the
  Pure Soul talent). The sole remaining choice is strict `>` (p.183, chosen) vs
  the app's `>=`; **reviewer confirmation requested** on that 1-point edge.
- **OQ-3 Corruption Test wording/action** — resolved: Challenging (+0) **Endurance
  Test to resist corruption** (Core p.183); primary action seeded roll, secondary
  navigate to `character/notes`.
- **OQ-5 Snooze policy** — set to a fixed 24h; **reviewer confirmation requested**
  on duration and the local key/shape.

---

## Responses to design review

Mapping to `.agents/tasks/character-assistant/design-review.json`:

- **Finding 1 (HIGH) — Corruption excludes Pure Soul. ADDRESSED.** Reversed the
  prior decision. The engine now fires on
  `corr > getCorruptionThreshold(chars, getPureSoulLevel(talents))` — Pure Soul
  INCLUDED — citing Core p.183 (Corrupting) + the Pure Soul talent (p.182). The
  `totals` breakdown matches the trigger (no shown-vs-used split). OQ-2 re-framed
  to only the `>` vs `>=` edge.
- **Finding 2 (HIGH) — `roll` seed under-specified / quick-roll drops difficulty.
  ADDRESSED.** `dispatchAction`'s `roll` branch now mirrors
  `CombatDashboard.handleRollReminder`: it resolves `baseTarget` via the extracted
  `resolveReminderBaseTarget` and seeds a **new shell reminder-roll state carrying
  `difficulty`**, rendering `RollDialog` with `defaultDifficulty={…}`. The
  quick-roll `{ name, baseTarget }` state is stated to be insufficient and left
  unchanged.
- **Finding 3 (MEDIUM) — Corruption action contradictory. ADDRESSED.** One
  consistent spec across FR-8.4, OQ-3, AC14, and testing: **primary = seeded
  Endurance roll; secondary = navigate**. Added an optional `secondaryAction` to
  `Suggestion` to carry the second control explicitly.
- **Finding 4 (MEDIUM) — Corruption navigate target invalid. ADDRESSED.** Verified
  `CorruptionCard` renders in `pages/character/NotesTab.tsx`; the route is
  `{ kind: 'navigate', page: 'character', subTab: 'notes' }`. No `'corruption'`
  page is referenced anywhere.
- **Finding 5 (MEDIUM) — Overburdened `max` side under-specified. ADDRESSED.** The
  engine reads `strongBackLevel`/`sturdyLevel` exactly as `sheet-totals.ts` does
  (`character.talents.find(t => t.n === 'Strong Back'|'Sturdy')?.lvl ?? 0`) and
  passes them to `calculateMaxEncumbrance(character.chars, strongBackLevel,
  sturdyLevel)`. Named explicitly in the rule and the test.
- **Finding 6 (MEDIUM) — No field carries the citation. ADDRESSED.** Added
  `citation?: string` to `Suggestion`; reminder items populate it from
  `r.citation` verbatim, native rules from their `// Core p.NNN` string. The panel
  renders `suggestion.citation` source-agnostically (satisfies AC18 as data).
- **Finding 7 (NIT) — Source union needs caller narrowing. ADDRESSED.** The wiring
  now shows `const r = …getSuggestions(…); Array.isArray(r) ? r : []` in both
  `visibleSuggestions`'s caller and the shell `useMemo`, documented "default is
  always sync".
- **Finding 8 (NIT) — Dismiss prune not located. ADDRESSED.** The prune
  (`dismissStore.pruneDismissed(activeIds)`) runs in a **shell `useEffect`** keyed
  on `rawSuggestions`; `visibleSuggestions` stays pure.
- **Finding 9 (NIT) — "Non-blocking" vs `aria-modal`. ADDRESSED.** Added the
  explicit sentence: non-blocking refers to the closed state (zero layout
  footprint); the open panel is an intentional modal dialog matching the command
  palette. No code change.
- **Finding 10 (NIT) — `openSection` fallback vague. ADDRESSED.** Dropped
  `openSection` from the v1 union (now `navigate | roll` only); corruption's
  "view panel" is a plain `navigate`. Deferred `openSection` until a consumer
  exists.
- **Finding 11 (NIT) — Citation page p.183 vs p.182. ADDRESSED.** All corruption
  trigger citations use **p.183** (Corrupting); the Pure Soul extension cites the
  talent at p.182. The requirements' p.182 for the trigger is not inherited.
