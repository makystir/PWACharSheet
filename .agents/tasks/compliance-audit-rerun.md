# WFRP 4e Rules-Compliance Audit — Re-run (Investigation Report)

**Date:** 2025 re-run. **Supersedes** the prior `docs/RULES_COMPLIANCE_AUDIT.md`, which was stale.
**Scope:** READ-ONLY. No application source was modified. Only this report and `docs/RULES_COMPLIANCE_AUDIT.md` were written.

---

## Summary answer

The prior audit is substantially out of date. Of the eight critical/major issues it flagged, **six are now fixed** in the current source and **two are confirmed compliant on re-read** (they were already correct, or the old audit itself revised them). The code has clearly been reworked: `end-of-turn.ts`, `combat.ts`, `dice-roller.ts`, `spell-casting.ts`, and `conditions.ts` now implement the RAW mechanics the old audit said were broken.

The four newly shipped features — **attack-consequences** (roll→damage→condition pipeline), **reminders** (proactive combat/psychology reminders), **advancement-planner**, and **sheet-totals** (GM read-only share/export) — are each **Compliant or essentially Compliant**. They are pure modules, well cited to the rulebook, and backed by 360 passing unit tests across the eight audited modules (`npx vitest run` on the eight test files — all green).

**The one genuine new rules bug found:** `processEndOfTurn` applies **Poisoned** damage as `wounds -= poisoned.level` (per-level), but Core p.168–169 says Poisoned makes you "lose **1 Wound**, ignoring all modifiers" — a flat 1 per round, with no stated per-level stacking of the wound loss (unlike Bleeding, whose stacking is explicit). This should be a flat −1. See Finding P below. A few pre-existing `conditions.ts` data-text inaccuracies (Broken, Deafened, Fatigued, Entangled) also remain and are documented.

---

## Evidence — confirmation of the old audit's critical/major issues

Page citations are from `docs/WarhammerFantasyRoleplay4e.md` (image anchors `_page_166…_page_169` place the Master Condition List at Core pp.166–169).

### Ablaze — NOW FIXED (was ❌ Non-Compliant)
Rulebook (Core p.166–167): "At the end of every Round, you suffer 1d10 Wounds, modified by Toughness Bonus and the Armour Points on the least protected Hit Location, with a minimum of 1 Wound … Each extra Ablaze Condition adds +1 … three Ablaze = 1d10+2."
`end-of-turn.ts` `processEndOfTurn`:
```ts
const rawDamage = d10Roll + (ablaze.level - 1) - tb - lowestAP;
const finalDamage = Math.max(1, rawDamage);
```
Exactly matches: 1d10 + (level−1) − TB − lowestAP, min 1. Supports an `injectedD10` for deterministic/one-tap rolling. `conditions.ts` Ablaze description/effects were also updated to the correct formula. **Verdict: Compliant.**

### Stunned — NOW FIXED (was ❌ Non-Compliant)
Rulebook (Core p.169): "At the end of each Round, you may attempt a **Challenging (+0) Endurance** Test. If successful, remove a Stunned Condition, with each SL removing an extra." Stunned stacks (crit tables inflict "2 Stunned"/"1d10 Stunned"; Core p.168 Hardy references multiple).
`end-of-turn.ts` no longer auto-removes Stunned; it emits a reminder sourced from `reminders.ts` (`conditionReminderText('Stunned')`). `conditions.ts` now has `Stunned: { stackable: true, maxLevel: 10 }` with the Endurance-test description. **Verdict: Compliant.**

### Combat damage SL — NOW FIXED (was ❌ Non-Compliant)
Rulebook (Core p.159): "Damage = Weapon Damage + SL"; "Wounds Suffered = Damage − (Toughness Bonus + Armour Points)"; min 1.
`combat.ts` `calculateDamage(weaponDamage, sl, targetAP, targetTB, options)`:
```ts
const raw = weaponDamage + sl - (effectiveAP + targetTB + robustLevel);
return Math.max(1, raw);               // Undamaging removes the min-1 and doubles AP
```
SL is now a first-class parameter. `AttackFlow.tsx` passes `lastRollResult.sl`. Also correctly implements Undamaging (double AP, no min-1; Core p.299) and Robust (−1/level; Core p.143). **Verdict: Compliant.**

### Ranged damage ½SB — NOW FIXED (was ⚠️ Non-Compliant)
`calculateDamage` no longer takes `isRanged` and never halves SB. Ranged weapon damage comes from `weapons.ts calcWeaponDamage`, which uses the weapon's own formula (`+SB+4`, flat `9`, etc.). The ½SB behaviour is now an explicit opt-in house rule (`houseRules.rangedDamageSBMode`), default **`'none'`** (RAW) in `BLANK_CHARACTER`. Matches Core p.293 weapon tables. **Verdict: Compliant.**

