# Rules Compliance Audit Report (Refreshed)

A comprehensive cross-reference of all game-mechanics logic in the app against the WFRP 4e Core Rulebook, Up In Arms, Winds of Magic, Archives of the Empire, and the Dwarf / High Elf Player's Guides.

> **This report supersedes the prior audit.** The earlier version flagged Ablaze, Stunned, combat-damage SL, ranged ½SB, opposed-test tie-break, and magic-missile damage as broken. **Those have since been fixed in the source.** This re-run re-read the present code, confirms each former issue's current status, and adds audits for the four newly shipped features (attack-consequences pipeline, proactive reminders, advancement planner, GM read-only share/export). Page citations are from `docs/WarhammerFantasyRoleplay4e.md`. `docs/Errata.pdf` is a binary PDF and could not be read in this environment — noted where relevant.

Verified by reading the current source and running `npx vitest run` on the eight relevant test files (end-of-turn, reminders, attack-consequences, advancement-planner, sheet-totals, combat, dice-roller, spell-casting): **360 tests passing**.

---

## Summary

| Category | Status | Notes |
|----------|--------|-------|
| Dice Rolling & SL | ✅ Compliant | — |
| Opposed Tests (tie-break) | ✅ Compliant | **Fixed** — now breaks ties on tested skill/characteristic (Core p.153) |
| Wound Formula | ✅ Compliant | — |
| XP Advancement Costs | ✅ Compliant | 0–50 exact (Core p.44); 51–70+ is a documented app convention |
| Combat Damage (SL) | ✅ Compliant | **Fixed** — `Damage = WeaponDamage + SL − (AP+TB)`, min 1 (Core p.159) |
| Ranged Damage (½SB) | ✅ Compliant | **Fixed** — RAW formula; ½SB is now an opt-in house rule, default off |
| Armour Stacking / Worn Filter | ✅ Compliant | — |
| Off-Hand Penalty | ✅ Compliant | — |
| Conditions — Bleeding | ✅ Compliant | — |
| Conditions — Ablaze | ✅ Compliant | **Fixed** — 1d10 + (level−1) − TB − lowestAP, min 1 (Core p.166–167) |
| Conditions — Stunned | ✅ Compliant | **Fixed** — Endurance-test reminder, stackable (Core p.169) |
| Conditions — Poisoned (end-of-turn damage) | ❌ Non-Compliant | **New bug** — subtracts per-level; RAW is flat 1 (Core p.168–169) |
| Conditions — data text (Broken/Deafened/Fatigued/Entangled) | ⚠️ Partially Compliant | Pre-existing description inaccuracies |
| Spell Casting (success gate) | ⚠️ Partially Compliant | Minor — does not explicitly require test pass |
| Channelling | ✅ Compliant | — |
| Magic Missile Damage | ✅ Compliant | **Fixed** — listed damage + SL only (Core p.236) |
| Overcasting | ✅ Compliant | Winds of Magic table |
| Miscast Triggers | ✅ Compliant | Critical/fumble/channelled-fail (Core p.235) |
| Fortune/Resolve | ✅ Compliant | — |
| Critical Wounds | ✅ Compliant | — |
| Corruption | ✅ Compliant | — |
| Psychology | ✅ Compliant | — |
| Initiative | ✅ Compliant | — |
| Weapons | ✅ Compliant | — |
| Runes / Grudges (Dwarf) | ✅ Compliant | — |
| Yenlui / Sword-Dancing (High Elf) | ✅ Compliant | — |
| Diseases | ✅ Compliant | — |
| **NEW:** Attack→Damage→Condition pipeline | ✅ Compliant | Pummel/Hack cite Core p.298; crit parsing from data |
| **NEW:** Proactive reminders | ✅ Compliant | Tests/characteristics match Core pp.189–191 |
| **NEW:** Advancement planner | ✅ Compliant | Uses real Core p.44–48 costs; read-only |
| **NEW:** GM read-only share/export | ✅ Compliant | Reuses live calculators; no forked formulas |

---

## Fixed Since the Prior Audit (re-verified against current source)

