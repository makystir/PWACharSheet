# Rules Compliance Audit Report

A comprehensive cross-reference of all game mechanics logic in the app against the WFRP 4e Core Rulebook, Up In Arms, Dwarf Player's Guide, and High Elf Player's Guide.

---

## Summary

| Category | Status | Issues |
|----------|--------|--------|
| Dice Rolling & SL | ✅ Compliant | 1 minor |
| Opposed Tests | ⚠️ Non-Compliant | 1 issue |
| Wound Formula | ✅ Compliant | 0 |
| XP Advancement Costs | ⚠️ Partially Compliant | 1 issue |
| Combat Damage | ⚠️ Non-Compliant | 2 issues |
| Armour Stacking | ✅ Compliant | 0 |
| Off-Hand Penalty | ✅ Compliant | 0 |
| Conditions (Bleeding) | ✅ Compliant | 0 |
| Conditions (Ablaze) | ❌ Non-Compliant | 1 critical |
| Conditions (Stunned) | ⚠️ Partially Compliant | 1 issue |
| Spell Casting | ⚠️ Partially Compliant | 2 issues |
| Channelling | ✅ Compliant | 0 |
| Magic Missile Damage | ⚠️ Non-Compliant | 1 issue |
| Overcasting | ✅ Compliant | 0 |
| Miscast Triggers | ⚠️ Non-Compliant | 1 issue |
| Fortune/Resolve | ✅ Compliant | 0 |
| Critical Wounds | ✅ Compliant | 0 |
| Corruption | ✅ Compliant | 0 |
| Psychology | ✅ Compliant | 0 |
| Initiative | ✅ Compliant | 0 |
| Weapons | ✅ Compliant | 0 |
| Runes (Dwarf) | ✅ Compliant | 0 |
| Grudges (Dwarf) | ✅ Compliant | 0 |
| Yenlui (High Elf) | ✅ Compliant | 0 |
| Sword-Dancing (High Elf) | ✅ Compliant | 0 |
| Diseases | ✅ Compliant | 0 |

---

## Critical Non-Compliance Issues

### 1. Bleeding Condition — Damage Per Level is WRONG

**Rulebook (p. 167):** "Lose 1 Wound at the end of every Round, ignoring all modifiers."

Multiple Bleeding conditions stack: "if you have three Bleeding Conditions, you're losing a worrying 3 Wounds per Round."

**App Implementation (`end-of-turn.ts`):**
```typescript
const bleeding = conditions.find(c => c.name === 'Bleeding');
if (bleeding) {
  newWounds -= bleeding.level;  // ← Treats level as damage
}
```

**Issue:** The app correctly does `level × 1 Wound` per round. However, the Bleeding description in `conditions.ts` says "Lose 1 Wound per level at end of round" which matches the stacking interpretation. This is **actually correct** since each Bleeding Condition level represents multiple stacked Bleeding conditions.

**However**, the rulebook says damage from Bleeding "ignores all modifiers" — meaning TB and AP should NOT reduce it. The app's `processEndOfTurn` function applies raw wound loss without TB/AP reduction, which is **correct**.

**REVISED VERDICT: ✅ Compliant** — the Bleeding implementation is correct.

### 2. Ablaze Condition — Damage Calculation is WRONG

**Rulebook (p. 167):** "At the end of every Round, you suffer **1d10 Wounds, modified by Toughness Bonus and the Armour Points on the least protected Hit Location**, with a minimum of 1 Wound suffered. Each extra Ablaze Condition you have adds +1 to the Damage suffered."

So for 3 Ablaze conditions: (1d10 + 2) - TB - lowest_AP, minimum 1.

**App Implementation (`end-of-turn.ts`):**
```typescript
const ablaze = conditions.find(c => c.name === 'Ablaze');
if (ablaze) {
  newWounds -= ablaze.level;  // ← Simply subtracts level as damage
}
```