### Opposed-test tie-break — NOW FIXED (was ⚠️ Non-Compliant)
Rulebook (Core p.153): "The party with the highest SL wins … If both … score the same SL, the party with the **higher tested Skill or Characteristic** wins."
`dice-roller.ts calculateOpposedResult` now breaks SL ties on `playerTarget` vs `opponentTarget` (the tested skill/characteristic target number), NOT the raw roll. `resolveOpposedTest` passes the targets through. A comment explicitly states "Roll values are NOT used as a tie-breaker." **Verdict: Compliant.**

### Magic missile damage — NOW FIXED (was ⚠️ Non-Compliant)
Rulebook (Core p.236): "The SL of the Language (Magick) Test is added to the spell's listed Damage." Spells list damage as `+N`, `WPB`, or `TB`.
`spell-casting.ts`:
```ts
export function computeMagicMissileDamage(spell, castingSL, wpBonus?, tbBonus?) {
  const baseDamage = parseDamageFromEffect(spell.effect, wpBonus, tbBonus);
  return baseDamage + castingSL;        // WPB no longer double-added
}
```
`parseDamageFromEffect` resolves `Dmg WPB`→wpBonus and `Dmg TB`→tbBonus, then adds SL once. The old "+ wpBonus on top" bug is gone (explicit comment confirms). Spell data (`src/data/spells.ts`) uses the `Dmg +N`/`Dmg WPB`/`Dmg TB` tokens the parser expects. **Verdict: Compliant.**

### Miscast on Critical Cast — CONFIRMED Compliant (old audit self-revised)
Core p.235: a Critical Casting still works but generates a Minor Miscast unless Instinctive Diction. `resolveCastingResult`: `triggerMinorMiscast = (isCriticalCast && !hasInstinctiveDiction) || isFumbledCast || channelledCastFailed`. Correctly also adds the Winds of Magic mandatory Minor Miscast on a failed channelled cast. **Verdict: Compliant.**

### Extended XP cost table (51–70+) — CONFIRMED app convention, core 0–50 exact
Core p.44 table only goes to 46–50. `advancement.ts CHAR_COST_TABLE`/`SKILL_COST_TABLE` reproduce 0–50 **exactly** (char 25/30/40/50/70/90/120/150/190/230; skill 10/15/20/30/40/60/80/110/140/180). The 51–70+ rows are an app extrapolation, now clearly labelled as such. Talent cost `100 × (taken+1)` matches p.45. Out-of-career doubling matches p.46. Thresholds 5/10/15/20 (+app L5=25) match p.48; leave-career fee 100/200 matches p.48. **Verdict: Compliant (0–50); extended rows are a transparent, documented convention — not RAW, flag only.**

---

## Evidence — the four new features

### 1. Connected roll→damage→condition pipeline — `attack-consequences.ts`
- **Pummel→Stunned (test-gated):** Core p.298: "If you score a Head hit with a Pummel weapon, attempt an Opposed Strength/Endurance test … If you win … opponent gains a Stunned Condition." `deriveWeaponQualitySuggestions` suggests Stunned only on a **Head** hit, marks it `testGated: true`, and does not auto-apply it (no opponent stats). Cites Core p.298. Correctly detects Pummel inside `"X or Y"` choice groups (e.g. Warhammer "Damaging, Pummel, Slow"; Quarter Staff "Defensive, Pummel"). **Compliant.**
- **Hack→armour damage (advisory, no condition):** Core p.298: "you Damage a struck piece of armour or shield by 1 point as well as wounding the target." Emitted as an advisory, never a condition. **Compliant.**
- **Critical-wound condition parsing:** `deriveCriticalWoundSuggestions` parses "[N] <Condition> Condition(s)" from `critical-wound-tables.ts` effect prose, verb-independent so comma-chained clauses (e.g. Head "Dazed" → 2 Stunned; Body "Cracked Ribs"-style → Stunned + Bleeding) are all captured. Counts clamped to each condition's `maxLevel`. Only names present in `CONDITIONS` match; stat-loss/penalty prose is ignored. Regex alternation is generated from the data, so it cannot drift. **Compliant** (parser correctness, not a new mechanic).
- **Defend hand-off:** `buildDefendHandoff` keeps weapon-damage and SL **separate** so the defender's Take-Damage panel recomputes `Damage + SL − TB − AP` without double-counting SL. Matches the p.159 two-step model. **Compliant.**

