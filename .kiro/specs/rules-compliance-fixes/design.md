# Design Document: Rules Compliance Fixes

## Overview

This design addresses 10 rules compliance issues identified by auditing the app against WFRP 4e rules and the official errata. Fixes are grouped into three priority tiers:

1. **Critical** — Ablaze damage, Stunned auto-removal, combat damage missing SL
2. **Major** — Opposed test tie-breaking, ranged damage formula, magic missile damage
3. **Minor** — Condition stackability, missing end-of-turn processing, casting guard clause

All fixes target pure logic modules (`src/logic/`) and data files (`src/data/`), with minimal UI changes limited to passing new parameters and displaying corrected values. The existing architecture (pure functions + property tests) is preserved.

**Note:** The `WFRP-Character-Sheet (1).html` file in this repo contains hardcoded house rules (e.g., ½SB for ranged weapons) and is NOT a source of truth. The app's weapon data (`src/data/weapons.ts`) correctly uses full SB for bows per the printed rulebook (p. 293), with an optional house rule toggle for ½SB.

## Architecture

```
src/logic/end-of-turn.ts    ← Major rewrite (Ablaze formula, Stunned removal, Poisoned)
src/logic/combat.ts         ← Signature change (add SL, remove isRanged/half-SB)
src/logic/dice-roller.ts    ← Tie-breaking logic fix
src/logic/spell-casting.ts  ← Magic missile formula fix, casting guard
src/logic/weapons.ts        ← No changes (already correct per RAW)
src/data/conditions.ts      ← Stackability + description updates
src/data/weapons.ts         ← No changes (already correct per RAW)
src/components/combat/      ← Update callers to pass new params
```

## Detailed Design

### 1. End-of-Turn Rewrite (`src/logic/end-of-turn.ts`)

The `processEndOfTurn` function signature changes to accept additional parameters:

```typescript
export interface EndOfTurnParams {
  currentWounds: number;
  conditions: { name: string; level: number }[];
  currentRound: number;
  tb: number;              // NEW: Toughness Bonus for Ablaze reduction
  lowestAP: number;        // NEW: lowest AP across all locations for Ablaze
  injectedD10?: number;    // NEW: optional d10 roll for testability (1-10)
}

export function processEndOfTurn(params: EndOfTurnParams): EndOfTurnResult;
```

**Ablaze damage formula:**
```
d10Roll = injectedD10 ?? randomD10()
rawDamage = d10Roll + (ablazeLevel - 1) - tb - lowestAP
finalDamage = max(1, rawDamage)
```

**Stunned:** No longer auto-removed. Instead, an `EndOfTurnEffect` with type `'reminder'` is emitted:
```typescript
{ type: 'reminder', condition: 'Stunned', description: 'Endurance Test (Challenging +0) to remove' }
```

**Poisoned:** Treated like Bleeding — flat 1 wound per level, ignoring modifiers:
```typescript
newWounds -= poisonedLevel;
```

**Surprised:** Retains auto-removal (it IS removed after your turn per RAW).

**Blinded/Deafened/Broken:** Emit reminders only (removal requires tests or occurs on alternate rounds — too complex for automation).

### 2. Combat Damage (`src/logic/combat.ts`)

New signature:
```typescript
export function calculateDamage(
  weaponDamage: number,  // Pre-computed from calcWeaponDamage (includes SB per formula)
  sl: number,            // NEW: attack Success Levels
  targetAP: number,
  targetTB: number,
): number {
  const raw = weaponDamage + sl - (targetAP + targetTB);
  return Math.max(1, raw);  // Minimum 1 wound per RAW
}
```

Key changes:
- Removed `SB` param (already baked into `weaponDamage`)
- Removed `isRanged` param (no more blanket half-SB)
- Added `sl` param
- Minimum 1 wound (not 0) per RAW: "if this is 1 or less, your opponent loses 1 Wound"

**Callers:**
- `AttackFlow.tsx`: Pass the resolved SL from the attack roll and the pre-computed weapon damage
- `TakeDamagePanel.tsx`: Accept or compute SL from user input