**Issue:** The app treats Ablaze the same as Bleeding (flat damage = level). Per the rulebook, Ablaze damage is:
- **1d10 + (level - 1)** base damage (first condition = 1d10, each extra adds +1)
- **Reduced by TB and lowest AP**
- **Minimum 1 wound**

The app is missing:
1. The 1d10 roll
2. TB/AP reduction
3. The minimum 1 damage floor
4. The +1 per extra condition (not per level)

**Severity: HIGH** — Ablaze damage is significantly miscalculated.

**Also note:** The `conditions.ts` description says "Lose 1 Wound per level at end of round" which contradicts the rulebook. Should be updated.

---

### 3. Stunned Condition Removal — AUTO-REMOVAL IS WRONG

**Rulebook (p. 168):** "At the end of each Round, you may attempt a **Challenging (+0) Endurance** Test. If successful, remove a Stunned Condition, with each SL removing an extra Stunned Condition."

Stunned is NOT auto-removed. It requires an Endurance Test each round.

**App Implementation (`end-of-turn.ts`):**
```typescript
const stunned = conditions.find(c => c.name === 'Stunned');
if (stunned) {
  removedConditions.push('Stunned');
  effects.push({ type: 'remove_condition', condition: 'Stunned', description: 'Stunned removed automatically' });
}
```

**Issue:** The app auto-removes Stunned at end of turn. Per RAW, Stunned requires an Endurance Test to remove and can stack. The app also incorrectly marks Stunned as non-stackable (`stackable: false`) in `conditions.ts`.

**Rulebook confirms Stunned stacks:** "if you have three Bleeding Conditions... if you have 3 Fatigued Conditions" and critical wound tables frequently inflict "3 Stunned Conditions" or "1d10 Stunned Conditions."

**Severity: HIGH** — Stunned auto-removal makes combat significantly easier than intended.

---

## Major Non-Compliance Issues

### 4. Opposed Test Tie-Breaking — WRONG IMPLEMENTATION

**Rulebook (p. 153):** "The party with the highest SL wins the Test. If both participants score the same SL, the party with the **higher tested Skill or Characteristic** wins."

**App Implementation (`dice-roller.ts`):**
```typescript
if (netSL === 0) {
  // Tie-breaker: higher roll wins when net SL = 0
  if (clampedPlayerRoll > clampedOpponentRoll) {
    winner = 'player';
  } else if (clampedOpponentRoll > clampedPlayerRoll) {
    winner = 'opponent';
  } else {
    winner = 'tie';
  }
}
```

**Issue:** The app uses the higher **roll value** as the tiebreaker. The rulebook says the higher **tested Skill or Characteristic** (i.e., the higher target number) wins. This is fundamentally different — the rulebook rewards the more skilled character, while the app rewards the character who rolled higher.

**Severity: MEDIUM** — affects opposed test outcomes in edge cases.

### 5. Combat Damage Formula — MISSING SL COMPONENT

**Rulebook (p. 159):** "Damage = Weapon Damage + SL"

Where Weapon Damage for melee = SB + weapon bonus.
Then: "Wounds Suffered = Damage – opponent's (Toughness Bonus + Armour Points)"

**App Implementation (`combat.ts`):**
```typescript
export function calculateDamage(
  weaponBonus: number, SB: number, targetAP: number, targetTB: number, isRanged: boolean
): number {
  const effectiveSB = isRanged ? Math.floor(SB / 2) : SB;
  return Math.max(0, effectiveSB + weaponBonus - (targetAP + targetTB));
}
```

**Issue:** The function does **not include the attack SL** in the damage calculation. Per RAW, damage = SB + weapon bonus + SL - (AP + TB). The SL from the opposed test is a critical component.

Additionally, for ranged weapons, the rulebook does NOT halve SB. Ranged weapon damage is a flat number (e.g., "+4") not modified by SB at all unless the weapon formula explicitly includes it (e.g., Throwing weapons use "SB×2" for range calculation, and some use SB in damage).