### 2. Proactive reminders — `reminders.ts`
Reminder test/difficulty/characteristic verified per condition and psychology trait:
- **Stunned →** Challenging (+0) Endurance (T). Core p.169. ✔
- **Poisoned →** Endurance (T), each SL removes extra. Core p.168–169. ✔
- **Broken →** Cool (WP); difficulty circumstance-set, seeded Challenging (+0); note that you cannot rally while Engaged. Core p.167–168. ✔
- **Ablaze →** Athletics (Ag) to extinguish, each SL removes extra. Core p.166–167. ✔ (surfaced as a one-tap reminder even though the damage is handled in end-of-turn.)
- **Blinded / Deafened →** informational "1 level removed every other round," no roll. Core p.167–168. ✔
- **Fear →** Cool (WP), Extended. Core p.190. ✔
- **Terror →** Cool (WP). Core p.190. ✔
- **Frenzy →** **bare Willpower characteristic** test (not the Cool skill) — matches Core p.190 "Willpower Test" and the git fix `1684e51 "resolve Frenzy reminder roll against bare Willpower, not Cool skill."` ✔
- **Animosity / Hatred / Prejudice / Phobia →** Psychology (Cool) test, GM-set difficulty seeded Challenging (+0). Core p.189–191. ✔
- **Trauma →** informational only (GM discretion). ✔

Descriptions for conditions are byte-identical to the strings `end-of-turn.ts` previously emitted inline (now the single source of truth via `conditionReminderText`), and psychology descriptions are the verbatim `PSYCHOLOGY_REMINDERS[type]` strings — so no prose is re-authored. Where the rulebook gives no fixed TN (GM/circumstance-set), seeding Challenging (+0) as an adjustable default is a reasonable, explicitly-flagged choice, **not an invented fixed TN**. **Verdict: Compliant.** (Ambiguity flagged, not a bug — see Ambiguities.)

### 3. Advancement planner — `advancement-planner.ts`
Read-only projection; mutates nothing, spends no XP. All costs come from the real `getAdvancementCost` (Core pp.44–45 tiered table + out-of-career doubling), thresholds from `CAREER_COMPLETION_THRESHOLDS` (Core p.48: 5/10/15/20, app L5=25), level-change fee from `ADVANCE_LEVEL_FEE` (100 ready / 200 not-ready, Core p.48). Talent step priced at `getAdvancementCost('talent', 0, true)` = 100 (Core p.45). Skill minimisation targets real character rows 1:1 so the plan maps onto `advanceSkill`; wildcard `(Any)` skills correctly surfaced as advisories rather than auto-costed (mirrors `ensureCareerSkillsExist`). `met` flags follow the same predicate as `isCareerLevelComplete`. **No invented mechanics.** **Verdict: Compliant.**

### 4. GM read-only share/export — `sheet-totals.ts` + `SharedCharacterViewer.tsx`
`deriveSheetTotals` reuses the live calculators — it does **not** fork formulas:
- Wounds → `computeWoundMaximum` (SB + 2×TB + WPB, ×species multiplier, + Hardy×TB; species woundsUseSB correction). Core p.36–37.
- Armour points → `calculateArmourPointsUnified(..., { filterByWorn: true })` (worn-only, Archives III layering). Core p.293 / Archives III.
- Max encumbrance → `calculateMaxEncumbrance` (SB+TB, + Strong Back ×1, + Sturdy ×2). Core p.293 / p.146.
- Coin weight → `calculateCoinWeight` (`floor((gc+ss+d)/200)`).
- Weapon damage → `calcWeaponDamage` (same function and `rangedDamageSBMode` as the live sheet).
The viewer displays these verbatim, with a breakdown Tooltip on every calculated total (satisfies the calculated-total-tooltips steering rule). It performs no storage writes except the explicit, confirm-gated "Import into my characters". Movement is shown as the stored value (not re-derived), which is correct. **Verdict: Compliant** — derived totals match the rulebook formulas and the live calculators by construction.

---

## Findings requiring a fix / attention

### Finding P (NEW BUG) — Poisoned end-of-turn damage is per-level, should be flat 1
`end-of-turn.ts`:
```ts
const poisoned = conditions.find(c => c.name === 'Poisoned');
if (poisoned) { newWounds -= poisoned.level; ... }   // ← per-level
```
Core p.168–169 (Poisoned): "At the end of each Round, **lose 1 Wound, ignoring all modifiers**." The text states a flat 1 Wound and, unlike Bleeding ("three Bleeding Conditions … 3 Wounds per Round", stated explicitly), does **not** declare the wound loss scales per Poisoned Condition. The general stacking paragraph (Core p.166) stacks *penalties* (e.g. the −10 would become −20); the per-round wound loss for Poisoned is written as a flat 1.
- **Recommended fix:** change Poisoned processing to subtract a flat `1` (not `poisoned.level`). Keep it inside the `currentWounds > 0` guard. Mirror Bleeding's effect message but with a fixed 1.
- **Ambiguity note:** whether multiple Poisoned Conditions stack the 1-Wound loss is arguably ambiguous because of the general stacking rule. RAW-literal (flat 1) is the safer reading; flag for the user rather than assume per-level. The Errata (`docs/Errata.pdf`, a binary PDF — **not machine-readable in this environment**) may clarify; could not verify.

