// Feature: app-quality-improvements, Property 2: Fatigued-to-Unconscious automation correctness
// Feature: app-quality-improvements, Property 3: Quick condition application equivalence

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { evaluateFatiguedThreshold } from '../conditions';
import { applyCondition } from '../combat';
import { CONDITIONS } from '../../data/conditions';
import type { Condition } from '../../types/character';

/**
 * **Validates: Requirements 3.1, 3.2**
 *
 * Property: For any character with a Toughness Bonus in [1..10] and any set of conditions
 * containing Fatigued, after evaluating the Fatigued threshold: Unconscious is present in
 * the result if and only if Fatigued level >= TB, and Unconscious appears at most once
 * regardless of how many times the evaluation is repeated (idempotence).
 */

// --- Generators ---

const OTHER_CONDITION_NAMES = [
  'Ablaze', 'Bleeding', 'Blinded', 'Broken', 'Deafened',
  'Entangled', 'Poisoned', 'Prone', 'Stunned', 'Surprised',
] as const;

/** Generate an arbitrary condition that is NOT Fatigued or Unconscious */
const arbOtherCondition: fc.Arbitrary<Condition> = fc.record({
  name: fc.constantFrom(...OTHER_CONDITION_NAMES),
  level: fc.integer({ min: 1, max: 5 }),
});

/** Generate Fatigued condition with an arbitrary level */
const arbFatigued: fc.Arbitrary<Condition> = fc.integer({ min: 1, max: 15 }).map(level => ({
  name: 'Fatigued',
  level,
}));

/** Generate a TB value */
const arbToughnessBonus = fc.integer({ min: 1, max: 10 });

/** Generate an optional set of other conditions (0-5 extra conditions) */
const arbOtherConditions = fc.array(arbOtherCondition, { minLength: 0, maxLength: 5 });