### Ablaze — ✅ now Compliant (was ❌ critical)
**Core p.166–167:** 1d10 Wounds, modified by TB and the AP on the least-protected location, min 1; each extra Ablaze adds +1 (three Ablaze = 1d10+2).
`end-of-turn.ts`:
```ts
const rawDamage = d10Roll + (ablaze.level - 1) - tb - lowestAP;
const finalDamage = Math.max(1, rawDamage);
```
Matches RAW, supports an injected d10 for deterministic / one-tap rolling. `conditions.ts` description updated to the correct formula.

### Stunned — ✅ now Compliant (was ❌ critical)
**Core p.169:** Challenging (+0) Endurance Test at end of each Round, each SL removing an extra. Stunned stacks.
`end-of-turn.ts` no longer auto-removes Stunned — it emits a reminder via `conditionReminderText('Stunned')`. `conditions.ts`: `stackable: true, maxLevel: 10`.

### Combat damage SL — ✅ now Compliant (was ❌ critical)
**Core p.159:** `Damage = Weapon Damage + SL`; `Wounds Suffered = Damage − (TB + AP)`; min 1.
`combat.ts calculateDamage(weaponDamage, sl, targetAP, targetTB, options)` adds `sl`, floors at 1, and correctly implements Undamaging (double AP, no min-1; p.299) and Robust (−1/level; p.143). `AttackFlow.tsx` passes the real roll SL.

### Ranged damage ½SB — ✅ now Compliant (was ⚠️)
`calculateDamage` no longer halves SB and no longer takes `isRanged`. Ranged damage comes from `weapons.ts calcWeaponDamage` using the weapon's own formula (Core p.293). ½SB is an explicit house rule (`rangedDamageSBMode`), default `'none'` (RAW).

### Opposed-test tie-break — ✅ now Compliant (was ⚠️)
**Core p.153:** highest SL wins; on equal SL the higher tested Skill/Characteristic wins.
`dice-roller.ts calculateOpposedResult` breaks SL ties on `playerTarget`/`opponentTarget` (not the raw roll). Comment: "Roll values are NOT used as a tie-breaker."

### Magic missile damage — ✅ now Compliant (was ⚠️)
**Core p.236:** the SL is added to the spell's listed Damage.
`computeMagicMissileDamage = parseDamageFromEffect(effect, wpBonus, tbBonus) + castingSL`. The erroneous extra `+ wpBonus` is gone; `parseDamageFromEffect` already resolves `Dmg WPB`/`Dmg TB` from the listed value.

### Miscast on critical cast — ✅ Compliant (confirmed)
**Core p.235:** critical cast works but generates a Minor Miscast unless Instinctive Diction. `resolveCastingResult` implements this and also the Winds of Magic mandatory Minor Miscast on a failed channelled cast.

### Extended XP table — ✅ core exact, extension documented
**Core p.44:** 0–50 only. `advancement.ts` reproduces 0–50 exactly for both characteristics and skills; talent `100×(taken+1)` (p.45); out-of-career doubling (p.46); thresholds 5/10/15/20 + app L5=25 (p.48); leave-career 100/200 (p.48). The 51–70+ rows are an app extrapolation, clearly labelled. (Errata PDF unreadable — a possible errata table was not cross-checked.)

---

## NEW FEATURE — Attack → Damage → Condition Pipeline (`attack-consequences.ts`)

| Mechanic | Rulebook | Implementation | Status |
|----------|----------|----------------|--------|
| Pummel → Stunned | Core p.298: Head hit → Opposed Str/End test; win → Stunned | Suggested only on Head hit, `testGated: true`, not auto-applied | ✅ Compliant |
| Hack → armour damage | Core p.298: Damage a struck armour/shield by 1 | Emitted as advisory, never a condition | ✅ Compliant |
| Crit-wound conditions | Authored effect prose in `critical-wound-tables.ts` | Verb-independent parse of "[N] <Condition> Condition(s)", clamped to maxLevel, matched against `CONDITIONS` | ✅ Compliant |
| Defend hand-off | Core p.159 two-step | Keeps weapon-damage and SL separate to avoid double-counting SL | ✅ Compliant |

