# Implementation Plan — Roll → Damage → Consequence Pipeline

Source design: `.agents/tasks/crit-pipeline-design.md` (approved). This plan sequences that design faithfully; it does not re-decide the architecture. Rulebook citations below are copied verbatim from the design's Section 6 and must appear as code comments per the rules-compliance steering rule (authoritative source: `docs/WarhammerFantasyRoleplay4e.md`).

## Project facts discovered during exploration (use these, not assumptions)

- Stack: Vite + React 19 + TypeScript, CSS Modules, Vitest 5 + fast-check 4 + Testing Library. No new runtime deps.
- Real commands (from `package.json`): typecheck `npm run typecheck` (`tsc --build --noEmit`), build `npm run build` (`tsc --build && vite build`), tests `npm run test` (`vitest run`). The design's `vitest --run` == `npm run test`. ESLint runs via the repo's flat `eslint.config` (`npx eslint .`).
- `HitLocation` (`src/components/combat/hitLocationTable.ts`) has six values: `'Head' | 'Left Arm' | 'Right Arm' | 'Body' | 'Left Leg' | 'Right Leg'`.
- `lookupCriticalWound(location, roll)` (`src/logic/critical-wounds.ts`) already folds Left/Right Arm → `ARM_CRITICAL_TABLE` and Left/Right Leg → `LEG_CRITICAL_TABLE`. No new location mapping is introduced by this feature.
- `calcWeaponDamage` (`src/logic/weapons.ts`) returns `{ num: number | null; breakdown: string }`; `breakdown` is a space-joined parts string (e.g. `"SB(4) +4 Rune+2"`), not an `=Total` expression; `num` is `null` for `"—"`/missing damage.
- `hasWeaponQuality` (`src/logic/weapons.ts`) does **exact** per-comma-segment matching, so it misses "X or Y" choice groups (Warhammer `"Unbalanced, Pummel or Penetrating"`, Pollaxe `"Defensive, Hack or Impale or Pummel"`, Bill `"Defensive, Hack or Trip"`). The new module must NOT use `hasWeaponQuality` for Pummel/Hack.
- `CONDITIONS` (`src/data/conditions.ts`): twelve names; non-stackable (`maxLevel 1`) are Broken, Entangled, Prone, Surprised, Unconscious.
- `applyCondition(conditions, name)` (`src/logic/combat.ts`) clamps at `maxLevel` and is a safe no-op for unknown names.
- CombatPage already owns the Defend→Status crit bridge: `TakeDamagePanel.onRollCritical(location)` → `setDownLocation(location); setRollCriticalHandoff(true); setCombatMode('status')`; the Status-mode `CriticalWoundsPanel` auto-opens `RollCriticalFlow` (`autoOpenRollFlow`) and records via `onAddWound` → `recordCriticalWound`. The Attack-side crit bridge reuses this exact path (no inline `RollCriticalFlow`, no `RollCriticalFlow` signature change).
- CombatPage's `ConditionPicker.onApply` mutator is the reference apply path: `applyCondition(c.conditions, name)` + `advantage: inCombat ? 0 : c.advantage` (cites Core p.164). The new count-aware handler must share this logic, not the single-name `onApply` prop.
- Attack panels stay mounted and hidden via CSS across mode switches (`styles.modePanel`/`modePanelHidden`), so AttackFlow/TakeDamagePanel local state persists — a seed must therefore be a one-shot effect keyed on identity, not a render-phase write.
- Existing tooltip pattern (both `AttackFlow` and `TakeDamagePanel` Net Wounds): anchor-state + `TooltipTriggerCell` + `Tooltip` with a stable `id`.
- Test file locations: pure-logic tests under `src/logic/__tests__/`; component tests under `src/components/__tests__/` and `src/components/__tests__/pages/`. Existing fast-check property tests live alongside (e.g. `src/logic/__tests__/combat.property.test.ts`).

## Scope / invariants to preserve (from the design)

- The single `combat.attack` event fires exactly once at the existing Step 3→4 transition (`AttackFlow.logAttackResult`); new consequence events are separate `combat` events appended by CombatPage.
- No opponent wound tracking anywhere. The net-wounds hand-off seeds only the three pre-mitigation Defend inputs (Damage, SL, Location); the Defend panel recomputes from the **sheet owner's** TB/AP. Never pass opponent TB/AP into the Defend panel.
- Every consequence is an explicit, player-confirmed one-tap action — no `useEffect` auto-applies a consequence.

