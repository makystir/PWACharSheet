# Roll → Damage → Consequence Pipeline — Requirements & Design

Status: Draft for review
Scope: Combat page (Attack side), feeding into the existing Critical-Wound and Condition systems and the Defend-side Take Damage panel.

---

## 1. Summary

Today the Attack Flow (`src/components/combat/AttackFlow.tsx`) stops at a displayed **Net Wounds** number in Step 4. A critical hit, the conditions a hit would inflict, and the act of applying the damage are all left for the player to transcribe by hand into the already-built Critical-Wound panel, Condition picker, and Take Damage panel.

This feature closes those three links so that one roll flows through to its consequences, while keeping the project's established rule that nothing is applied silently — every consequence is an explicit, player-confirmed one-tap action. It adds:

1. **Crit → Critical Wound bridge.** When an attack is a Critical Hit, Step 4 surfaces a one-tap "Roll Critical Wound" action that reuses the existing Defend→Status bridge — switching to Status mode where the existing `CriticalWoundsPanel` auto-opens `RollCriticalFlow` with the struck hit location pre-selected.
2. **Suggested conditions.** Conditions arising from the weapon's qualities (Pummel → Stunned, Hack → armour damage note) and from a rolled critical-wound entry (Bleeding/Stunned/Prone/Unconscious/Fatigued) are surfaced as one-tap suggestions that route through the existing condition apply path.
3. **Net-wounds hand-off to Defend.** Because the app does not track an opponent's wounds (by deliberate design), the computed incoming damage is handed to the **Defend side**: a one-tap action pre-fills the Take Damage panel's Damage / SL / Location inputs, from which the existing "Apply Wounds" path takes over.

The feature is strictly additive. The existing single `combat.attack` event and all existing Attack Flow behaviour are unchanged; new `appendEvent` calls are added only for newly-applied consequences.

All mechanics are verified against the WFRP4e Core Rulebook (`docs/WarhammerFantasyRoleplay4e.md`); citations are inline in Section 6 and must be copied into code comments per the rules-compliance steering rule.

---

## 2. Functional Requirements

### FR-1 Critical-hit → Critical-Wound bridge (Attack side)
- FR-1.1 When the Step 2 roll produced a Critical Hit (`RollResult.isCritical === true`, which already incorporates the Impale-crits-on-tens house rule), Step 4 shows a single, clearly-labelled **Roll Critical Wound** action.
- FR-1.2 The action is an explicit, player-initiated control. Nothing is rolled or applied automatically on reaching Step 4.
- FR-1.3 Activating it reuses the existing Defend→Status critical bridge: the Combat page switches to **Status** mode and the existing `CriticalWoundsPanel` auto-opens `RollCriticalFlow` with the **struck hit location pre-selected** (the Step 3 location, reversed from the to-hit roll). The crit flow is **not** hosted inline in Attack Flow (see §5.1/§5.4 for the rationale).
- FR-1.4 Confirming in `RollCriticalFlow` records the critical wound through the existing `CriticalWoundsPanel.onAddWound` → `recordCriticalWound` path (the same path the Defend hand-off and the manual "Roll Critical" button already use). No new critical-wound persistence logic is introduced.
- FR-1.5 When the roll is **not** a critical, no critical-wound control is shown.

### FR-2 Suggested conditions (one-tap, explicit)
- FR-2.1 After a successful hit, Step 4 derives the set of conditions the attack *suggests* and lists them as one-tap chips.
- FR-2.2 Weapon-quality-derived suggestions. Detection must handle both weapons that list the quality outright and weapons that list it as one option in an "X or Y" choice group within a comma segment (e.g. Warhammer "Pummel or Penetrating", Pollaxe "Hack or Impale or Pummel", Bill "Hack or Trip"). Exact-segment matching via `hasWeaponQuality` is insufficient and must not be used for these qualities (see §5.2):
  - **Pummel** present (outright or as a choice alternative) + Head hit → suggest **Stunned** (RAW requires an Opposed Strength/Endurance test; the suggestion is labelled test-gated — see FR-2.6). When Pummel is only a choice alternative, the chip is additionally labelled as conditional on the player having chosen Pummel ("if chosen"); it is never applied automatically.
  - **Hack** present (outright or as a choice alternative) → show a non-condition advisory note ("Hack: damages a struck armour/shield piece by 1"), prefixed "If Hack chosen: " when it is a choice alternative. Hack inflicts no condition, so it produces an advisory, not a condition chip.