Notes: Pummel/Hack detection handles `"X or Y"` choice-quality groups (e.g. Warhammer, Pollaxe). The crit-condition regex is generated from the `CONDITIONS` data, so it cannot drift. No new mechanics are invented — every suggestion traces to Core p.298 or authored crit-table prose.

## NEW FEATURE — Proactive Reminders (`reminders.ts`)

| Reminder | Test (characteristic) | Difficulty | Citation | Status |
|----------|-----------------------|------------|----------|--------|
| Stunned (remove) | Endurance (T) | Challenging (+0) | Core p.169 | ✅ |
| Poisoned (remove) | Endurance (T) | Challenging (+0), poison sets it | Core p.168–169 | ✅ |
| Broken (rally) | Cool (WP) | circumstance-set, seeded +0; cannot rally while Engaged | Core p.167–168 | ✅ |
| Ablaze (extinguish) | Athletics (Ag) | circumstance-set, seeded +0 | Core p.166–167 | ✅ |
| Blinded / Deafened | — (informational) | 1 level every other round | Core p.167–168 | ✅ |
| Fear | Cool (WP), Extended | GM-set, seeded +0 | Core p.190 | ✅ |
| Terror | Cool (WP) | GM-set, seeded +0 | Core p.190 | ✅ |
| Frenzy | **Willpower (bare characteristic)** | GM-set, seeded +0 | Core p.190 | ✅ |
| Animosity / Hatred / Prejudice / Phobia | Cool (WP) | GM-set, seeded +0 | Core p.189–191 | ✅ |
| Trauma | — (informational) | GM discretion | Core p.191 | ✅ |

**Frenzy** correctly resolves against **bare Willpower**, not the Cool skill (git `1684e51`) — matches Core p.190 "Willpower Test." Condition descriptions are the single source of truth consumed by `end-of-turn.ts`; psychology descriptions are the verbatim `PSYCHOLOGY_REMINDERS` strings. Where the rulebook leaves difficulty to the GM/circumstances, seeding Challenging (+0) as an adjustable default is a flagged convenience, not an invented fixed TN. **Verdict: ✅ Compliant.**

## NEW FEATURE — Advancement Planner (`advancement-planner.ts`)

Read-only projection; mutates nothing and spends no XP. Costs come from the real `getAdvancementCost` (Core pp.44–45 tiered table + out-of-career doubling), thresholds from `CAREER_COMPLETION_THRESHOLDS` (Core p.48: 5/10/15/20, app L5=25), level-change fee from `ADVANCE_LEVEL_FEE` (100 ready / 200 not-ready, Core p.48), talent step `getAdvancementCost('talent', 0, true)` = 100 (Core p.45). Skill minimisation targets concrete character rows 1:1 (maps onto `advanceSkill`); wildcard `(Any)` skills are surfaced as advisories rather than auto-costed; `met` flags mirror `isCareerLevelComplete`. **No invented mechanics. Verdict: ✅ Compliant.**

## NEW FEATURE — GM Read-Only Share/Export (`sheet-totals.ts` + `SharedCharacterViewer.tsx`)

`deriveSheetTotals` reuses the live calculators (does not fork formulas):

| Derived total | Source function | Rulebook |
|---------------|-----------------|----------|
| Wounds | `computeWoundMaximum` (SB + 2×TB + WPB ×multiplier + Hardy×TB) | Core p.36–37 |
| Armour points (worn only) | `calculateArmourPointsUnified(..., filterByWorn:true)` | Core p.293 / Archives III |
| Max encumbrance | `calculateMaxEncumbrance` (SB+TB + Strong Back×1 + Sturdy×2) | Core p.293 / p.146 |
| Coin weight | `calculateCoinWeight` (`floor((gc+ss+d)/200)`) | Core p.293 |
| Weapon damage | `calcWeaponDamage` (same `rangedDamageSBMode` as live sheet) | Core p.293 |