### 3. Opposed Test Tie-Breaking (`src/logic/dice-roller.ts`)

```typescript
export function resolveOpposedTest(
  playerTarget: number,
  playerRoll: number,
  opponentTarget: number,
  opponentRoll: number
): OpposedTestResult {
  // ... existing SL resolution ...

  if (netSL === 0) {
    // FIXED: Higher SKILL wins, not higher roll
    if (playerTarget > opponentTarget) {
      winner = 'player';
    } else if (opponentTarget > playerTarget) {
      winner = 'opponent';
    } else {
      winner = 'tie';
    }
  }
}
```

### 4. Magic Missile Damage (`src/logic/spell-casting.ts`)

```typescript
export function computeMagicMissileDamage(
  spell: SpellItem,
  castingSL: number,
): number {
  const baseDamage = parseDamageFromEffect(spell.effect);
  return baseDamage + castingSL;
}
```

Key changes:
- Removed `wpBonus` parameter from the function signature
- `parseDamageFromEffect` extracts the listed numeric damage from the spell text
- For spells that list "Dmg WPB" or "Dmg TB", a separate overload or the caller resolves these to a number before calling

**Revised `parseDamageFromEffect`:**
```typescript
function parseDamageFromEffect(effect: string, wpBonus?: number, tbBonus?: number): number {
  const plusMatch = effect.match(/Dmg\s*\+?\s*(\d+)/i);
  if (plusMatch) return parseInt(plusMatch[1], 10);
  if (/Dmg\s+WPB/i.test(effect)) return wpBonus ?? 0;
  if (/Dmg\s+TB/i.test(effect)) return tbBonus ?? 0;
  return 0;
}
```

The caller (`resolveCastingResult`) passes wpBonus/tbBonus to `parseDamageFromEffect` to resolve the base damage, then just adds SL — no double-WPB.

### 5. Casting Guard Clause (`src/logic/spell-casting.ts`)

```typescript
// In resolveCastingResult:
const castSuccess = totalPower || (rollResult.passed && slAchieved >= cn);
```

Simple change: add `rollResult.passed &&` check.

### 5. Casting Guard Clause (`src/logic/spell-casting.ts`)

Changes:
- Stunned: `stackable: true`, `maxLevel: 10`
- Blinded: `stackable: true`, `maxLevel: 10`
- Deafened: `stackable: true`, `maxLevel: 10`
- Poisoned: `stackable: true`, `maxLevel: 10`
- Ablaze description updated
- Stunned description updated

## Testing Strategy

All logic changes are covered by property-based tests using fast-check:

1. **Ablaze damage property**: For any d10 ∈ [1,10], level ∈ [1,10], TB ∈ [0,10], AP ∈ [0,10]: result = max(1, d10 + level - 1 - TB - AP)
2. **Combat damage property**: For any weaponDmg ∈ [0,20], SL ∈ [-6,10], AP ∈ [0,10], TB ∈ [0,10]: result = max(1, weaponDmg + SL - AP - TB)
3. **Opposed test tie-break**: When SL equal, higher target wins; equal targets → tie
4. **Magic missile damage**: result = baseDamage + SL (no WPB added)
5. **End-of-turn Poisoned**: Same property as Bleeding (flat level damage)
6. **Condition stackability**: Applying Stunned/Blinded/Deafened/Poisoned increments level

## Migration Notes

- The `calculateDamage` signature change is breaking. All callers must be updated in the same PR.
- The `computeMagicMissileDamage` signature change removes a parameter — callers passing WPB will get a type error.
- End-of-turn signature change adds required params — callers must supply TB and lowestAP.
- The Surprised auto-removal behaviour is preserved (it IS correct per RAW).
- No data migration needed for character save files — condition levels are already stored as numbers.

## Components and Interfaces

### Modified Interfaces

#### `EndOfTurnEffect` (end-of-turn.ts)
```typescript
export interface EndOfTurnEffect {
  type: 'damage' | 'remove_condition' | 'reminder';  // Added 'reminder'
  condition: string;
  amount?: number;
  d10Roll?: number;   // NEW: for Ablaze transparency
  description: string;
}
```