**Severity: HIGH** — missing SL makes all damage calculations lower than RAW.

### 6. Ranged Weapon Damage Formula — INCORRECT

**Rulebook (p. 293, Weapon tables):** Ranged weapon damage is listed as a flat value (e.g., Longbow = SB+4, Handgun = 9, Crossbow = 9). There is no universal "halve SB for ranged" rule.

**App Implementation (`combat.ts`):**
```typescript
const effectiveSB = isRanged ? Math.floor(SB / 2) : SB;
```

**Issue:** The app assumes all ranged weapons use half SB. In RAW:
- Bows use SB+X (full SB)
- Blackpowder/Crossbows use flat damage (no SB)
- Throwing weapons use SB+X or SB×2

The `weapons.ts` file handles this correctly for display purposes (`calcWeaponDamage` parses the formula), but `combat.ts` applies a blanket half-SB rule that doesn't match the rulebook.

**Severity: MEDIUM** — the `weapons.ts` module is correct, but `combat.ts` disagrees with it.

### 7. Magic Missile Damage — INCORRECT FORMULA

**Rulebook (p. 236):** "The SL of the Language (Magick) Test is added to the spell's listed Damage."

So: Magic Missile Damage = Spell's listed damage value + Casting SL

The damage value is then applied like normal damage (reduced by TB and AP of the hit location).

**App Implementation (`spell-casting.ts`):**
```typescript
export function computeMagicMissileDamage(spell: SpellItem, wpBonus: number, castingSL: number): number {
  const baseDamage = parseDamageFromEffect(spell.effect, wpBonus);
  return baseDamage + wpBonus + castingSL;
}
```

**Issue:** The app adds **wpBonus** to the magic missile damage. The rulebook does NOT add WP Bonus to magic missile damage. Spell damage is: `listed_damage + SL`. Some spells list their damage as "Dmg +4" which is the flat bonus value, not WP-relative.

However, looking more carefully at specific spells like "Bolt" (Arcane): "Damage +5" — this means the damage value is 5 + SL. The app adds WPB which is incorrect.

**Exception:** Some specific spells have damage of "WPB" explicitly (like Dart from Lore of Death: "Damage equal to your Willpower Bonus"). For these, WPB is correct, but it's already encoded in the listed damage, not added on top.

**Severity: MEDIUM** — magic missiles deal more damage than they should.

### 8. Miscast Trigger on Critical Cast — DEBATABLE

**Rulebook (p. 235):** "If you roll a Critical when casting, the spell works, but something else has also occurred! When you score a Critical Casting, your spell still works as normal, but also generates a Minor Miscast, unless you have the Instinctive Diction Talent."

**App Implementation (`spell-casting.ts`):**
```typescript
const triggerMinorMiscast =
  (isCriticalCast && !hasInstinctiveDiction(character)) || isFumbledCast;
```

**Issue:** This is actually correct per the rulebook — critical cast triggers minor miscast unless Instinctive Diction is present, and fumble triggers miscast too.

**REVISED VERDICT: ✅ Compliant**

### 9. Casting Success Condition — INCORRECT

**Rulebook (p. 234):** "If you succeed [the Language (Magick) Test], match your SL to the Casting Number. If your SL is **equal to or higher** than the CN, it is cast."

Note: You must **first pass the test** (roll ≤ target), THEN check SL ≥ CN.

**App Implementation (`spell-casting.ts`):**
```typescript
const castSuccess = totalPower || slAchieved >= cn;
```

**Issue:** The app only checks `slAchieved >= cn` but does not separately verify `rollResult.passed`. If a caster fails the test (rolls over target), even if the SL arithmetic happens to equal the CN due to rounding quirks, the spell should fail. In practice, a failed test always produces negative SL, so this edge case may never actually occur in the app. However, the logic doesn't explicitly enforce "test must pass first."

**Severity: LOW** — unlikely to produce incorrect results in practice, but architecturally incorrect.

---

## XP Advancement Cost Table