The viewer shows these verbatim with a breakdown Tooltip on every calculated total (satisfies the calculated-total-tooltips steering rule), performs no storage writes except the confirm-gated import, and shows Movement as the stored value. **Verdict: ✅ Compliant** — totals match the rulebook formulas and the live calculators by construction.

---

## Outstanding Non-Compliance

### 1. Poisoned end-of-turn damage — per-level, should be flat 1 (NEW BUG) ❌
`end-of-turn.ts`:
```ts
const poisoned = conditions.find(c => c.name === 'Poisoned');
if (poisoned) { newWounds -= poisoned.level; }   // ← per-level
```
**Core p.168–169 (Poisoned):** "At the end of each Round, **lose 1 Wound, ignoring all modifiers**." The text states a flat 1 Wound. Unlike Bleeding — whose stacking is stated explicitly ("three Bleeding Conditions … 3 Wounds per Round") — Poisoned does not declare the wound loss scales per Condition.
**Recommended fix:** subtract a flat `1` (keep inside the `currentWounds > 0` guard).
**Ambiguity:** whether multiple Poisoned Conditions stack the 1-Wound loss is debatable under the general penalty-stacking rule (Core p.166). RAW-literal (flat 1) is the safer reading; confirm with the user. The Errata (unreadable binary PDF) may clarify.
Also: the Poisoned **−10 to all Tests** penalty is not modelled in condition processing (pre-existing informational gap).

### 2. `conditions.ts` description/stackable text ⚠️ (pre-existing, data layer)
- **Broken:** `stackable: false` and "gain the Stunned condition" are wrong. RAW (Core p.167–168): Broken **stacks** (Terror inflicts Broken equal to Rating; "each SL removing an extra Broken"), and grants no Stunned. → set `stackable: true`, fix text to flee / −10 / Cool-to-rally (cannot rally while Engaged).
- **Deafened:** "hearing tests auto-fail / may be Surprised" is wrong. RAW (Core p.168): −10 to hearing Tests, +10 to be hit from flank/rear, one removed every other Round.
- **Fatigued:** "Movement −1 per level" is invented. RAW (Core p.168): −10 to **all** Tests per level.
- **Entangled:** −20 should be −10 to movement Tests (Core p.167).
- **Ablaze `removedBy`** says "Agility test" but the description (correctly) says Athletics; RAW is Athletics.
These violate the "never invent mechanics" steering rule and should be corrected to the rulebook wording.

### 3. Casting success does not explicitly require the test to pass ⚠️ (minor, pre-existing)
`resolveCastingResult`: `castSuccess = totalPower || slAchieved >= cn`. Core p.234 is "pass the Language (Magick) Test, **then** match SL to CN." For a CN 0 petty spell, a failed roll with SL 0 would read as success. Rare in practice (auto-fail forces SL ≤ −1). Recommend also gating on `rollResult.passed`.

### 4. Damaging + min1Wound branch drops the Damaging bonus ⚠️ (minor, pre-existing)
`AttackFlow.tsx` uses `effectiveSL` (Damaging = max(units, SL)) for display but calls `calculateDamage(..., sl, ...)` with raw `sl` in the min-1 branch. Narrow impact (Damaging + min1Wound + damage exceeds reduction). Recommend passing `effectiveSL`.

---

## Compliant Areas (spot-checked, unchanged)

- **Dice rolling (`dice-roller.ts`):** SL = tens(target) − tens(roll); auto-success 01–05 (min +1 SL); auto-failure 96–00 (max −1 SL); doubles → crit/fumble; difficulty table Very Easy +60 … Very Hard −30. Core p.151–153.
- **Wounds (`calculators.ts`):** SB + 2×TB + WPB; Halflings/Elves per species; Ogre ×2; Hardy ×TB. Core p.36–37.
- **Armour (`calculators.ts` / `armourLayering.ts`):** worn-only filter; Archives III layering; rune AP. Core p.293 / Archives III.
- **Off-hand (`combat.ts`):** −20, reduced by Ambidextrous (−10 / 0); Dual Wielder does not reduce it. Core p.132/134.
- **Fortune/Resolve, Channelling, Overcasting (Winds of Magic), Corruption, Psychology, Initiative, Weapons (incl. Strike Mighty Blow p.145, Accurate Shot p.145/132), Runes, Grudges, Yenlui, Sword-Dancing, Diseases:** all re-confirmed compliant.
- **Critical-wound modifier (`combat.ts`):** −20 to the crit roll when excess damage < TB (Core p.172).