- FR-2.3 Critical-wound-derived suggestions: when a critical wound has been rolled via FR-1, parse the recorded wound's effect text for the conditions it inflicts (Bleeding, Stunned, Prone, Unconscious, Fatigued, and any other `CONDITIONS` name present) and surface them as one-tap chips in the Status Critical Wounds section, each annotated with the quantity the entry grants (e.g. "Bleeding ×2"). **Every** condition named in the entry must be surfaced, including a second (or later) condition chained after a comma with no repeated verb — e.g. "Suffer 1 Stunned Condition, 1 Bleeding Condition" must yield **both** Stunned ×1 and Bleeding ×1, and "Suffer 2 Bleeding Conditions, 2 Stunned Conditions" must yield Bleeding ×2 **and** Stunned ×2.
- FR-2.4 Tapping a suggestion chip applies that condition through the **same `applyCondition` mutation** (from `src/logic/combat.ts`) plus the Advantage-reset that CombatPage already uses when fulfilling `ConditionPicker.onApply` — so stacking, max-level, and the "lose all Advantage on gaining a Condition" rule (Core p.164) are handled identically. It shares that logic, not the `ConditionPicker.onApply` prop itself (which takes only a single name, no count).
- FR-2.5 Applying a suggested condition appends a `combat` event describing it.
- FR-2.6 Suggestions that RAW gate behind a follow-up test (Pummel's Opposed test) are visually marked as "on a successful test" so the player does not apply them unconditionally. The app does not auto-resolve that test (flagged ambiguity, Section 8).

### FR-3 Net-wounds hand-off to the Defend side
- FR-3.1 Step 4 shows a one-tap **Send to Take Damage** action next to the Net Wounds total.
- FR-3.2 Activating it switches the Combat page to **Defend** mode and pre-fills the Take Damage panel with: Damage = weapon damage component, SL = effective SL, Location = struck hit location. (Rationale for this split in Section 5.3.)
- FR-3.3 The Take Damage panel's existing "Apply Wounds" button then reduces the sheet owner's wounds using its existing logic (which already honours the min-1-wound and Critical-Deflection house rules). No wound application happens on the Attack side.
- FR-3.4 The hand-off does not introduce opponent wound tracking. It targets the sheet owner via the Defend panel exactly as a manually-entered incoming attack would.
- FR-3.5 Pre-filled values remain editable in the Take Damage panel before the player applies them.

### FR-4 Non-regression
- FR-4.1 The existing single `combat.attack` event still fires exactly once, at the existing Step 3 → Step 4 transition, with its existing payload.
- FR-4.2 All existing Attack Flow step/collapse/second-attack/off-hand behaviour is unchanged.
- FR-4.3 No opponent wound tracking is added anywhere.

---

## 3. Non-Functional Requirements

- NFR-1 Pure consequence-derivation logic lives in a new pure module with no React imports, so it is unit- and property-testable in isolation.
- NFR-2 Any newly-displayed calculated total carries a breakdown tooltip built with the existing `Tooltip` + `TooltipTriggerCell` components (calculated-total-tooltips steering rule). The feature displays no *new* summed total beyond the existing Net Wounds (which already has its tooltip); the hand-off re-uses that value, so no new tooltip is strictly required — but the "weapon damage component" sent to Defend must show its own breakdown tooltip because it is a derived number the player sees in the new control (Section 5.6).
- NFR-3 No error suppression (`@ts-ignore`, `eslint-disable`, swallowed catches). Type the parsing output explicitly (fix-errors steering rule).
- NFR-4 New UI follows the existing CSS-module pattern (one `*.module.css` per component) and the existing chip / button styling idioms.
- NFR-5 Touch targets ≥44px, keyboard-activatable, `aria-label`ed, consistent with existing combat controls.

---

## 4. Acceptance Criteria

1. Given a to-hit roll flagged `isCritical`, when the player reaches Step 4, then a "Roll Critical Wound" control is visible; given a non-critical successful hit, that control is absent.
2. Activating "Roll Critical Wound" switches to Status mode and the existing `CriticalWoundsPanel` auto-opens `RollCriticalFlow` with the Step 3 hit location pre-selected (the Defend→Status bridge, reused); confirming it adds a critical wound to `character.criticalWounds` via `recordCriticalWound` and surfaces the entry's conditions as chips in the Status section.
3. Given a weapon with the Pummel quality and a Head hit, a Stunned suggestion chip appears marked as test-gated; tapping it applies one Stunned condition via the shared apply path and resets Advantage to 0 while in combat. This holds for weapons that list Pummel outright **and** for weapons that list it as an "X or Y" choice alternative (e.g. Warhammer "Pummel or Penetrating", Pollaxe "Hack or Impale or Pummel"), where the chip is additionally labelled "if chosen"; a weapon with no Pummel token (e.g. a plain Sword) produces no Stunned chip. Likewise a Hack weapon (outright or choice, e.g. Bill "Hack or Trip") produces the Hack armour-damage advisory.
4. Given a rolled critical-wound entry whose `effect` reads "Suffer 2 Bleeding Conditions", two suggestion derivations for Bleeding are produced (surfaced as "Bleeding ×2"); tapping the chip applies Bleeding the stated number of times, respecting stack/max rules.
5. Given a successful hit with computed weapon damage D, effective SL S, and location L, activating "Send to Take Damage" switches to Defend mode with the Take Damage inputs pre-set to Damage = D, SL = S, Location = L, all still editable. (Only these three pre-mitigation inputs are seeded; the Defend panel recomputes Net Wounds from the sheet owner's TB/AP, so its Net Wounds will differ from the opponent-facing Net Wounds shown on the Attack side — the criterion does not assert the net totals match.)
6. Applying wounds from the pre-filled Take Damage panel reduces `character.wCur` using the panel's existing logic and honours min-1-wound and Critical-Deflection house rules unchanged.
7. The `combat.attack` event fires exactly once per attack at the existing transition, and applying a consequence appends additional `combat` event(s) without altering the original.
8. No code path reads or writes an opponent wounds value.
9. `npx tsc --build --force --noEmit`, `npm run build`, and `vitest --run` all pass; all pre-existing tests pass unchanged.
10. The pure derivation module has property tests (fast-check) covering crit-table location selection and condition-suggestion parsing; the new/changed components have component tests.

---

## 5. Design

### 5.0 Technology stack (locked on approval)
Vite + React 18 + TypeScript, CSS Modules, Vitest + fast-check + Testing Library — the project's existing stack. No new runtime dependencies. No backend. State continues to flow through the existing `updateCharacter(mutator)` / `update(field, value)` props and the `combatState`/`eventLog` fields already on `Character`.

### 5.1 Architecture overview
The work is split into one **new pure logic module** (`src/logic/attack-consequences.ts`) plus **presentational wiring** in `AttackFlow.tsx` and `CombatPage.tsx`, reusing the existing `CriticalWoundsPanel` (which already hosts `RollCriticalFlow` via its `autoOpenRollFlow` latch), the `ConditionPicker` apply logic, and `TakeDamagePanel`. No existing pure module changes behaviour; `AttackFlow` gains callbacks (props) that `CombatPage` fulfils, mirroring the already-established `TakeDamagePanel.onRollCritical(location)` → Status-mode hand-off.

The guiding principle, consistent with the existing `onRollCritical` design on the Defend side: **AttackFlow computes and suggests; CombatPage owns cross-panel navigation and mutation.** AttackFlow stays free of direct critical-wound/condition mutation so its single-`combat.attack`-event contract is easy to preserve.

**Crit-roll routing decision (resolves prior review Finding 3).** The *only* existing critical-wound hand-off (Defend → Status) does **not** render `RollCriticalFlow` inline: `TakeDamagePanel.onRollCritical(location)` calls up to `CombatPage`, which sets `setDownLocation(location); setRollCriticalHandoff(true); setCombatMode('status')`, and the Status-mode `CriticalWoundsPanel` auto-opens `RollCriticalFlow` via its `autoOpenRollFlow` prop and records via its `onAddWound`. To stay consistent with §5.1's reuse principle and avoid introducing a second, divergent placement of `RollCriticalFlow`, **the Attack-side crit bridge reuses that exact Status-mode path rather than mounting `RollCriticalFlow` inside AttackFlow.** AttackFlow exposes an `onRollCritical(location)` callback (same shape as the Defend panel's); CombatPage routes it to the existing Status flow. Because the record happens where the Status flow already records (its `onAddWound`), no `RollCriticalFlow` signature change is needed (this makes the prior-round "`onConfirm(wound, entry?)` widening" unnecessary — see §10 Finding 7), and there is no risk of inline and Status latches both firing. Condition suggestions from the rolled entry are then derived from the **recorded wound's stored `effects`** at the point CombatPage records it (see §5.5).

### 5.2 New pure module: `src/logic/attack-consequences.ts`
No React imports. Exports:

```ts
export type SuggestedConditionSource = 'weapon-quality' | 'critical-wound';

export interface SuggestedCondition {
  name: string;          // must match a CONDITIONS[].name
  count: number;         // how many to apply (stacking resolved by applyCondition)
  testGated: boolean;    // true = RAW requires a follow-up test (e.g. Pummel)
  note?: string;         // short label, e.g. "Pummel (Head): on a won Opposed Str/End test"
  source: SuggestedConditionSource;
}

export interface AttackAdvisory {    // non-condition notes (e.g. Hack armour damage)
  text: string;
}

/** Conditions suggested purely from the weapon + hit location (no crit roll yet). */
export function deriveWeaponQualitySuggestions(
  weapon: WeaponItem,
  location: HitLocation,
): { conditions: SuggestedCondition[]; advisories: AttackAdvisory[] };

/**
 * Conditions parsed from a critical wound's effect text.
 * Accepts the raw effect string so it works equally on a `CriticalWoundTableEntry.effect`
 * (singular, pre-record) and a persisted `CriticalWound.effects` (plural, post-record) —
 * both hold the same authored effect prose. The Status-path crit bridge (§5.1) passes the
 * recorded wound's `effects`.
 */
export function deriveCriticalWoundSuggestions(
  effectText: string,
): SuggestedCondition[];

/** The weapon-damage component to hand to the Defend panel (damage minus SL). */
export interface DefendHandoff {
  damage: number;        // weapon damage component only (NOT including SL)
  sl: number;            // effective SL (Damaging-adjusted)
  location: HitLocation;
}
export function buildDefendHandoff(
  weaponDamageNum: number, effectiveSL: number, location: HitLocation,
): DefendHandoff;
```

**Hit-location vocabulary and the four-table collapse.** `HitLocation` has **six** values — `'Head' | 'Left Arm' | 'Right Arm' | 'Body' | 'Left Leg' | 'Right Leg'` (see `hitLocationTable.ts`) — and `getHitLocation` returns one of those six. There are only **four** critical tables. The six→four collapse is already performed by `lookupCriticalWound`, which folds `'Left Arm'`/`'Right Arm'` → `ARM_CRITICAL_TABLE` and `'Left Leg'`/`'Right Leg'` → `LEG_CRITICAL_TABLE` (`'Head'` → `HEAD_CRITICAL_TABLE`, `'Body'` → `BODY_CRITICAL_TABLE`). This feature introduces **no** new location mapping: the Step 3 struck location is a genuine six-value `HitLocation` and is passed verbatim into the Status-mode `CriticalWoundsPanel.preselectedLocation` (via CombatPage's existing `downLocation` state, typed `HitLocation`, which the panel forwards to `RollCriticalFlow.preselectedLocation`) and into `buildDefendHandoff`; the table collapse happens only inside the existing `lookupCriticalWound`.

**Note on parsed vs. stored field names.** `deriveCriticalWoundSuggestions` takes a plain `effectText: string` so a single parser serves both sources of the identical prose: the table entry's **singular** `CriticalWoundTableEntry.effect` and the persisted **plural** `CriticalWound.effects` (`RollCriticalFlow` maps `effects: preview.effect` when it records the wound, so the strings are the same text). Under the Status-path crit routing (§5.1), CombatPage records the wound via the existing `onAddWound` and then calls `deriveCriticalWoundSuggestions(recordedWound.effects)` — i.e. it parses the **stored `effects` (plural)** string. Code comments must note that the field read is `wound.effects` (plural, stored) in the CombatPage path, and that the same function would accept `entry.effect` (singular) if ever called pre-record; there is no `CriticalWoundTableEntry` type dependency in the signature.

**Condition parsing (`deriveCriticalWoundSuggestions`).** The critical-wound `effect` strings in `src/data/critical-wound-tables.ts` follow consistent phrasings: "Suffer N <Condition> Condition(s)", "Gain the <Condition> Condition" / "Gain <Condition> Condition", and — importantly — **comma-chained clauses with no repeated verb**, e.g. Body "Cracked Ribs": `"Suffer 1 Stunned Condition, 1 Bleeding Condition."`, Body "Broken Ribs" and Leg "Shattered Kneecap": `"Suffer 2 Bleeding Conditions, 2 Stunned Conditions."`. A verb-anchored regex (requiring `suffer`/`gain` immediately before each condition) would **silently drop** the second, verb-less clause of those three entries, under-reporting the conditions a crit inflicts (a rules-compliance correctness defect). The parser therefore does **not** anchor on a leading verb. It scans for every `[N] <Condition> Condition(s)` fragment anywhere in the string, over the known condition vocabulary **built at module load from `CONDITIONS.map(c => c.name)`** (escaped) rather than a hand-typed literal, so the alternation can never drift from the data. The twelve authoritative names are: **Ablaze, Bleeding, Blinded, Broken, Deafened, Entangled, Fatigued, Poisoned, Prone, Stunned, Surprised, Unconscious** (of which only Bleeding, Stunned, Prone, Unconscious, and Fatigued actually appear in the current crit tables). The generated alternation is escaped and interpolated into a global, verb-independent regex:
- `new RegExp('(\\d+)?\\s*(?:the\\s+)?(' + CONDITIONS.map(c => esc(c.name)).join('|') + ')\\s+Conditions?', 'gi')` where `esc` escapes regex metacharacters in each name.
- The `(?:the\s+)?` optional article still handles "Gain **the** Unconscious Condition"; the leading `(?:suffer|gain)` anchor is deliberately removed so verb-less comma clauses are captured.
- count defaults to 1 when no number is captured ("Gain the Unconscious Condition").
- Multiple matches for the same condition name within one entry are kept as separate parsed fragments and summed/surfaced per the chip-labelling rules below.
Only names present in `CONDITIONS` produce a suggestion; anything else (e.g. "Permanent –5 Intelligence", "–20 to all physical Tests") is ignored because those phrases contain no `<Condition> Condition(s)` fragment. This keeps the parser a closed vocabulary over data we own, so it is deterministic and property-testable. The parser never invents a condition the entry text does not name.

Dropping the verb anchor cannot introduce false positives in the current data: every `"... Condition(s)"` fragment in the tables is a genuine inflicted condition, and non-condition effects ("Permanent –5 Agility", "–20 to Agility Tests") never contain the literal word "Condition(s)" after a known condition name. The §7.1 tests pin this explicitly (Cracked Ribs → Stunned ×1 **and** Bleeding ×1; Broken Ribs / Shattered Kneecap → Bleeding ×2 **and** Stunned ×2).

**Non-stackable count clamp.** `count` is derived generically from the captured `\d+`, but `Broken`, `Entangled`, `Prone`, `Surprised`, and `Unconscious` are `stackable: false, maxLevel: 1` (see `data/conditions.ts`). No current crit-table entry grants more than one of a non-stackable condition, so in practice they always parse to `count: 1`. To keep the chip label honest if such data were ever added, the displayed count for a non-stackable condition is clamped to its `CONDITIONS[].maxLevel` (i.e. 1) for display — matching `applyCondition`'s own max-level clamp, which would otherwise make a "Prone ×2" chip apply only once. The apply loop still calls `applyCondition` `count` times and relies on that clamp for the actual mutation.

**Weapon-quality suggestions (`deriveWeaponQualitySuggestions`) — and the "X or Y" choice-quality problem.** The existing `hasWeaponQuality(weapon, q)` splits the qualities string on commas and does an **exact** per-segment match (`q.trim().toLowerCase() === qualityLower`). That is insufficient here because several weapons express Pummel/Hack as an **either/or choice inside one comma segment**, which exact-matching never detects:
- Warhammer: `"Unbalanced, Pummel or Penetrating"` → segment `"pummel or penetrating"` ≠ `"pummel"` → `hasWeaponQuality(w,'Pummel')` is **false**.
- (2H) Pollaxe: `"Defensive, Hack or Impale or Pummel"` → neither Hack nor Pummel detected.
- (2H) Bill: `"Defensive, Hack or Trip"` → Hack not detected.

These are exactly the weapons where Pummel/Hack are player-selectable, so relying on `hasWeaponQuality` would make FR-2.2/AC-3 silently miss them. RAW, the wielder **chooses one** of an "X or Y" quality group at point of use (Core, Warhammer/Pollaxe/Bill entries), so the quality is *available but not guaranteed*.

**Decision (chosen): detect the token inside an "or" group and surface it as a player-choice-gated chip.** `deriveWeaponQualitySuggestions` does **not** call `hasWeaponQuality` for Pummel/Hack. Instead it parses the qualities itself into a small structure:
```ts
// Split on commas, then each segment on /\bor\b/ (case-insensitive), trimming parenthetical
// ratings like "Slash (2A)" down to the quality token. For each token, record whether it was
// the sole token in its segment (guaranteed) or one of several "or" alternatives (choice).
interface QualityPresence { token: string; choice: boolean; } // choice === true ⇒ "X or Y" group
```
- A quality found as the **sole** token in its comma segment is `choice: false` (guaranteed present). A quality found as **one of several** "or" alternatives is `choice: true` (selectable, not guaranteed).
- **Pummel** present (either form) **and** `location === 'Head'` → suggest `{ name: 'Stunned', count: 1, testGated: true, source: 'weapon-quality', note }`. `testGated` is always true for Pummel (the Opposed Str/End test, Core p.298). When the Pummel came from an "or" group, the `note` additionally states the quality must be the chosen one, e.g. `"Pummel (Head), if chosen: on a won Opposed Str/End test"`; when guaranteed, `"Pummel (Head): on a won Opposed Str/End test"`. Either way the chip is a single explicit, player-confirmed action — the player taps it only if they both chose Pummel and won the test, which matches the user's explicit-consequence preference.
- **Hack** present (either form) → advisory `"Hack: a struck piece of armour or shield is Damaged by 1"` (Core p.297). No condition. When Hack came from an "or" group, the advisory is prefixed `"If Hack chosen: ..."`.
- No other core melee/ranged quality inflicts a condition purely on a hit, so the initial vocabulary stops at Pummel/Hack; the module is structured so more qualities can be added with citations without touching the UI.

This keeps the behaviour deterministic and testable: §7.1 adds unit tests over Warhammer (`"Unbalanced, Pummel or Penetrating"`) and Pollaxe (`"Defensive, Hack or Impale or Pummel"`) asserting the Pummel-Head chip and Hack advisory **do** fire (as choice-gated), and over a plain Sword (`"—"`) asserting none fire. (Verified: `hasWeaponQuality` exact-match in `src/logic/weapons.ts`; Warhammer/Pollaxe/Bill entries in `src/data/weapons.ts`.)

### 5.3 Net-wounds hand-off: why Defend, and the damage/SL split
The app deliberately does not track opponent wounds, so "apply" cannot mean "reduce an enemy's wounds." The only wound pool the app owns is the **sheet owner's**, which the Defend-side `TakeDamagePanel` already mutates through `onApplyWounds`, with min-1-wound and Critical-Deflection house rules already wired. Re-using it (rather than duplicating apply logic in AttackFlow) is the least-intrusive, DRY choice and keeps a single wound-application code path.

The Take Damage panel computes net wounds itself from **Damage + SL − TB − AP** (`TakeDamagePanel` net-wounds block). To avoid double-counting SL, the hand-off must pass the **weapon-damage component** as "Damage" and the **effective SL** as "SL" separately — not the already-summed `totalDamage`. `buildDefendHandoff` enforces this split.

**What carries, and what deliberately does not.** Only the **pre-mitigation inputs** are handed over: the weapon-damage component (as Damage), the effective SL (as SL), and the struck location. The raw pre-mitigation sum (Damage + SL) is therefore identical on both sides. The **Net Wounds** numbers, however, will differ by design: the Attack side subtracts the *opponent's* TB/AP (the local `opponentTB`/`opponentAP` variables in `AttackFlow.tsx`, read via `getCombatTarget(character)` which returns `{ name, tb, ap }` from `combatState.target` — see `src/logic/combat-target.ts`) because it is modelling the opponent taking the hit for display only, whereas the Defend `TakeDamagePanel` recomputes mitigation from the **sheet owner's** TB and AP at the struck location, because the Defend side models the *sheet owner* taking the hit. This divergence is correct, not a bug — an implementer must **not** try to force the two Net Wounds to match, and must **not** pass the opponent's TB/AP into the Defend panel (the sheet owner is the victim there). The struck location is passed so the Defend panel resolves the sheet owner's correct AP location.

This net-wounds hand-off follows the same callback pattern already in place for the Defend→Status critical bridge: AttackFlow raises a callback; CombatPage sets the target mode and seeds panel state. (The crit-roll bridge now *literally* reuses the Defend→Status `CriticalWoundsPanel` + `autoOpenRollFlow` path — see §5.1 — so both bridges share the established mechanism.)

### 5.4 Where the affordances live — decision
**Decision: surface the entry points inline in Attack Flow Step 4 as a compact "Consequences" strip, but route the two cross-panel actions (crit roll, net-wounds apply) through CombatPage callbacks to the existing Status and Defend panels rather than hosting those panels inside AttackFlow. Do not add a new panel.** The weapon-quality suggestion chips, which need no other panel, are applied inline via a CombatPage callback.

Options considered for the Step-4 entry points:
- (A) Inline entry points in Step 4, cross-panel work delegated to existing panels. **Chosen.** Zero new panels; the triggers appear exactly where the player is looking after a roll (mirroring how Step 4 already hosts the Net Wounds control); and the actual crit-roll/apply reuse the panels that already own that logic.
- (B) A dedicated new "Consequence" panel. Rejected: adds a panel to an already-dense Combat page and a second place to look after every attack.
- (C) Push everything straight into Defend mode. Rejected for crits/conditions: only the **net-wounds apply** legitimately belongs on the Defend side (Section 5.3); the crit roll belongs in Status.

Crit-roll routing (resolves prior review Finding 3 — see §5.1): the "Roll Critical Wound" button in Step 4 does **not** mount `RollCriticalFlow` inside AttackFlow. It raises `onRollCritical(location)`; CombatPage reuses the identical Defend→Status mechanism (`setDownLocation(location); setRollCriticalHandoff(true); setCombatMode('status')`), and the Status-mode `CriticalWoundsPanel` auto-opens `RollCriticalFlow` via `autoOpenRollFlow`. The crit-wound-derived condition suggestions are therefore surfaced in the Status flow at record time (CombatPage derives them from the recorded wound's `effects` — §5.5), not back in Step 4. This keeps a single placement of `RollCriticalFlow` and removes any double-latch risk. Only the net-wounds apply navigates to Defend; the weapon-quality chips apply in place.

House-rule interaction:
- **Critical Deflection** is a Defend-side concept (sacrifice 1 AP to ignore a crit when *you* are struck). It applies to the sheet owner taking damage, so it continues to live only in `TakeDamagePanel` and is reached through the net-wounds hand-off — not on the Attack side (where the sheet owner is the attacker, not the crit's victim). No change.
- **Min-1-wound** is enforced by the Take Damage panel's existing logic on apply; the Attack-side Net Wounds display already reflects it for information. The hand-off passes raw Damage/SL/Location, so the Defend panel recomputes min-1 itself — no double application.

### 5.5 Component changes

**`src/components/combat/AttackFlow.tsx`** (presentational wiring; no new mutation of crit/condition state, and no `RollCriticalFlow` mounted here):
- New optional props (optional so existing tests/usages keep working, matching the `onAddWeapon` precedent):
  - `onRollCritical?: (location: HitLocation) => void` — same shape as the existing `TakeDamagePanel.onRollCritical`; raised by the "Roll Critical Wound" button so CombatPage routes to the Status-mode `CriticalWoundsPanel` (§5.1, §5.4).
  - `onSendToTakeDamage?: (handoff: DefendHandoff) => void`
  - `onApplySuggestedCondition?: (name: string, count: number) => void`
- New local state: `appliedSuggestions: Set<string>` to visually mark weapon-quality chips already tapped (purely cosmetic; re-tapping still routes through the idempotent-aware apply path). **No `showCritFlow` state and no inline `RollCriticalFlow`** — the crit roll is owned by the Status panel.
- In `renderStep4`, after the existing Net Wounds block, render a **Consequences** region (only when `selectedWeapon` and `hitLocationResult` are non-null, the same guards Step 4 already uses):
  - If `lastRollResult.isCritical`: a "Roll Critical Wound" button that calls `onRollCritical?.(hitLocationResult.location)`. No flow is mounted inline; CombatPage navigates to Status mode where the existing panel auto-opens `RollCriticalFlow` with the location pre-selected. (Crit-wound-derived condition chips are surfaced there at record time, not in Step 4 — §5.5 CombatPage bullet.)
  - Weapon-quality suggestion chips from `deriveWeaponQualitySuggestions(selectedWeapon, hitLocationResult.location)`, each calling `onApplySuggestedCondition?.(name, count)` and showing `testGated`/`note` text (including the "if chosen" labelling for "X or Y" qualities, §5.2).
  - Advisories rendered as small inline notes (e.g. Hack).
  - A "Send to Take Damage" button calling `onSendToTakeDamage?.(buildDefendHandoff(weaponDamage.num ?? 0, effectiveSL, hitLocationResult.location))`.
- The weapon-damage value shown in the "Send to Take Damage" control gets a breakdown tooltip (reusing `weaponDamage.breakdown` already produced by `calcWeaponDamage`) via the existing `TooltipTriggerCell` + `Tooltip` pattern AttackFlow already uses for Net Wounds (anchor state + `tooltipId`, see the `netWoundsTooltipAnchor` wiring in `AttackFlow.tsx`), matching the existing Net Wounds tooltip pattern (NFR-2). Exact tooltip content is specified in §5.6a.

**`RollCriticalFlow.tsx`** — **no change required.** Because the Attack-side crit roll reuses the Status-mode `CriticalWoundsPanel` (which already hosts `RollCriticalFlow` and records via `onAddWound`), there is no need to widen `RollCriticalFlow.onConfirm`. Condition suggestions are derived from the recorded wound's stored `effects` string in CombatPage's `onAddWound` handler, so the authoritative effect text is available without a signature change. (This supersedes the prior-round plan to add an optional `entry` second argument — see §10 Finding 7.)

**`src/components/pages/CombatPage.tsx`** — fulfil the new AttackFlow props:
- `onSendToTakeDamage`: set a new `takeDamageSeed` state `{ damage, sl, location }` (a fresh object identity each time so the panel's seed `useEffect` re-fires even if the same values recur), then `setCombatMode('defend')`. Pass `takeDamageSeed` into `TakeDamagePanel` (new optional `seed` prop). The panel's seed `useEffect` (keyed on seed identity) consumes it once; CombatPage then clears `takeDamageSeed` back to `null` so later manual edits in the panel are never re-overwritten (see TakeDamagePanel note below and FR-3.5).
- `onApplySuggestedCondition(name, count)`: a **new CombatPage handler** (not a reuse of the `ConditionPicker.onApply` prop, which has signature `(conditionName: string) => void` and takes no count). It performs the identical mutation CombatPage already uses for `ConditionPicker.onApply`: inside a single `updateCharacter` call it applies `applyCondition(c.conditions, name)` `count` times (folding the repeated applications over the conditions array) and sets `advantage: inCombat ? 0 : c.advantage` once (`applyCondition` is in `src/logic/combat.ts`; Advantage-reset cites Core p.164). It then `appendEvent`s a `combat` event ("Applied N× <condition> from attack"). Because `applyCondition` clamps at `maxLevel`, looping `count` times on a non-stackable condition is safely idempotent after the first application.
- `onRollCritical(location)`: reuse the **existing** Defend→Status bridge verbatim — `setDownLocation(location); setRollCriticalHandoff(true); setCombatMode('status')`. The Status-mode `CriticalWoundsPanel` then auto-opens `RollCriticalFlow` (pre-selected location) and records through its existing `onAddWound`. No new critical-wound code path is added on the Attack side.
- Crit-wound-derived condition suggestions: **extend the existing `CriticalWoundsPanel.onAddWound` handler in CombatPage** so that, after `recordCriticalWound`, it derives `deriveCriticalWoundSuggestions(wound.effects)` from the just-recorded wound's stored `effects` string and stores them in a new CombatPage `critConditionSuggestions` state (array of `SuggestedCondition`). These are rendered as one-tap chips **in the Status-mode Critical Wounds section** (next to or below the panel), each calling the same `onApplySuggestedCondition` handler. This keeps the crit-derived chips where the crit was just rolled (Status), consistent with the Status-path routing (§5.1/§5.4). The suggestions are cleared when the player leaves Status mode or taps "Attack"/"Defend"/"Status" (reusing the existing `setRollCriticalHandoff(false)` reset points). Because `onAddWound` is also used by the manual "Roll Critical" button, deriving suggestions there means a manual crit roll also offers its condition chips — a harmless, consistent improvement, not a regression (still explicit, still one-tap).

**`src/components/combat/TakeDamagePanel.tsx`** — add an optional `seed?: { damage: number; sl: number; location: HitLocation }` prop. The seed is consumed by a **`useEffect` keyed on the seed object identity** (`useEffect(() => { ... }, [seed])`) that, when `seed` is non-null, writes `incomingDamage`, `sl`, and `selectedLocation` from it exactly once per new seed object. A `useEffect` is chosen deliberately over the render-phase conditional-`setState` "latch" that `CriticalWoundsPanel` uses for `autoOpenRollFlow`: a render-phase seed write could re-fire and clobber the player's manual edits, whereas an effect keyed on seed identity fires only when a genuinely new seed arrives. To prevent any re-seeding after consumption, **CombatPage clears `takeDamageSeed` to `null` immediately after setting it** (the effect having captured the values), so a given seed is applied once and manual edits afterward are never overwritten (FR-3.5). Values remain fully editable afterwards. No net-wounds math changes.

> Placement of crit-wound suggestion state: with the Status-path routing, crit-wound-derived suggestions live in **CombatPage** `critConditionSuggestions` state (set in the extended `onAddWound` handler, parsed from the recorded `wound.effects`) and render in the Status Critical Wounds section. This keeps both the mutation (`recordCriticalWound`) and the crit-derived display in CombatPage, next to where the crit is rolled. AttackFlow only owns the **weapon-quality** chips (which need no other panel) and the two entry-point buttons; it never derives crit-wound conditions, so the `deriveCriticalWoundSuggestions` call happens in CombatPage, consistent with §5.1.

### 5.6 Data flow summary
1. Roll to hit → `RollResult` (crit flag already set, incl. house rule). (unchanged)
2. Hit location (unchanged) → Step 4.
3. Step 4 renders existing Net Wounds + new Consequences strip (Roll Critical Wound button if crit, weapon-quality chips, Send to Take Damage button).
4. Crit → "Roll Critical Wound" button → `onRollCritical(location)` → CombatPage switches to **Status** mode and the existing `CriticalWoundsPanel` auto-opens `RollCriticalFlow` (pre-selected location) → confirm → existing `onAddWound` records via `recordCriticalWound` + event; CombatPage derives `deriveCriticalWoundSuggestions(wound.effects)` and shows condition chips in the Status section.
5. Condition chip tap (weapon-quality chips in Step 4, or crit-wound chips in Status) → CombatPage `onApplySuggestedCondition` applies via the shared `applyCondition` path + Advantage reset + event.
6. "Send to Take Damage" → CombatPage seeds `TakeDamagePanel` with the three pre-mitigation inputs (Damage, SL, Location) only; switches to Defend → the panel recomputes its own Net Wounds from the **sheet owner's** TB/AP (which legitimately differs from the opponent-facing Net Wounds the Attack side displayed) → player taps existing "Apply Wounds" → `wCur` reduced via existing logic + existing `combat.damage` event.

### 5.6a "Send to Take Damage" weapon-damage tooltip (calculated-total-tooltips rule)
The weapon-damage component shown in the "Send to Take Damage" control is a derived number the player sees in a new control, so per the calculated-total-tooltips steering rule it must carry a breakdown tooltip rendered with the existing `Tooltip` component (`src/components/shared/Tooltip.tsx`).

- **Source data.** `calcWeaponDamage` returns `{ num: number | null, breakdown: string }`. `breakdown` is a **space-joined parts string** (e.g. `"SB(4) +4 Rune+2"`), *not* an `= Total` expression, and `num` can be `null` when the weapon has no damage value (`damage` missing or `"—"`).
- **Rendered tooltip content.** The tooltip body must show the additive components and the resulting total in the rule's `A + B + C = Total` spirit. Because `breakdown` already lists the components space-joined, the tooltip renders exactly:
  - `title`: `"Weapon Damage"`
  - body: `` `${weaponDamage.breakdown} = ${weaponDamage.num ?? 0}` `` — e.g. `"SB(4) +4 Rune+2 = 10"`.
- **Null / no-damage case.** When `weaponDamage.num === null` (and `breakdown === ''`), the control shows `0` and the tooltip body renders `"No weapon damage value = 0"` (an explicit statement rather than a bare `= 0`), so the player understands the 0 is intrinsic to the weapon, not a computation error. `buildDefendHandoff` receives `weaponDamage.num ?? 0` so the seeded Damage is `0` in this case.
- **Trigger behaviour.** Hover on desktop, tap/long-press on touch (the `Tooltip` component's established activation), keyboard-activatable, `aria`-wired consistent with the existing Net Wounds tooltip.
- **Test.** §7.2's Tooltip test asserts the **exact** rendered body string for a representative weapon (e.g. `"SB(4) +4 = 8"`) and for the null case (`"No weapon damage value = 0"`), not merely that a tooltip "opens".

### 5.7 Error handling & validation (per operation)
- **Condition-effect parsing** (`deriveCriticalWoundSuggestions(effectText: string)`): input is a plain string (a `CriticalWound.effects` / `CriticalWoundTableEntry.effect` value — both authored by us). Failure mode is "no recognised `<Condition> Condition(s)` fragment in the text" → returns `[]` (recoverable, expected for permanent-stat-only entries like "Decapitation"). Non-integer/garbled counts cannot occur because the regex captures `\d+` only; absent count → defaults to 1. The global, verb-independent regex is bounded (linear scan, closed vocabulary) and cannot throw on arbitrary input; the property test exercises random strings to confirm no-throw and closed-vocabulary output. Not logged (normal path).
- **Weapon quality detection**: `hasWeaponQuality` already tolerates missing/empty `qualities` (returns false). Missing weapon → the Consequences strip is only rendered when `selectedWeapon` and `hitLocationResult` are non-null (same guards Step 4 already uses). No throw.
- **Hand-off seed**: `buildDefendHandoff` coerces a null `weaponDamage.num` to 0 (the display already does `?? 0`). The Defend panel clamps its own inputs to ≥0 as it does today. Invalid state is impossible to reach because the button only renders on a passed roll with a location.
- **Condition apply**: `applyCondition` is a no-op clone when the name is unknown or at max level (existing behaviour) — tapping a chip can never throw or exceed `maxLevel`.
- **Critical-wound record**: unchanged from today — the Status-mode `CriticalWoundsPanel`/`RollCriticalFlow` validates the roll is an integer 1–100 and only records a matched preview through the existing `onAddWound` → `recordCriticalWound` (which assigns id/timestamp). The Attack side only triggers navigation (`onRollCritical`), so it introduces no new record path and cannot record an unmatched wound. Deriving `deriveCriticalWoundSuggestions(wound.effects)` on the recorded wound cannot throw (string parse, returns `[]` on no match).
- No fatal/unrecoverable paths are introduced. No user-facing error UI is required beyond the validation `RollCriticalFlow` already shows.

### 5.8 Invariants & ownership
- **"No opponent wound tracking"** — owned by the design: the Attack side never stores or decrements any enemy wound value; apply always targets the sheet owner via Defend. Enforced by code review + a test asserting AttackFlow exposes no wound-mutation of a non-owner.
- **"`combat.attack` fires exactly once"** — owned by `AttackFlow.logAttackResult`, called only at the Step 3→4 transition; the new consequence events are separate `type`s appended by CombatPage, never in that function.
- **"Consequences are explicit"** — owned by the UI layer: every consequence is behind a button/chip (the "Roll Critical Wound" trigger, the weapon-quality chips, the crit-wound chips in Status, and the "Send to Take Damage" button). No `useEffect` auto-applies a consequence on reaching Step 4 or on entering Status; the only effect introduced (the `TakeDamagePanel` seed effect, §5.5) pre-fills editable inputs and still requires an explicit "Apply Wounds" tap.
- **Wound-application single source of truth** — owned by `TakeDamagePanel`; the Attack side never calls `onApplyWounds` or mutates `wCur`.

---

## 6. Rulebook citations (copy into code comments per rules-compliance)

All page references are to `docs/WarhammerFantasyRoleplay4e.md` (Core). No errata or supplement rule overrides these; the supplements add alternative crit/injury systems that are **not** in scope here (we use the core Critical Tables the app already encodes).

- **Attack sequence / damage** — "Damage = Weapon Damage + SL"; "Wounds Suffered = Damage − (Toughness Bonus + Armour Points)"; and the Apply-Damage rule that if "Wounds lost exceed your opponent's remaining Wounds total, your opponent takes a Critical Wound … and gains the Prone Condition." (Core §Combat, Steps 3–4, p.159 area; `docs/WarhammerFantasyRoleplay4e.md` "4: Apply Damage".)
- **Critical Hit → immediate Critical Wound** — "Any successful Melee or Ranged Test that also rolls a double causes a Critical. … your opponent receives an immediate Critical Wound." (Core p.159, "Criticals".) → basis for FR-1.
- **Critical Wound sources & tables** — "The two most frequent sources of Critical Wounds are when a Critical Hit is scored, or when you lose more Wounds than you have." "To determine what effects a Critical Wound has, refer to the Critical Tables." (Core p.172; Critical Tables p.174.) → basis for `RollCriticalFlow` reuse.
- **Critical table roll −20 modifier** — "If you suffer fewer negative Wounds than your Toughness Bonus … you subtract −20 from your Critical Table result, with a minimum result of 01." (Core p.172.) Already implemented in `calculateCriticalModifier` (Defend side); unchanged here.
- **Conditions lose Advantage** — "If you suffer any Conditions, you immediately lose all Advantage." (Core p.169/164.) Already enforced in `CombatPage.onApply`; the suggestion path reuses it. → basis for FR-2.4.
- **Pummel → Stunned (test-gated)** — "If you score a Head hit with a Pummel weapon, attempt an Opposed Strength/Endurance test … If you win … your opponent gains a Stunned Condition." (Core p.298.) → basis for FR-2.2 Pummel suggestion being `testGated`.
- **Hack → armour damage** — "If you hit an opponent, you Damage a struck piece of armour or shield by 1 point as well as wounding the target." (Core p.297.) → basis for the Hack advisory (no condition).
- **Impale → crit on multiples of 10** — "Impale weapons cause a Critical Hit on any number divisible by 10 … as well as on doubles." (Core p.298.) Already handled by the existing Impale-crits-on-tens house rule in `handleRollToHit`; the bridge simply consumes the resulting `isCritical`.
- **Shield (Rating)** — "If you use this weapon to oppose an incoming attack, you count as having (Rating) Armour Points on all locations." (Core p.298.) Already handled Defend-side; unchanged.
- **Prone on dropping to 0 / excess damage** — see Apply-Damage citation above and Core p.172 "If you lose all of your Wounds … you gain the Prone Condition." The Defend panel owns applying wounds; Prone-on-zero is a Defend-side concern already surfaced by its down/critical flow.

> Verified against the core rulebook text; the critical-wound *table entries* themselves live in `src/data/critical-wound-tables.ts` and are the authoritative condition source for FR-2.3 parsing (the app already treats that file as the encoded Critical Tables).

---

## 7. Test plan

### 7.1 Pure-logic unit + property tests — `src/logic/attack-consequences.test.ts`
- **Unit (weapon quality, outright)**: Pummel+Head (sole-token Pummel) → one test-gated Stunned suggestion; Pummel+non-Head → none; Hack (sole token) → advisory, no condition; weapon with neither (Sword `"—"`) → empty.
- **Unit (weapon quality, "X or Y" choice — Finding 2)**: Warhammer `"Unbalanced, Pummel or Penetrating"` + Head → a test-gated Stunned chip with the "if chosen" note; Warhammer + non-Head → none. Pollaxe `"Defensive, Hack or Impale or Pummel"` + Head → Stunned chip (if chosen) **and** the Hack advisory (if chosen); Bill `"Defensive, Hack or Trip"` → Hack advisory (if chosen), no Stunned. Each asserts the choice-gated weapons are **not** silently dropped.
- **Unit (crit parsing — Finding 1 comma chains)**: `deriveCriticalWoundSuggestions` over representative entries from each table and especially the comma-chained ones: Head "Stunned" → Stunned ×1; Arm "Deep Cut"/"Suffer 2 Bleeding Conditions" → Bleeding ×2; Body "Organ Damage"/"Gain Unconscious Condition" → Unconscious ×1; **Body "Cracked Ribs" `"Suffer 1 Stunned Condition, 1 Bleeding Condition."` → Stunned ×1 AND Bleeding ×1**; **Body "Broken Ribs" and Leg "Shattered Kneecap" `"Suffer 2 Bleeding Conditions, 2 Stunned Conditions."` → Bleeding ×2 AND Stunned ×2**; "Decapitation"/permanent-stat-only → []. These assert the second, verb-less clause is not dropped.
- **Property (fast-check)**:
  - *Closed vocabulary + completeness*: for any entry across all four tables, every suggested `name` is a member of `CONDITIONS` names, and every `count ≥ 1`. For non-stackable names (`maxLevel === 1`) the displayed/clamped count is exactly 1. Additionally assert **completeness**: the number of suggestions emitted for an entry equals the number of `"<Condition> Condition(s)"` fragments literally present in its `effect` string (count the fragments independently in the test) — this is the property that would have failed under the dropped verb-anchor regex, so it pins Finding 1 across the whole table data, not just the three named entries. (Iterate the real table data; fc generates roll indices.)
  - *Location → table selection*: `HitLocation` has **six** values (`Head`, `Left Arm`, `Right Arm`, `Body`, `Left Leg`, `Right Leg`); `Left Arm`/`Right Arm` both resolve to `ARM_CRITICAL_TABLE` and `Left Leg`/`Right Leg` both to `LEG_CRITICAL_TABLE` (as `lookupCriticalWound` already folds them). The fast-check generator ranges over **all six** `HitLocation` values; for each and all `roll ∈ 1..100`, assert `lookupCriticalWound(loc, roll)` returns an entry drawn from the expected one of the four tables (Head/Arm/Body/Leg per the fold) — pinning the §5.2 mapping and FR-1.3. (This exercises `lookupCriticalWound`; add here rather than duplicating in critical-wounds tests.)
  - *Parser determinism/no-crash*: fc over arbitrary strings → `deriveCriticalWoundSuggestions`-style parse never throws and only ever emits known names (guards the regex against odd input even though real input is typed).
  - *buildDefendHandoff split*: for arbitrary `damage, sl`, `handoff.damage + handoff.sl === damage + sl` (no double count) and `location` is preserved.

### 7.2 Component tests
- **`AttackFlow`** (`AttackFlow.test.tsx`, additive): drive to Step 4 with a stubbed critical `RollResult` → assert "Roll Critical Wound" present; with non-critical → absent. Tap it → `onRollCritical(location)` called with the expected struck location (AttackFlow does **not** mount `RollCriticalFlow`; assert the flow is *not* rendered inline). Tap a weapon-quality chip → `onApplySuggestedCondition` called with `(name, count)`. Tap "Send to Take Damage" → `onSendToTakeDamage` called with `{damage, sl, location}` matching the split. Assert the existing single `combat.attack` logging is unchanged (spy on `updateCharacter`/`appendEvent` call count at the transition).
- **`TakeDamagePanel`** (additive): passing a `seed` initialises Damage/SL/Location; editing afterwards works; a new seed identity re-seeds; net-wounds math unchanged for un-seeded usage (existing tests stay green).
- **`CombatPage`** (additive):
  - `onSendToTakeDamage` switches to Defend mode and seeds the panel. **Negative invariant (Finding 8):** assert the seed object passed to `TakeDamagePanel` contains exactly the keys `{ damage, sl, location }` (no `tb`/`ap`/opponent keys), and that `TakeDamagePanel` receives the **sheet owner's** `toughnessBonus`/`armourPoints` (not the opponent's), so the two Net Wounds are computed from different mitigation and are not forced to match.
  - `onApplySuggestedCondition` applies the condition and zeroes Advantage in combat and appends a `combat` event.
  - `onRollCritical` switches to Status mode with `rollCriticalHandoff` set and the location pre-selected (reuses the existing bridge); after the Status flow records a wound, the extended `onAddWound` records via `recordCriticalWound`, appends an event, and populates `critConditionSuggestions` from `wound.effects` (assert a crit entry with a known condition yields the expected chips).
- **Tooltip (Finding 4):** the weapon-damage value in the "Send to Take Damage" control opens a breakdown tooltip whose body is the **exact** string `` `${breakdown} = ${num ?? 0}` `` for a representative weapon (e.g. `"SB(4) +4 = 8"`), and `"No weapon damage value = 0"` when `num` is null. Assert the exact content, not merely that a tooltip opens (calculated-total-tooltips rule).

### 7.3 Verification commands
`npx tsc --build --force --noEmit` → `npm run build` → `vitest --run`, plus eslint via project config. All pre-existing tests must remain green unchanged.

---

## 8. Flagged ambiguities (rules-compliance rule 6)

1. **Pummel's Opposed test is not auto-resolved.** RAW gates the Stunned condition behind an Opposed Strength/Endurance test (Core p.298). The app has no opponent characteristics modelled, so the design surfaces Stunned as a **test-gated suggestion** the player applies only after resolving the test at the table, rather than inventing an auto-resolution. Confirm this is the desired behaviour (vs. omitting Pummel from suggestions entirely).
2. **Prone on a lethal blow.** Core p.159/172 says dropping an opponent to ≤0 also inflicts Prone, and a critical from losing all wounds is a Defend-side event. Since we don't track opponent wounds on the Attack side, Prone-from-lethal is only surfaced on the Defend side (where the sheet owner is the victim) via the existing down/critical flow. The Attack side does **not** suggest Prone from net-wounds alone (it has no opponent wound total to compare against). Confirm we are not expected to suggest Prone on the Attack side.
3. **Alternative injury system (Up In Arms §VII).** That supplement offers an alternative Critical/Injury system. This design uses the **core** Critical Tables already encoded in `src/data/critical-wound-tables.ts` and does not implement the alternative. Flagging in case the alternative system is intended later; it would be an additive, separate effort.

---

## 9. Out of scope
- Opponent wound/health tracking of any kind.
- Auto-resolving follow-up tests (Pummel Opposed test, Stunned end-of-round Endurance test, Bleeding end-of-round loss) — existing end-of-turn automation continues to own what it already owns.
- **Bludgeoner talent extra Stunned (Finding 5).** The Bludgeoner talent (`src/data/talents.ts`: "When you win an opposed Test to activate the Pummel Quality, you inflict an additional Stunned Condition for each level of Bludgeoner.") grants extra Stunned per talent level on a won Pummel test. The Pummel suggestion chip always offers Stunned ×1 and does **not** add the Bludgeoner bonus; that extra Stunned (also test-gated) is applied manually by the player. This is a deliberate first-cut scope decision, not an oversight — surfacing it would require reading the attacker's Bludgeoner level and is a small additive follow-up.
- The alternative Critical/Injury system from Up In Arms.
- Changing the existing `combat.attack` payload or the Net Wounds formula.
- Mounted combat, siege/structure damage, and other supplement combat subsystems.

---

## 10. Responses to design review findings

### Round 2 (current) — `.agents/tasks/design-review.json` verdict `CHANGES_REQUESTED`; 2 HIGH, 2 MEDIUM, 4 NIT

Every Round-2 finding was re-verified against source (`src/data/critical-wound-tables.ts`, `src/logic/weapons.ts`, `src/data/weapons.ts`, `src/components/combat/CriticalWoundsPanel.tsx`, `src/components/pages/CombatPage.tsx`, `src/components/shared/Tooltip.tsx`, `src/logic/weapons.ts` `calcWeaponDamage`) before editing. All eight are **addressed**.

- **R2-Finding 1 (HIGH — condition parser drops comma-chained verb-less conditions; §5.2, §7.1, FR-2.3, AC-4).** Addressed. The parser no longer anchors on a leading `suffer`/`gain` verb; it is a global regex matching every `[N] <Condition> Condition(s)` fragment independent of a verb, with the vocabulary still generated from `CONDITIONS`. §5.2's "Condition parsing" paragraph was rewritten with the new regex and an explicit no-false-positive argument. FR-2.3 now requires *every* named condition (including comma-chained ones) to be surfaced. §7.1 adds unit tests asserting Cracked Ribs → Stunned ×1 **and** Bleeding ×1, and Broken Ribs / Shattered Kneecap → Bleeding ×2 **and** Stunned ×2, plus a whole-table *completeness* property (emitted-suggestion count equals the number of `"… Condition(s)"` fragments in each entry). (Verified: the three entries in `critical-wound-tables.ts`.)

- **R2-Finding 2 (HIGH — `hasWeaponQuality` misses "X or Y" choice qualities; §5.2, FR-2.2, AC-3).** Addressed with chosen option (b): `deriveWeaponQualitySuggestions` no longer calls `hasWeaponQuality` for Pummel/Hack. It parses each comma segment, splits on `\bor\b`, and records whether a quality is guaranteed (sole token) or a choice alternative. Choice-alternative Pummel/Hack still fire, labelled "if chosen" (Pummel) / "If Hack chosen:" (Hack) — explicit, never automatic (honouring the player-confirmed-consequence preference and RAW's point-of-use choice). §5.2 documents the parse and the `QualityPresence` structure; FR-2.2 and AC-3 now state the choice-gated behaviour; §7.1 adds unit tests over Warhammer, Pollaxe, and Bill asserting the chips/advisories **do** fire. (Verified: `hasWeaponQuality` exact-match; Warhammer/Pollaxe/Bill entries.)

- **R2-Finding 3 (MEDIUM — inline `RollCriticalFlow` vs cited Status precedent; §5.1, §5.3, §5.4, §5.5).** Addressed by choosing the reviewer-preferred resolution: the Attack-side crit roll **reuses the existing Defend→Status `CriticalWoundsPanel` + `autoOpenRollFlow` path** rather than mounting `RollCriticalFlow` inline. AttackFlow exposes `onRollCritical(location)` (same shape as the Defend panel's); CombatPage routes it via `setDownLocation/setRollCriticalHandoff/setCombatMode('status')`. §5.1 gains a "Crit-roll routing decision" paragraph; §5.3's "re-uses the exact mechanism" claim is now literally true for both bridges; §5.4 and §5.5 were rewritten accordingly; the new prop is listed explicitly in the AttackFlow props block; and the double-latch concern is moot because only the Status latch exists. Crit-wound condition chips are surfaced in the Status section, derived from the recorded `wound.effects`.

- **R2-Finding 4 (MEDIUM — weapon-damage tooltip content underspecified; NFR-2, §5.5, §7.2).** Addressed. New §5.6a specifies the exact tooltip: title `"Weapon Damage"`, body `` `${breakdown} = ${num ?? 0}` `` (e.g. `"SB(4) +4 Rune+2 = 10"`), and the null case body `"No weapon damage value = 0"`. §7.2's Tooltip test now asserts the **exact** body string (both normal and null cases), not just that a tooltip opens. The rendered control uses the existing `TooltipTriggerCell` + `Tooltip` wiring already present in AttackFlow for Net Wounds.

- **R2-Finding 5 (NIT — Bludgeoner talent interaction unaddressed; §5.2, §6).** Addressed. §9 gains a bullet stating the Pummel chip always offers Stunned ×1 and the Bludgeoner extra-Stunned-per-level is out of scope and applied manually. (Verified: Bludgeoner text in `src/data/talents.ts`.)

- **R2-Finding 6 (NIT — `opponentTB`/`opponentAP` "read from `Combat_Target`"; §5.3, §5.6 step 6).** Addressed. §5.3 now says the opponent TB/AP are the local `AttackFlow.tsx` variables read via `getCombatTarget(character)` returning `{ name, tb, ap }` from `combatState.target` (`src/logic/combat-target.ts`).

- **R2-Finding 7 (NIT — `onConfirm` widening necessity depends on Finding 3).** Addressed consistent with the Finding-3 decision: because the crit roll reuses the Status path, the `RollCriticalFlow.onConfirm` widening is **dropped** — no signature change. §5.5's `RollCriticalFlow` bullet now states "no change required" and derives conditions from the recorded wound's stored `effects`. `deriveCriticalWoundSuggestions` now takes a plain `effectText: string` so it works on the stored `effects`.

- **R2-Finding 8 (NIT — no test pins the negative TB/AP invariant; AC-5, §5.3, §7.2).** Addressed. §7.2's CombatPage test now asserts the seed object passed to `TakeDamagePanel` has exactly `{ damage, sl, location }` (no TB/AP keys) and that the panel receives the sheet owner's `toughnessBonus`/`armourPoints`, not the opponent's.

### Round 1 (prior) — `.agents/tasks/design-review.json` earlier verdict `CHANGES_REQUESTED`; 0 HIGH, 3 MEDIUM, 5 NIT

Note: Round-1 numbering below is independent of Round 2. Where Round 2 revisited the same area (e.g. the `effect` singular/plural note, the seed latch), the Round-2 text above supersedes.

- **Finding 1 (MEDIUM — §5.3/AC-5/§5.6 step 6, pre-reduction total conflation).** Addressed. §5.3 now carries a "What carries, and what deliberately does not" subsection stating that only the three pre-mitigation inputs (weapon-damage component, effective SL, location) are handed over, that the raw Damage+SL sum is identical on both sides, and that the Net Wounds numbers differ **by design** (Attack uses the opponent's `opponentTB`/`opponentAP` from `Combat_Target`; Defend recomputes from the sheet owner's TB/AP). It explicitly forbids forcing them to match or passing opponent TB/AP into the Defend panel. AC-5 now asserts only that Damage/SL/Location are seeded and notes the net totals legitimately differ. §5.6 step 6 reworded to match. (Verified: `HitLocation`/`Combat_Target` split and the two separate mitigation sources.)

- **Finding 2 (MEDIUM — six-value `HitLocation` vs four-table collapse, §5.2/§7.1/FR-1.3).** Addressed. §5.2 gains a "Hit-location vocabulary and the four-table collapse" paragraph stating all six `HitLocation` values and that `lookupCriticalWound` folds Left/Right Arm → `ARM_CRITICAL_TABLE` and Left/Right Leg → `LEG_CRITICAL_TABLE`, with no new mapping introduced by this feature. §7.1's location property test now ranges the fast-check generator over all six values and asserts the resolved table is the expected one of the four. (Verified in `hitLocationTable.ts` and `logic/critical-wounds.ts`.)

- **Finding 3 (MEDIUM — "same apply path used by `ConditionPicker`" imprecise, §5.2/§5.5/FR-2.4).** Addressed. FR-2.4 and the §5.5 CombatPage bullet now state that `onApplySuggestedCondition(name, count)` is a **new CombatPage handler** that reuses the `applyCondition` logic from `src/logic/combat.ts` plus the `advantage: inCombat ? 0 : c.advantage` reset (Core p.164) — the identical mutation CombatPage already uses for `ConditionPicker.onApply` — and does **not** reuse the `ConditionPicker.onApply` prop (which takes only a single name, no count). Module reference corrected to `logic/combat.ts`. (Verified: `applyCondition` exported from `logic/combat.ts`; `ConditionPicker.onApply` is `(conditionName: string) => void`; CombatPage's inline mutator matches.)

- **Finding 4 (NIT — non-stackable `count > 1`).** Addressed. §5.2 gains a "Non-stackable count clamp" note: `Broken`, `Entangled`, `Prone`, `Surprised`, `Unconscious` are `maxLevel 1`, the displayed chip count is clamped to `CONDITIONS[].maxLevel`, and the apply loop relies on `applyCondition`'s max-level clamp. §7.1's closed-vocabulary property now asserts clamped count is 1 for non-stackable names. (Verified in `data/conditions.ts`.)

- **Finding 5 (NIT — regex ellipsis placeholder).** Addressed. §5.2 now specifies the alternation is **built from `CONDITIONS.map(c => c.name)` at module load** (escaped and interpolated into the `RegExp`), lists the full twelve names, and notes which five appear in current crit tables. No hand-typed literal remains.

- **Finding 6 (NIT — `effect` singular vs `effects` plural).** Addressed. §5.2 gains a "Note on parsed vs. stored field names" paragraph: `deriveCriticalWoundSuggestions` parses `CriticalWoundTableEntry.effect` (singular), not the persisted `CriticalWound.effects` (plural), and code comments must reference `entry.effect`.

- **Finding 7 (NIT — `onConfirm` widening, `entry` non-null at confirm).** Addressed. §5.5's `RollCriticalFlow` bullet now notes `entry` is typed optional only for caller back-compat but is always defined when `onConfirm` fires (guarded by the `!preview` early return), and the AttackFlow handler should narrow it (`if (!entry) return;`) rather than use a non-null assertion.

- **Finding 8 (NIT — seed latch mechanism).** Addressed. §5.5's `TakeDamagePanel` bullet now specifies a **`useEffect` keyed on seed object identity** (not a render-phase conditional-`setState` like `CriticalWoundsPanel`'s `autoOpenRollFlow` latch, which could clobber manual edits), writing the three inputs once per new seed; CombatPage clears `takeDamageSeed` to `null` immediately after setting it so edits are never re-seeded (matches FR-3.5). The `onSendToTakeDamage` bullet was updated to use a fresh object identity and clear-after-consume.

No finding was backlogged or ignored; none required a structural change, and all edits remain consistent with the original requirements (explicit player-confirmed consequences, no opponent wound tracking, single `combat.attack` event preserved, breakdown tooltip on the new weapon-damage total via `src/components/shared/Tooltip.tsx`).