### 10. Cost Table Caps at 50 Advances — Missing Higher Tiers

**Rulebook (p. 44):** The printed table only goes up to "46-50" for both characteristics and skills.

**App Implementation (`advancement.ts`):**
```typescript
const CHAR_COST_TABLE: [number, number][] = [
  [5, 25], [10, 30], [15, 40], [20, 50], [25, 70], [30, 90], [35, 120],
  [40, 150], [45, 190], [50, 230], [55, 280], [60, 330], [65, 390], [70, 450],
];
const CHAR_MAX_COST = 520; // 70+
```

**Issue:** The app extends the table beyond what the rulebook provides (51-55: 280, 56-60: 330, 61-65: 390, 66-70: 450, 70+: 520). The rulebook says "There is no upper limit to the number of Characteristic Advances that can be purchased, although higher levels do become prohibitively expensive" but does NOT provide costs beyond 50.

The extended costs appear to follow a reasonable mathematical progression. This could be from an errata, community consensus, or house rule. The base table (0-50) matches the rulebook perfectly.

**Severity: LOW** — this is a reasonable extrapolation, and the core 0-50 range is correct. The "Errata.pdf" may contain the extended table.

---

## Compliant Areas (No Issues Found)

### Dice Rolling (dice-roller.ts)
- ✅ SL = tensDigit(target) - tensDigit(roll) — **matches rulebook exactly**
- ✅ Auto-success on 01-05: always pass, minimum +1 SL — **correct**
- ✅ Auto-failure on 96-00: always fail, maximum -1 SL — **correct**
- ✅ Doubles detection for criticals/fumbles — **correct**
- ✅ Critical = passed + double; Fumble = failed + double — **correct**
- ✅ Difficulty modifiers: Very Easy +60 through Very Hard -30 — **correct**
- ✅ Outcome descriptions match the Outcomes Table — **correct**

### Wound Formula (calculators.ts)
- ✅ Humans/Dwarves: SB + 2×TB + WPB — **matches rulebook p. 33**
- ✅ Halflings/Elves: 2×TB + WPB (no SB) — **matches Small trait and Elf species**
- ✅ Hardy talent: adds TB per level — **correct**
- ✅ Bonus calculation: floor(value / 10) — **correct**

### Armour Points (calculators.ts)
- ✅ Flexible armour can layer under non-flexible — **matches rulebook p. 297**
- ✅ Per location: highest non-flexible + highest flexible — **correct stacking rule**
- ✅ Rune bonuses applied correctly — **matches Dwarf Guide**
- ✅ Only worn items counted — **correct**

### Off-Hand Penalty (combat.ts)
- ✅ -20 penalty without Dual Wielder — **matches rulebook p. 163**
- ✅ No penalty with Dual Wielder — **correct**

### Fortune/Resolve System (fortune-resolve.ts)
- ✅ Spend Fortune: decrement by 1 — **correct**
- ✅ Spend Resolve: decrement by 1 — **correct**
- ✅ Burn Fate: permanently reduce Fate, clamp Fortune to new Fate — **correct**
- ✅ Burn Resilience: permanently reduce Resilience, clamp Resolve — **correct**
- ✅ Session reset: Fortune = Fate, Resolve = Resilience — **correct**
- ✅ Validation: pools cannot exceed base values — **correct**

### Channelling (spell-casting.ts)
- ✅ Extended test: accumulate SL towards spell CN — **matches rulebook p. 237**
- ✅ Ready when accumulated SL ≥ CN — **correct**
- ✅ On success with SL > 0: add SL to progress — **correct**
- ✅ Channelling target = WP + Channelling advances — **correct**

### Overcasting (spell-casting.ts)
- ✅ Overcast slots = floor((SL - CN) / 2) — **matches "for every +2 SL" rule**
- ✅ Options: Range, AoE, Duration, Targets — **correct categories**
- ✅ Self-only spells cannot extend Range/Targets — **correct**
- ✅ Touch spells cannot extend Range — **correct**
- ✅ Instant spells cannot extend Duration — **correct**