---

## End-of-Turn Processing Audit (current)

| Rule | Rulebook | App (`processEndOfTurn`) | Status |
|------|----------|--------------------------|--------|
| Bleeding: 1 wound per Condition, ignoring modifiers | Core p.167 (stacking explicit) | `newWounds -= bleeding.level` | ✅ |
| Ablaze: 1d10 + (extras) − TB − lowestAP, min 1 | Core p.166–167 | `d10 + (level−1) − tb − lowestAP`, min 1 | ✅ |
| Stunned: Endurance Test to remove | Core p.169 | Emits reminder (no auto-remove) | ✅ |
| Surprised: removed end of Round / after first attack | Core p.169 | Auto-removed | ✅ |
| Poisoned: lose 1 Wound, ignoring modifiers | Core p.168–169 | `newWounds -= poisoned.level` | ❌ should be flat 1 |
| Broken / Blinded / Deafened: per-round handling | Core p.167–168 | Emit reminders | ✅ (reminders) |
| Skip damage when already at 0 wounds | — | Guarded by `currentWounds > 0` | ✅ |

---

## Conditions Data Accuracy (current)

| Condition | Stackable (App) | Stackable (RAW) | Notes |
|-----------|-----------------|-----------------|-------|
| Ablaze | ✅ true | ✅ true | Damage formula now correct; `removedBy` text says Agility, should be Athletics |
| Bleeding | ✅ true | ✅ true | ✅ |
| Blinded | ✅ true | ✅ true | ✅ |
| Broken | ❌ false | ✅ **true** | Should stack; text invents a Stunned side-effect |
| Deafened | ✅ true | ✅ true | Description wrong (auto-fail/Surprised) |
| Entangled | ❌ false | ❌ false | Penalty should be −10 not −20 |
| Fatigued | ✅ true | ✅ true | Description says Movement −1/level; RAW is −10 to all Tests |
| Poisoned | ✅ true | ✅ true | End-of-turn damage per-level (should be flat 1); −10 penalty not modelled |
| Prone | ❌ false | ❌ false | ✅ |
| Stunned | ✅ true | ✅ true | ✅ (fixed) |
| Surprised | ❌ false | ❌ false | ✅ |
| Unconscious | ❌ false | ❌ false | ✅ |

---

## Errata Check

`docs/Errata.pdf` is a binary PDF and **could not be read** in this environment, so errata overrides were not cross-checked (including any extended XP table). All markdown supplements were available. Weapon damage values in `src/data/weapons.ts` match the Core p.293 tables (bows `+SB+N` full SB; slings/blackpowder flat; throwing `+SB+N`). The ½SB-for-ranged behaviour is an **opt-in house rule** (`rangedDamageSBMode`), default `'none'` (RAW) — not an errata correction.

---

## Recommendations (priority order)

1. **Fix Poisoned end-of-turn damage** to flat −1 (confirm stacking interpretation with the user first).
2. **Correct `conditions.ts` text/stackable** for Broken, Deafened, Fatigued, Entangled, and the Ablaze `removedBy` to match RAW.
3. Minor: gate `castSuccess` on `rollResult.passed`; pass `effectiveSL` in the min-1 damage branch.
4. Keep documenting the 51–70+ XP rows and L5=25 threshold as app conventions.
5. The four new features are rules-compliant and can ship as-is.

---

*Report refreshed from a full re-read of the current `src/logic/` and `src/data/` source against `docs/WarhammerFantasyRoleplay4e.md` and the available markdown supplements. Supersedes the prior audit. Errata PDF not machine-readable.*