Note the Poisoned **−10 to all Tests** penalty is not modelled anywhere in condition processing (informational gap, pre-existing).

### Finding C1 (pre-existing data text) — `conditions.ts` descriptions diverge from RAW for several conditions
These are display/data strings, not the end-of-turn math, but they misstate rules:
- **Broken:** data says `stackable: false` and "if you cannot flee, you cower and gain the Stunned condition." RAW (Core p.167–168): Broken **stacks** (Terror inflicts Broken equal to its Rating; Cool test "each SL removing an extra Broken Condition"), and it does **not** grant Stunned. Recommend `stackable: true` and correcting the text to the flee/−10/Cool-to-rally rule.
- **Deafened:** data says hearing tests "auto-fail" and "may be Surprised." RAW (Core p.168): −10 to hearing Tests, +10 to be hit from flank/rear, one removed every other Round. Recommend rewrite.
- **Fatigued:** data says "Movement −1 per level." RAW (Core p.168): −10 to **all** Tests per level. Recommend rewrite (the Movement wording is an invented mechanic).
- **Entangled:** data says −20 to movement Tests. RAW (Core p.167): −10. Minor.
- **Ablaze `removedBy`** still says "Agility test" while the (correct) description says Athletics; RAW is Athletics. Minor text inconsistency.

These do not affect the audited new features but violate the rules-compliance steering ("never invent mechanics"). Recommend correcting the data text to the rulebook wording.

### Finding C2 (minor, pre-existing) — casting success does not explicitly require the test to pass
`resolveCastingResult`: `castSuccess = totalPower || slAchieved >= cn`. For a CN 0 petty spell, a *failed* roll whose tens digit equals the target's tens digit yields SL 0 ≥ 0 and would read as success. In practice auto-failure (96–00) forces SL ≤ −1, and most fails produce negative SL, so this rarely bites — but the Core p.234 sequence is "pass the Language (Magick) Test, **then** match SL to CN." Recommend gating on `rollResult.passed` as well. Low severity.

### Finding C3 (minor, pre-existing) — Damaging + min1Wound branch drops the Damaging bonus
`AttackFlow.tsx` computes `effectiveSL` (Damaging = max(units, SL)) for `totalDamage`/`netWounds`, but the min-1 branch calls `calculateDamage(weaponDamage.num ?? 0, sl, …)` with the **raw** `sl`, not `effectiveSL`. Only matters when a Damaging weapon + the min1Wound house rule + damage exceeds reduction coincide; the displayed `netWounds` already uses `effectiveSL`, so impact is narrow. Recommend passing `effectiveSL` for consistency.

---

## Rulebook ambiguities (flagged, not ruled on)
1. **Poisoned wound-loss stacking** (Finding P): flat 1 vs per-level is genuinely ambiguous given the general penalty-stacking rule; RAW-literal is flat 1.
2. **GM-set difficulties** (reminders): Fear/Terror/Frenzy/Animosity/Hatred/Prejudice/Phobia and the Broken/Ablaze removal tests have circumstance- or GM-set difficulty. The app seeds Challenging (+0) as an adjustable default — reasonable and documented, not RAW-fixed.
3. **Errata not verifiable:** `docs/Errata.pdf` is a binary PDF and could not be read here; any errata overrides (including a possible extended XP table) were not cross-checked. All other supplements (`Up_In_Arms.md`, `windsofmagic.md`, `archivesoftheempire*.md`, dwarf/high-elf guides) are markdown and were available.

---

## Conclusions & recommendations (priority order)
1. **Fix Poisoned end-of-turn damage** to a flat −1 (Finding P), after confirming the stacking interpretation with the user. This is the only new correctness bug.
2. **Correct `conditions.ts` description/stackable text** for Broken (stackable + no Stunned), Deafened, Fatigued, Entangled, and the Ablaze `removedBy` (Finding C1) to match RAW — removes invented mechanics from the data layer.
3. **Minor:** gate `castSuccess` on `rollResult.passed` (C2); pass `effectiveSL` in the min-1 damage branch (C3).
4. **Document** the 51–70+ XP rows and the L5=25 threshold as explicit app conventions (already commented; keep).
5. The four new features are compliant and can ship as-is from a rules standpoint.

**Verification performed:** read the current source for every audited area; cross-referenced Core pp.36–37, 44–48, 143–169, 190, 234–238, 293, 297–299; ran `npx vitest run` on the eight relevant test files → **360 passed**. No source files were modified.