---

## Implementation Plan

- [ ] 1. Create the pure consequence-derivation module `src/logic/attack-consequences.ts` (no React imports).
      Implement exactly the design §5.2 exports: types `SuggestedConditionSource`, `SuggestedCondition` (`{ name; count; testGated; note?; source }`), `AttackAdvisory` (`{ text }`), `DefendHandoff` (`{ damage; sl; location }`); and functions `deriveWeaponQualitySuggestions(weapon: WeaponItem, location: HitLocation): { conditions: SuggestedCondition[]; advisories: AttackAdvisory[] }`, `deriveCriticalWoundSuggestions(effectText: string): SuggestedCondition[]`, and `buildDefendHandoff(weaponDamageNum: number, effectiveSL: number, location: HitLocation): DefendHandoff`.
      - `deriveCriticalWoundSuggestions`: build the condition-name alternation at module load from `CONDITIONS.map(c => c.name)` (regex-escaped), then a single **global, verb-independent** regex `new RegExp('(\\d+)?\\s*(?:the\\s+)?(' + names.join('|') + ')\\s+Conditions?', 'gi')`. Capture every `[N] <Condition> Condition(s)` fragment (count defaults to 1 when absent); emit one `SuggestedCondition` per fragment with `source: 'critical-wound'`, `testGated: false`. Clamp the displayed `count` to the condition's `CONDITIONS[].maxLevel` for non-stackable names. Must NOT anchor on a leading `suffer`/`gain` verb (so comma-chained verb-less clauses like Cracked Ribs `"Suffer 1 Stunned Condition, 1 Bleeding Condition."` yield both). Returns `[]` when no known fragment is present; never throws.
      - `deriveWeaponQualitySuggestions`: do NOT call `hasWeaponQuality`. Parse `weapon.qualities` by splitting on commas, then each segment on `/\bor\b/i`, trimming parenthetical ratings (e.g. `"Slash (2A)"` → `Slash`). Record per-token `{ token; choice }` where `choice` is true when the token was one of several "or" alternatives in its segment. Pummel present (either form) AND `location === 'Head'` → `{ name: 'Stunned', count: 1, testGated: true, source: 'weapon-quality', note }` with note `"Pummel (Head): on a won Opposed Str/End test"` (guaranteed) or `"Pummel (Head), if chosen: on a won Opposed Str/End test"` (choice). Hack present (either form) → advisory `"Hack: a struck piece of armour or shield is Damaged by 1"`, prefixed `"If Hack chosen: "` when choice. No other quality in the initial vocabulary.
      - `buildDefendHandoff`: `{ damage: weaponDamageNum, sl: effectiveSL, location }` (no summing; the split prevents double-counting SL).
      - Code comments must cite: Pummel→Stunned opposed test (Core p.298); Hack→armour damage (Core p.297); and note the field read is `wound.effects` (plural, stored) in the CombatPage caller while the same parser accepts `entry.effect` (singular) pre-record.
      Files: `src/logic/attack-consequences.ts`
      Verify: `npm run typecheck` passes (module compiles, no unused/implicit-any). No behavior change elsewhere yet.