### Corruption (corruption.ts)
- ✅ Threshold = TB + WPB + Pure Soul level — **correct**
- ✅ Mutation type distribution per species — **matches rulebook p. 184**
- ✅ Physical mutation limit = TB — **correct**
- ✅ Mental mutation limit = WPB — **correct**
- ✅ Corruption loss on gaining mutation = WPB — **correct**

### Psychology (psychology.ts)
- ✅ All psychology types present: Animosity, Hatred, Fear, Terror, Frenzy, Prejudice — **correct**
- ✅ Reminders match rulebook effects — **correct**
- ✅ Fear/Terror require rating; Animosity/Hatred/Prejudice require target — **correct**

### Weapon Damage Display (weapons.ts)
- ✅ Correctly parses SB+N, ½SB+N, and flat damage formulas — **correct**
- ✅ Strike Mighty Blow for melee, Accurate Shot/Sure Shot for ranged — **correct talent bonuses**
- ✅ Dirty Fighting for Brawling — **correct**
- ✅ Engineering weapons classified by maxR presence — **correct**

### Grudge System (grudges.ts — Dwarf Guide)
- ✅ Standard grudges: 25 XP — **matches Dwarf Guide**
- ✅ Blood grudges: 50 XP — **matches Dwarf Guide**
- ✅ Party grudges capped at 3 — **matches Dwarf Guide**
- ✅ Dwarf-only visibility check — **correct**
- ✅ Validation of required fields — **correct**

### Yenlui System (yenlui.ts — High Elf Guide)
- ✅ Three states: Light, Balanced, Dark — **matches High Elf Guide**
- ✅ Dark state imposes Very Hard (-30) to sword-dancing — **correct**
- ✅ Sanctuary of the Mind level 3+ negates Dark penalty — **correct**
- ✅ Blood of Aenarion weekly Cool Test warning — **correct**
- ✅ Cadai Meditation daily opportunity note — **correct**
- ✅ Elf-only visibility check — **correct**

### Sword-Dancing (swordDancing.ts — High Elf Guide)
- ✅ XP cost scales by known techniques count — **correct**
- ✅ Requires Sword-dancing talent — **correct**
- ✅ XP check before learning — **correct**

### Rune System (runes.ts — Dwarf Guide)
- ✅ Rune validation per item type — **correct**
- ✅ Damage and AP bonuses from runes — **correct**
- ✅ Category-based availability — **correct**
- ✅ Characteristic bonuses from runes — **correct**
- ✅ Learning requirements check — **correct**

### Diseases (diseases.ts)
- ✅ Disease registry lookup — **correct**
- ✅ Symptom resolution — **correct**
- ✅ Active disease management (add/remove/notes) — **correct**

### Initiative (initiative.ts)
- ✅ Sort by initiative descending — **correct**
- ✅ Stable sort for equal initiatives — **correct per rulebook (GM decides ties)**
- ✅ Circular turn advancement — **correct**

---

## Errata Check (WFRP_Errata_28_Feb.pdf)

The Errata PDF is binary and could not be read directly. However, cross-referencing the core rulebook weapon tables (p. 293) confirms:

- **Bows**: `+SB+2` (Short Bow), `+SB+3` (Bow), `+SB+4` (Longbow/Elfbow) — **full SB, RAW**
- **Slings**: `+6` / `+7` (flat damage, no SB) — **correct**
- **Throwing**: `+SB+2` (Knife), `+SB+3` (Axe) — **full SB, RAW**

The app's `src/data/weapons.ts` matches these exactly. ✅

**Note:** The `WFRP-Character-Sheet (1).html` file in this repo contains a hardcoded **house rule** (½SB for ranged weapons), NOT an errata correction. That HTML file should NOT be used as a reference or source of truth. The app correctly implements the ½SB variant as an optional house rule toggle (`rangedDamageSBMode`) in the Settings page, defaulting to 'none' (RAW).