describe('Feature: app-quality-improvements, Property 2: Fatigued-to-Unconscious automation correctness', () => {
  it('Unconscious is present in result iff Fatigued.level >= TB (without pre-existing Unconscious)', () => {
    fc.assert(
      fc.property(
        arbToughnessBonus,
        arbFatigued,
        arbOtherConditions,
        (tb, fatigued, otherConditions) => {
          // Build condition set: Fatigued + optional others (no Unconscious initially)
          const conditions: Condition[] = [fatigued, ...otherConditions];

          const result = evaluateFatiguedThreshold(conditions, tb);

          const hasUnconsciousInResult = result.conditions.some(c => c.name === 'Unconscious');

          if (fatigued.level >= tb) {
            // Unconscious MUST be present when Fatigued level >= TB
            expect(hasUnconsciousInResult).toBe(true);
          } else {
            // Unconscious MUST NOT be added when Fatigued level < TB
            expect(hasUnconsciousInResult).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Unconscious appears at most once in the result (no duplicates)', () => {
    fc.assert(
      fc.property(
        arbToughnessBonus,
        arbFatigued,
        arbOtherConditions,
        (tb, fatigued, otherConditions) => {
          const conditions: Condition[] = [fatigued, ...otherConditions];

          const result = evaluateFatiguedThreshold(conditions, tb);

          const unconsciousCount = result.conditions.filter(c => c.name === 'Unconscious').length;
          expect(unconsciousCount).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('evaluation is idempotent: applying twice yields the same result as applying once', () => {
    fc.assert(
      fc.property(
        arbToughnessBonus,
        arbFatigued,
        arbOtherConditions,
        (tb, fatigued, otherConditions) => {
          const conditions: Condition[] = [fatigued, ...otherConditions];

          // First evaluation
          const firstResult = evaluateFatiguedThreshold(conditions, tb);
          // Second evaluation on the result of the first
          const secondResult = evaluateFatiguedThreshold(firstResult.conditions, tb);

          // The conditions should be identical after both evaluations
          expect(secondResult.conditions).toEqual(firstResult.conditions);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('retains pre-existing Unconscious without duplication when Fatigued >= TB', () => {
    fc.assert(
      fc.property(
        arbToughnessBonus,
        arbFatigued,
        arbOtherConditions,
        (tb, fatigued, otherConditions) => {
          // Start with Unconscious already present
          const unconscious: Condition = { name: 'Unconscious', level: 1 };
          const conditions: Condition[] = [fatigued, unconscious, ...otherConditions];

          const result = evaluateFatiguedThreshold(conditions, tb);

          // Unconscious should never be duplicated
          const unconsciousCount = result.conditions.filter(c => c.name === 'Unconscious').length;
          expect(unconsciousCount).toBe(1);

          // When Fatigued >= TB, Unconscious must still be present (retained)
          if (fatigued.level >= tb) {
            expect(result.conditions.some(c => c.name === 'Unconscious')).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: app-quality-improvements, Property 3: Quick condition application equivalence

/**
 * **Validates: Requirements 5.2, 5.4**
 *
 * Property: For any character condition state and any of the four quick-conditions
 * (Bleeding, Stunned, Prone, Ablaze), applying the condition via the quick-button logic
 * shall produce the same resulting condition list as applying it via the full
 * Condition_Picker logic (increment if stackable and present, add at level 1 if absent,
 * no increment beyond maxLevel).
 *
 * Since both paths use `applyCondition`, we verify the function itself handles all cases correctly:
 * - Absent condition → added at level 1
 * - Stackable condition present below maxLevel → level increments by 1
 * - Stackable condition at maxLevel → no change
 * - Non-stackable condition already present → no change
 */

const QUICK_CONDITION_NAMES = ['Bleeding', 'Stunned', 'Prone', 'Ablaze'] as const;

/** Generate a random quick-condition name */
const arbQuickConditionName = fc.constantFrom(...QUICK_CONDITION_NAMES);

/** Generate an arbitrary condition from the full CONDITIONS list with a valid level */
const arbAnyCondition: fc.Arbitrary<Condition> = fc.oneof(
  ...CONDITIONS.map(cond =>
    fc.integer({ min: 1, max: cond.maxLevel }).map(level => ({
      name: cond.name,
      level,
    }))
  )
);

/** Generate an arbitrary array of conditions (0-6), with at most one entry per condition name */
const arbConditionArray: fc.Arbitrary<Condition[]> = fc
  .array(arbAnyCondition, { minLength: 0, maxLength: 6 })
  .map(conditions => {
    // Deduplicate by name, keep only the first occurrence
    const seen = new Set<string>();
    return conditions.filter(c => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    });
  });

describe('Feature: app-quality-improvements, Property 3: Quick condition application equivalence', () => {
  it('absent condition is added at level 1', () => {
    fc.assert(
      fc.property(
        arbConditionArray,
        arbQuickConditionName,
        (conditions, condName) => {
          // Filter out the target condition so it's absent
          const filtered = conditions.filter(c => c.name !== condName);

          const result = applyCondition(filtered, condName);

          // The condition should now be present at level 1
          const applied = result.find(c => c.name === condName);
          expect(applied).toBeDefined();
          expect(applied!.level).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('stackable condition present below maxLevel increments by 1', () => {
    fc.assert(
      fc.property(
        arbConditionArray,
        fc.constantFrom('Bleeding', 'Stunned', 'Ablaze' as const),
        (conditions, condName) => {
          const condData = CONDITIONS.find(c => c.name === condName)!;
          // Ensure condition is present at a level below max
          const level = fc.sample(fc.integer({ min: 1, max: condData.maxLevel - 1 }), 1)[0];
          const baseConditions: Condition[] = [
            ...conditions.filter(c => c.name !== condName),
            { name: condName, level },
          ];

          const result = applyCondition(baseConditions, condName);

          const applied = result.find(c => c.name === condName);
          expect(applied).toBeDefined();
          expect(applied!.level).toBe(level + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('stackable condition at maxLevel does not increment beyond maxLevel', () => {
    fc.assert(
      fc.property(
        arbConditionArray,
        fc.constantFrom('Bleeding', 'Stunned', 'Ablaze' as const),
        (conditions, condName) => {
          const condData = CONDITIONS.find(c => c.name === condName)!;
          // Set condition at maxLevel
          const baseConditions: Condition[] = [
            ...conditions.filter(c => c.name !== condName),
            { name: condName, level: condData.maxLevel },
          ];

          const result = applyCondition(baseConditions, condName);

          const applied = result.find(c => c.name === condName);
          expect(applied).toBeDefined();
          expect(applied!.level).toBe(condData.maxLevel);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-stackable condition (Prone) already present does not change', () => {
    fc.assert(
      fc.property(
        arbConditionArray,
        (conditions) => {
          // Ensure Prone is present
          const baseConditions: Condition[] = [
            ...conditions.filter(c => c.name !== 'Prone'),
            { name: 'Prone', level: 1 },
          ];

          const result = applyCondition(baseConditions, 'Prone');

          // Prone should still be at level 1 (maxLevel for non-stackable)
          const applied = result.find(c => c.name === 'Prone');
          expect(applied).toBeDefined();
          expect(applied!.level).toBe(1);
          // Total condition count should not change
          expect(result.length).toBe(baseConditions.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('applyCondition preserves all other conditions unchanged', () => {
    fc.assert(
      fc.property(
        arbConditionArray,
        arbQuickConditionName,
        (conditions, condName) => {
          const result = applyCondition(conditions, condName);

          // All conditions other than the target should be preserved with same name and level
          const othersBefore = conditions.filter(c => c.name !== condName);
          const othersAfter = result.filter(c => c.name !== condName);

          expect(othersAfter.length).toBe(othersBefore.length);
          for (const before of othersBefore) {
            const after = othersAfter.find(c => c.name === before.name);
            expect(after).toBeDefined();
            expect(after!.level).toBe(before.level);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