- [ ] 2. Add pure-logic unit + property tests for the new module.
      Cover design §7.1:
      - Weapon quality (outright): Dwarf Warhammer/Mace (`Pummel...`) + Head → one test-gated Stunned; + non-Head → none; Dwarf Axe (`Hack`) → Hack advisory, no condition; Sword (`"—"`) → empty conditions and advisories.
      - Weapon quality ("X or Y" choice): Warhammer `"Unbalanced, Pummel or Penetrating"` + Head → Stunned chip with "if chosen" note; + non-Head → none. Pollaxe `"Defensive, Hack or Impale or Pummel"` + Head → Stunned (if chosen) AND Hack advisory (if chosen). Bill `"Defensive, Hack or Trip"` → Hack advisory (if chosen), no Stunned.
      - Crit parsing: Head "Stunned" → Stunned ×1; Arm "Deep Cut" → Bleeding ×2; Body "Organ Damage" (`Gain Unconscious`) → Unconscious ×1; Body "Cracked Ribs" → Stunned ×1 AND Bleeding ×1; Body "Broken Ribs" and Leg "Shattered Kneecap" → Bleeding ×2 AND Stunned ×2; "Decapitation" → [].
      - Property (fast-check): (a) closed vocabulary + completeness — over all four real tables, every suggested `name ∈ CONDITIONS` names, every `count ≥ 1`, non-stackable clamped to 1, and the number of emitted suggestions equals the number of `"<Condition> Condition(s)"` fragments independently counted in each `effect`; (b) location→table — generator over all six `HitLocation` values and `roll ∈ 1..100` asserts `lookupCriticalWound` returns an entry from the expected one of the four tables (Head/Arm/Body/Leg fold); (c) parser determinism — arbitrary strings never throw and only emit known names; (d) `buildDefendHandoff(d, s, loc)` → `handoff.damage + handoff.sl === d + s` and `location` preserved.
      Files: `src/logic/__tests__/attack-consequences.test.ts` (and/or a sibling `*.property.test.ts` matching the repo's split convention)
      Verify: `npm run test -- src/logic/__tests__/attack-consequences` — new tests pass.

- [ ] 3. Add the count-aware condition-apply handler and the net-wounds hand-off seed state to CombatPage, without touching AttackFlow yet (keeps the build green between steps).
      - Add `onApplySuggestedCondition(name: string, count: number)`: a new handler (NOT the `ConditionPicker.onApply` prop) that, in a single `updateCharacter` call, folds `applyCondition(c.conditions, name)` `count` times over the conditions array and sets `advantage: inCombat ? 0 : c.advantage` once (cite Core p.164), then `appendEvent`s a `combat` event summarising "Applied N× <name> from attack". Relies on `applyCondition`'s max-level clamp for non-stackable safety.
      - Add `takeDamageSeed` state typed `{ damage: number; sl: number; location: HitLocation } | null` and an `onSendToTakeDamage(handoff: DefendHandoff)` handler that sets a fresh seed object then `setCombatMode('defend')`.
      - Add `critConditionSuggestions` state (`SuggestedCondition[]`) and extend the existing Status-mode `CriticalWoundsPanel.onAddWound` handler so that, after `recordCriticalWound`, it sets `critConditionSuggestions` from `deriveCriticalWoundSuggestions(wound.effects)`. Clear `critConditionSuggestions` wherever `setRollCriticalHandoff(false)` is already reset (the Attack/Defend/Status segment buttons) and in the existing `onAddWound` reset block as appropriate.
      Leave these handlers unused-but-referenced-by-render where needed, or render the crit chips (next bullet) in the same step to avoid no-unused-vars.
      Files: `src/components/pages/CombatPage.tsx`
      Verify: `npm run typecheck` passes; `npm run test -- CombatPage` — existing CombatPage tests still pass.

- [ ] 4. Render the crit-wound-derived condition chips in the Status-mode Critical Wounds section of CombatPage.
      In the `combatMode === 'status'` Critical Wounds `CollapsibleSection`, render one-tap chips for each `critConditionSuggestions` entry (label e.g. `"Bleeding ×2"`, include `testGated`/`note` text when present), each calling `onApplySuggestedCondition(name, count)`. Reuse existing chip/button styling idioms and the panel's CSS module conventions; touch targets ≥44px, `aria-label`ed, keyboard-activatable (NFR-5). These chips also appear after a manual "Roll Critical" (a harmless, consistent improvement — still explicit/one-tap).
      Files: `src/components/pages/CombatPage.tsx`, `src/components/pages/CombatPage.module.css` (chip styles if not already reusable)
      Verify: `npm run typecheck` and `npm run build` pass; `npm run test -- CombatPage` green.

- [ ] 5. Add the optional `seed` prop and one-shot seeding effect to TakeDamagePanel.
      Add `seed?: { damage: number; sl: number; location: HitLocation }` to `TakeDamagePanelProps`. Add a `useEffect(() => { if (seed) { setIncomingDamage(seed.damage); setSl(seed.sl); setSelectedLocation(seed.location); } }, [seed])` keyed on the seed object identity (deliberately an effect, not a render-phase write, so it never clobbers manual edits on re-render). No net-wounds math changes; values remain editable. Add an eslint-disable only if the hooks linter demands it for the intentional setState-in-effect, mirroring the existing `Tooltip.tsx` precedent, with the same justifying comment; otherwise do not suppress.
      Files: `src/components/combat/TakeDamagePanel.tsx`
      Verify: `npm run typecheck` passes; `npm run test -- TakeDamagePanel` — existing tests pass (un-seeded behavior unchanged).

- [ ] 6. Wire CombatPage's `takeDamageSeed` into TakeDamagePanel and clear it after consumption.
      Pass `seed={takeDamageSeed ?? undefined}` to the Defend-mode `TakeDamagePanel`. Immediately after setting the seed in `onSendToTakeDamage` (or via a follow-up effect), clear `takeDamageSeed` back to `null` so the one-shot effect consumes a given seed exactly once and later manual edits are never re-overwritten (FR-3.5). Confirm the panel still receives the sheet owner's `toughnessBonus={TB}` and `armourPoints` (never opponent values).
      Files: `src/components/pages/CombatPage.tsx`
      Verify: `npm run typecheck` and `npm run build` pass; `npm run test -- CombatPage TakeDamagePanel` green.

- [ ] 7. Add the new optional callback props to AttackFlow and render the Step-4 "Consequences" strip.
      - New optional props (optional to preserve existing tests/usages, matching the `onAddWeapon` precedent): `onRollCritical?: (location: HitLocation) => void`, `onSendToTakeDamage?: (handoff: DefendHandoff) => void`, `onApplySuggestedCondition?: (name: string, count: number) => void`. Import `DefendHandoff`/`buildDefendHandoff`/`deriveWeaponQualitySuggestions` from the new module and `HitLocation` type.
      - Add local `appliedSuggestions: Set<string>` purely to visually mark tapped weapon-quality chips. Do NOT add `showCritFlow` state or mount `RollCriticalFlow` inline.
      - In `renderStep4`, after the existing Net Wounds block and only when `selectedWeapon` and `hitLocationResult` are non-null (same guards Step 4 uses), render the Consequences region:
        - If `lastRollResult.isCritical`: a "Roll Critical Wound" button calling `onRollCritical?.(hitLocationResult.location)` (no inline flow).
        - Weapon-quality chips from `deriveWeaponQualitySuggestions(selectedWeapon, hitLocationResult.location).conditions`, each calling `onApplySuggestedCondition?.(name, count)` and showing `testGated`/`note` text including the "if chosen" labelling.
        - Advisories from the same call rendered as small inline notes (e.g. Hack).
        - A "Send to Take Damage" button calling `onSendToTakeDamage?.(buildDefendHandoff(weaponDamage.num ?? 0, effectiveSL, hitLocationResult.location))`.
      - Do NOT add any new `combat.attack` logging; `logAttackResult` stays exactly as-is and fires once (FR-4.1).
      Files: `src/components/combat/AttackFlow.tsx`, `src/components/combat/AttackFlow.module.css` (chip/button/advisory styles following existing idioms)
      Verify: `npm run typecheck` and `npm run build` pass; `npm run test -- AttackFlow` — existing AttackFlow tests still pass (new controls are additive and guarded).

- [ ] 8. Add the breakdown tooltip for the weapon-damage value shown in the "Send to Take Damage" control (calculated-total-tooltips rule, design §5.6a).
      Reuse the existing anchor-state + `TooltipTriggerCell` + `Tooltip` pattern already in AttackFlow (new anchor state + unique `id`, e.g. `tooltip-attack-send-damage`). Title `"Weapon Damage"`. Body = `` `${weaponDamage.breakdown} = ${weaponDamage.num ?? 0}` `` for the normal case, and exactly `"No weapon damage value = 0"` when `weaponDamage.num === null`. Hover/tap/keyboard activation consistent with the existing Net Wounds tooltip; `aria`-wired.
      Files: `src/components/combat/AttackFlow.tsx` (+ `AttackFlow.module.css` if a style hook is needed)
      Verify: `npm run typecheck` and `npm run build` pass; `npm run test -- AttackFlow` green.

- [ ] 9. Wire the three new AttackFlow callbacks from CombatPage to the handlers built in steps 3–6.
      In the Attack-mode `AttackFlow` usage in CombatPage, pass `onRollCritical={(location) => { setDownLocation(location); setRollCriticalHandoff(true); setCombatMode('status'); }}` (reuse the existing Defend→Status bridge verbatim), `onSendToTakeDamage={onSendToTakeDamage}`, and `onApplySuggestedCondition={onApplySuggestedCondition}`.
      Files: `src/components/pages/CombatPage.tsx`
      Verify: `npm run typecheck` and `npm run build` pass; `npm run test -- CombatPage` green. Manual trace: crit → Step 4 button → Status mode opens `RollCriticalFlow` with location pre-selected.

- [ ] 10. Add component tests for the new wiring (design §7.2).
      - AttackFlow (`src/components/__tests__/AttackFlow.test.tsx`, additive): drive to Step 4 with a stubbed critical `RollResult` → "Roll Critical Wound" present; non-critical → absent; tapping it calls `onRollCritical(location)` with the struck location and asserts `RollCriticalFlow` is NOT rendered inline. Tap a weapon-quality chip → `onApplySuggestedCondition(name, count)`. Tap "Send to Take Damage" → `onSendToTakeDamage({damage, sl, location})` matching the split. Assert the `combat.attack` logging call count at the Step 3→4 transition is unchanged (spy on `updateCharacter`/`appendEvent`). Assert the weapon-damage tooltip body is the exact string for a representative weapon (e.g. `"SB(4) +4 = 8"`) and `"No weapon damage value = 0"` for a null-damage weapon.
      - TakeDamagePanel (additive): passing a `seed` initialises Damage/SL/Location; editing afterwards works; a new seed identity re-seeds; un-seeded net-wounds math unchanged.
      - CombatPage (`src/components/__tests__/pages/CombatPage.test.tsx`, additive): `onSendToTakeDamage` switches to Defend and seeds the panel — assert the seed has exactly `{ damage, sl, location }` (no tb/ap/opponent keys) and the panel receives the sheet owner's `toughnessBonus`/`armourPoints` (negative TB/AP invariant). `onApplySuggestedCondition` applies the condition, zeroes Advantage in combat, and appends a `combat` event. `onRollCritical` switches to Status with `rollCriticalHandoff` set and location pre-selected; after the Status flow records a wound, `onAddWound` records via `recordCriticalWound`, appends an event, and populates `critConditionSuggestions` from `wound.effects` (assert expected chips for a crit entry with a known condition).
      Files: `src/components/__tests__/AttackFlow.test.tsx`, `src/components/__tests__/TakeDamagePanel.test.tsx` (create if absent, matching repo test conventions), `src/components/__tests__/pages/CombatPage.test.tsx`
      Verify: `npm run test -- AttackFlow TakeDamagePanel CombatPage` — all new and existing tests pass.

- [ ] 11. Full verification sweep and cleanup.
      Run the complete gate in order and fix any failures (including pre-existing ones surfaced), per the fix-errors steering rule: `npm run typecheck` → `npm run build` → `npm run test` → `npx eslint .`. Confirm: no `@ts-ignore`/`eslint-disable`/swallowed catches beyond the one justified `Tooltip`-style effect suppression if truly required; no new summed total lacks a tooltip; no code path reads/writes an opponent wounds value; the `combat.attack` event still fires exactly once. Remove any temporary scaffolding.
      Files: (whole repo — verification only)
      Verify: `npm run typecheck`, `npm run build`, `npm run test`, and `npx eslint .` all pass with no new warnings; all pre-existing tests remain green.

## Flagged assumptions / ambiguities (carried from design §8, rules-compliance rule 6)

- Pummel's Opposed Strength/Endurance test is NOT auto-resolved (no opponent characteristics modelled); Stunned is offered only as a test-gated, player-confirmed chip. (Core p.298.)
- Prone-on-lethal is a Defend-side event only; the Attack side does not suggest Prone from net wounds (no opponent wound total). (Core p.159/172.)
- The alternative Critical/Injury system (Up In Arms §VII) and the Bludgeoner extra-Stunned interaction are explicitly out of scope; the core Critical Tables in `src/data/critical-wound-tables.ts` are the authoritative condition source for parsing.