#### `EndOfTurnParams` (end-of-turn.ts — NEW)
```typescript
export interface EndOfTurnParams {
  currentWounds: number;
  conditions: { name: string; level: number }[];
  currentRound: number;
  tb: number;
  lowestAP: number;
  injectedD10?: number;
}
```

#### `calculateDamage` (combat.ts — SIGNATURE CHANGE)
```typescript
// OLD: calculateDamage(weaponBonus, SB, targetAP, targetTB, isRanged)
// NEW:
export function calculateDamage(
  weaponDamage: number,
  sl: number,
  targetAP: number,
  targetTB: number
): number;
```

#### `computeMagicMissileDamage` (spell-casting.ts — SIGNATURE CHANGE)
```typescript
// OLD: computeMagicMissileDamage(spell, wpBonus, castingSL)
// NEW:
export function computeMagicMissileDamage(
  spell: SpellItem,
  castingSL: number,
  wpBonus?: number,
  tbBonus?: number
): number;
```

### Modified Components

| Component | Change |
|-----------|--------|
| `CombatDashboard` | Pass TB, lowestAP to processEndOfTurn; display reminder effects; remove Stunned auto-removal |
| `AttackFlow` | Pass SL and pre-computed weaponDamage to calculateDamage |
| `TakeDamagePanel` | Add SL input field |

## Data Models

### Conditions Data Changes

| Condition | Field | Old Value | New Value |
|-----------|-------|-----------|-----------|
| Stunned | stackable | false | true |
| Stunned | maxLevel | 1 | 10 |
| Blinded | stackable | false | true |
| Blinded | maxLevel | 1 | 10 |
| Deafened | stackable | false | true |
| Deafened | maxLevel | 1 | 10 |
| Poisoned | stackable | false | true |
| Poisoned | maxLevel | 1 | 10 |
| Ablaze | description | Updated | See requirements |
| Stunned | description | Updated | See requirements |

No changes to the Character type or localStorage schema. Condition levels are already stored as numbers.

## Correctness Properties

### Property 1: Ablaze Damage Formula
For any (d10 ∈ [1,10], level ∈ [1,10], TB ∈ [0,10], AP ∈ [0,10]), the computed Ablaze damage SHALL equal max(1, d10 + level - 1 - TB - AP).

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Combat Damage with SL
For any (weaponDmg ∈ [0,20], SL ∈ [-6,10], AP ∈ [0,10], TB ∈ [0,10]), the computed damage SHALL equal max(1, weaponDmg + SL - AP - TB).

**Validates: Requirements 3.1, 3.2**

### Property 3: Opposed Test Tie-Breaking
When netSL = 0: if playerTarget > opponentTarget → winner is 'player'; if opponentTarget > playerTarget → winner is 'opponent'; if equal → 'tie'. Roll values SHALL NOT influence the outcome.

**Validates: Requirements 4.2, 4.3, 4.5**

### Property 4: Magic Missile Damage
For any (baseDamage ∈ [0,12], SL ∈ [0,10]), the computed damage SHALL equal baseDamage + SL. WPB SHALL NOT appear as a separate additive term.

**Validates: Requirements 6.1, 6.2**

### Property 5: Poisoned Damage
For any (currentWounds > 0, poisonedLevel ∈ [1,10]), wounds SHALL decrease by poisonedLevel (floored at 0). When wounds = 0, no change occurs.

**Validates: Requirements 8.1, 8.6**

### Property 6: Condition Stacking
Applying Stunned/Blinded/Deafened/Poisoned N times SHALL produce level = min(N, maxLevel). Level SHALL never exceed maxLevel (10).

**Validates: Requirements 2.1, 7.1, 7.2, 7.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| lowestAP not computable (no armour) | Default to 0 |
| injectedD10 out of range | Clamp to [1, 10] |
| Ablaze with 0 wounds | Skip damage entirely (existing behaviour) |
| calculateDamage result < 1 | Floor at 1 per RAW |
| parseDamageFromEffect can't parse | Return 0 (existing fallback) |