No weapon data changes are required.

---

## Recommendations for Fixes (Priority Order)

### Priority 1 — Critical Rule Violations

1. **Fix Ablaze damage calculation** — Needs 1d10 roll, TB/AP reduction, minimum 1 wound, +1 per extra condition. This requires UI interaction (dice roll or pre-rolled value injection).

2. **Fix Stunned condition** — Remove auto-removal. Make Stunned stackable (`stackable: true`). Add Endurance Test prompt at end of round instead of auto-removing.

3. **Fix combat damage formula** — Add SL parameter to `calculateDamage()`. The full formula should be: `Damage = WeaponDamage + SL - (AP + TB)`.

### Priority 2 — Major Rule Violations

4. **Fix Opposed Test tie-breaking** — Change from "higher roll wins" to "higher target number wins" when SL is tied.

5. **Fix ranged damage in combat.ts** — Remove blanket `Math.floor(SB / 2)` for ranged. Damage should come from the weapon formula directly (already correctly computed in `weapons.ts`).

6. **Fix magic missile damage** — Remove the extra WPB addition. Formula should be: `spell_listed_damage + casting_SL`.

### Priority 3 — Minor Issues

7. **Update conditions.ts descriptions** — Ablaze description should mention 1d10 + TB/AP interaction. Stunned should note Endurance Test requirement and stackability.

8. **Add explicit test-must-pass check** to casting resolution (low priority since negative SL prevents false positives in practice).

9. **Document extended XP table source** — Note whether advances 51-70+ costs come from errata or are house rules.

---

## Conditions Data Accuracy Audit

| Condition | Stackable (App) | Stackable (Rules) | Notes |
|-----------|----------------|-------------------|-------|
| Ablaze | ✅ true | ✅ true | Damage formula wrong (see above) |
| Bleeding | ✅ true | ✅ true | ✅ Correct |
| Blinded | ❌ false | ⚠️ true | Rulebook mentions stacking penalties |
| Broken | ✅ false | ✅ false | ✅ Correct |
| Deafened | ❌ false | ⚠️ true | Rulebook: multiple Deafened possible |
| Entangled | ✅ false | ✅ false | ✅ Correct |
| Fatigued | ✅ true | ✅ true | ✅ Correct |
| Poisoned | ❌ false | ⚠️ true | Rulebook: can have multiple Poisoned |
| Prone | ✅ false | ✅ false | ✅ Correct |
| Stunned | ❌ false | ❌ **true** | **WRONG** — Should be stackable |
| Surprised | ✅ false | ✅ false | ✅ Correct |
| Unconscious | ✅ false | ✅ false | ✅ Correct |

---

## End-of-Turn Processing Audit

| Rule | Rulebook | App | Status |
|------|----------|-----|--------|
| Bleeding: 1 wound per condition per round | Each Bleeding = 1 wound, ignoring modifiers | `newWounds -= bleeding.level` | ✅ Correct |
| Ablaze: 1d10 + (extras) - TB - lowest AP, min 1 | Complex formula with dice | `newWounds -= ablaze.level` | ❌ Wrong |
| Stunned: Endurance Test to remove | Requires test | Auto-removes | ❌ Wrong |
| Surprised: Removed after your turn | After your first turn | Auto-removes at end of round | ⚠️ Close enough (simplified) |
| Poisoned: 1 wound per round + Endurance Test | Lose 1W, test to remove | Not processed | ⚠️ Missing |
| Blinded: Removed every other round | One removed per 2 rounds | Not processed | ⚠️ Missing |
| Deafened: Removed every other round | One removed per 2 rounds | Not processed | ⚠️ Missing |
| Broken: Cool Test end of round | Test to remove | Not processed | ⚠️ Missing |

---

*Report generated from cross-referencing all logic files against WarhammerFantasyRoleplay4e.md, Up_In_Arms.md, dwarfguide.md, and highelfguide.md.*
