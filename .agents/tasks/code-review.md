# Code Review — Roll → Damage → Consequence Pipeline

Commit under review: `8b6436e` — "feat: connect attack roll to crit, conditions, and take-damage pipeline"
Scope reviewed against: `.agents/tasks/crit-pipeline-plan.md`, `.agents/tasks/crit-pipeline-design.md`, and the original user request (connect roll → damage → condition pipeline as the headline item).

Verdict: **APPROVED** — no blocking findings.

---

## Verification evidence (read, not re-run)

The commit message records the full gate, consistent with plan step 11 and design AC-9:

- `npx tsc --build --force --noEmit`: pass
- `npm run build`: pass
- `vitest run`: 5149 passed (464 files)
- `npx eslint .`: 0 errors (3 pre-existing warnings only)

Evidence is present and specific (counts + command list). No missing-verification condition, so no rejection on that basis. I did not re-run the suites; no articulable doubt justified a spot-check beyond the targeted source reads below.

---

## What I checked

### 1. Rules-compliance (every mechanic cited, nothing invented)

- **Pummel → Stunned (test-gated).** `deriveWeaponQualitySuggestions` emits a `testGated: true` Stunned suggestion only on a Head hit, citing Core p.298. Verified against the rulebook: `docs/WarhammerFantasyRoleplay4e.md` line 14465 — "If you score a Head hit with a Pummel weapon, attempt an Opposed Strength/Endurance test … If you win … your opponent gains a Stunned Condition." The chip is never auto-applied; it is labelled "on a successful test". Correct and faithful; the Opposed test is deliberately not auto-resolved (design §8 flagged ambiguity).
- **Hack → armour damage advisory (no condition).** Code comment cites Core p.298. Verified: rulebook line 14439 — "If you hit an opponent, you Damage a struck piece of armour or shield by 1 point" and index line 16709 "Hack 298". Note: the *plan* text said "Core p.297" for Hack, but the rulebook index and body both place Hack on p.298, so the **code comment is correct** and the plan prose was slightly off. No code defect.
- **Crit-table → condition parsing.** `deriveCriticalWoundSuggestions` parses the authored effect prose in `src/data/critical-wound-tables.ts` (the app's encoded Critical Tables) with a verb-independent regex whose vocabulary is generated from `CONDITIONS`. Verified against the real table data that the comma-chained verb-less clauses are captured: "Cracked Ribs" → Stunned ×1 + Bleeding ×1; "Broken Ribs"/"Shattered Kneecap" → Bleeding ×2 + Stunned ×2; "Concussion" → `the Unconscious` captured via the optional article. No condition is invented — only names present in `CONDITIONS` can match, and non-condition effects (permanent stat loss, test penalties) contain no `"<Condition> Condition(s)"` fragment.
- **Crit-table selection by hit location.** The feature introduces no new location→table mapping. The six-value `HitLocation` is passed verbatim to the existing `lookupCriticalWound`, which folds Left/Right Arm → ARM and Left/Right Leg → LEG. Property test 2 pins the full six→four fold over all locations and rolls 1–100 (Core Critical Tables).
- **Advantage loss on gaining a Condition.** `onApplySuggestedCondition` applies via the shared `applyCondition` path and resets `advantage` to 0 while in combat, citing Core p.164 — identical to the existing `ConditionPicker.onApply` mutation.

### 2. Consequences are explicit, player-confirmed (no silent automation)

- The crit bridge, weapon-quality chips, crit-wound chips, and net-wounds hand-off are all behind buttons/chips. No `useEffect` auto-applies a consequence.
- The only effect introduced (`TakeDamagePanel` seed effect) pre-fills *editable* inputs and still requires an explicit "Apply Wounds" tap. Verified the seed effect is keyed on seed object identity and that CombatPage mints a fresh seed object per hand-off; later manual edits are not clobbered (TakeDamagePanel tests: "seeded values remain editable", "a new seed identity re-seeds").

### 3. No opponent wound tracking; single `combat.attack` event; net-wounds hand-off to Defend

- Grep for any opponent-wound write path found none. `opponentTB`/`opponentAP` are the pre-existing display-only mitigation inputs (read from the Combat_Target), unchanged by this feature.
- `logAttackResult` is unchanged and still fires the single `combat.attack` event at the Step 3→4 transition. AttackFlow test "still fires the combat.attack event exactly once" asserts exactly one event even with all three new callbacks wired.
- The hand-off seeds only `{ damage, sl, location }` (pre-mitigation). `buildDefendHandoff` keeps damage and SL separate (no pre-summing) so the Defend panel does not double-count SL. The Defend panel recomputes from the **sheet owner's** TB/AP; CombatPage test asserts the seeded panel shows the sheet owner's TB (4), never an opponent value, and that the seed object has only the three keys.
- **Critical Deflection + min-1-wound house rules** remain owned by `TakeDamagePanel`'s existing apply path, which the hand-off routes into unchanged. Verified no change to that logic in the diff.

### 4. Calculated-total tooltip

- The new "Send to Take Damage" control shows a derived weapon-damage value and carries a breakdown tooltip via the shared `Tooltip` + `TooltipTriggerCell` pattern (design §5.6a). AttackFlow tests assert the **exact** body: `"SB(4) +4 = 8"` for a normal weapon and `"No weapon damage value = 0"` for a null-damage weapon. Compliant with the calculated-total-tooltips rule.

### 5. No error suppression used to pass verification

- One `// eslint-disable-next-line react-hooks/set-state-in-effect` in `TakeDamagePanel`'s seed effect. This is the project's established, sanctioned pattern (10+ existing occurrences including the cited `Tooltip.tsx` precedent), used here for a genuine setState-in-effect that syncs local inputs to an external prop identity, with a detailed justifying comment. The design (NFR-3) and plan step 5 explicitly permitted exactly this suppression. Not an error-hiding workaround; permitted by the fix-errors rule's "genuinely warranted targeted suppression" clause.
- No `@ts-ignore`, no skipped/`.only` tests, no swallowed catches introduced.

### 6. Tests

- **Pure logic** (`attack-consequences.test.ts`): weapon-quality outright + "X or Y" choice groups (Warhammer/Pollaxe/Bill, verified against `src/data/weapons.ts`), comma-chain crit parsing, and `buildDefendHandoff` split — all FR-mapped.
- **Property tests** (`attack-consequences.property.test.ts`): closed vocabulary + **completeness** (emitted-suggestion count equals independently-counted fragments across all four real tables — the property that would fail under the dropped-verb-anchor regression), location→table fold over all six locations, parser no-throw/known-names on arbitrary strings, and the handoff split invariant.
- **Component tests**: AttackFlow (crit button present/absent, `onRollCritical(location)`, inline flow NOT mounted, chip apply, Hack advisory, hand-off split, exact tooltip bodies, single `combat.attack`), TakeDamagePanel (seed pre-fill, editable, re-seed, un-seeded math unchanged), CombatPage (chip apply adds condition + zeroes Advantage + appends event; hand-off switches to Defend with sheet-owner TB).

---

## Notes (non-blocking, no action required)

- The plan prose cites "Core p.297" for Hack while the code comment (and the rulebook) use p.298. The code is correct; only the plan narrative was imprecise. No change needed to the delivered code.
- The crit-parser regex has no left-hand word boundary before a condition name, so a hypothetical token like "Unblinded Condition" would match "blinded". This cannot occur in the owned crit-table data (closed vocabulary over authored prose), and Property 3 confirms no-throw/known-names on arbitrary input. Theoretical only; not a reachable defect.

---

## Conclusion

The implementation faithfully realises the approved design: every mechanic is cited and verified against the rulebook, consequences are explicit one-tap actions, no opponent wounds are tracked, the single `combat.attack` event and Attack Flow behaviour are preserved, the net-wounds hand-off targets the Defend side and respects Critical Deflection + min-1-wound, the new calculated total has a breakdown tooltip, and no error suppression was used to pass verification. Verification evidence is recorded and complete. No blocking findings.
