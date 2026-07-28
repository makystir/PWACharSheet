import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { processEndOfTurn, applyEndOfTurnResult } from '../end-of-turn';
import type { EndOfTurnResult, CharacterCombatState } from '../end-of-turn';

// Feature: ux-polish-and-functionality, Property 7: End-of-Turn Condition Damage
// **Validates: Requirements 8.3, 8.4, 8.7, 8.8**

describe('Property 7: End-of-Turn Condition Damage', () => {
  it('for any currentWounds > 0, Bleeding level (0-10), Ablaze level (0-10), d10 ∈ [1,10], TB ∈ [0,10], AP ∈ [0,10]: wounds = max(0, currentWounds - bleedingLevel - ablazeDamage)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),  // currentWounds > 0
        fc.integer({ min: 0, max: 10 }),   // bleedingLevel
        fc.integer({ min: 0, max: 10 }),   // ablazeLevel
        fc.integer({ min: 1, max: 10 }),   // d10Roll
        fc.integer({ min: 0, max: 10 }),   // tb
        fc.integer({ min: 0, max: 10 }),   // lowestAP
        fc.integer({ min: 0, max: 100 }),  // currentRound
        (currentWounds, bleedingLevel, ablazeLevel, d10Roll, tb, lowestAP, currentRound) => {
          const conditions: { name: string; level: number }[] = [];
          if (bleedingLevel > 0) {
            conditions.push({ name: 'Bleeding', level: bleedingLevel });
          }
          if (ablazeLevel > 0) {
            conditions.push({ name: 'Ablaze', level: ablazeLevel });
          }

          const result = processEndOfTurn({
            currentWounds,
            conditions,
            currentRound,
            tb,
            lowestAP,
            injectedD10: d10Roll,
          });

          const ablazeDamage = ablazeLevel > 0
            ? Math.max(1, d10Roll + (ablazeLevel - 1) - tb - lowestAP)
            : 0;
          const expectedWounds = Math.max(0, currentWounds - bleedingLevel - ablazeDamage);
          expect(result.newWounds).toBe(expectedWounds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any currentWounds = 0, Bleeding level (0-10), and Ablaze level (0-10), resulting wounds remain 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),   // bleedingLevel
        fc.integer({ min: 0, max: 10 }),   // ablazeLevel
        fc.integer({ min: 0, max: 100 }),  // currentRound
        (bleedingLevel, ablazeLevel, currentRound) => {
          const conditions: { name: string; level: number }[] = [];
          if (bleedingLevel > 0) {
            conditions.push({ name: 'Bleeding', level: bleedingLevel });
          }
          if (ablazeLevel > 0) {
            conditions.push({ name: 'Ablaze', level: ablazeLevel });
          }

          const result = processEndOfTurn({
            currentWounds: 0,
            conditions,
            currentRound,
            tb: 0,
            lowestAP: 0,
          });

          expect(result.newWounds).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for any currentWounds = 0, no damage effects are generated regardless of condition levels', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),   // bleedingLevel
        fc.integer({ min: 0, max: 10 }),   // ablazeLevel
        (bleedingLevel, ablazeLevel) => {
          const conditions: { name: string; level: number }[] = [];
          if (bleedingLevel > 0) {
            conditions.push({ name: 'Bleeding', level: bleedingLevel });
          }
          if (ablazeLevel > 0) {
            conditions.push({ name: 'Ablaze', level: ablazeLevel });
          }

          const result = processEndOfTurn({
            currentWounds: 0,
            conditions,
            currentRound: 1,
            tb: 0,
            lowestAP: 0,
          });

          const damageEffects = result.effects.filter(e => e.type === 'damage');
          expect(damageEffects).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: app-quality-improvements, Property 4: End-of-turn report completeness

/**
 * **Validates: Requirements 6.2, 6.3**
 *
 * Property: For any EndOfTurnResult containing damage effects and reminder effects,
 * the formatted report shall contain one entry per effect including: the condition name,
 * the damage amount (for damage effects), and the description text (for all effects).
 */

describe('Feature: app-quality-improvements, Property 4: End-of-turn report completeness', () => {
  // --- Generators ---

  /** Arbitrary damage condition (Bleeding, Ablaze, Poisoned) */
  const arbDamageConditionName = fc.constantFrom('Bleeding', 'Ablaze', 'Poisoned');

  /** Arbitrary reminder/remove condition names */
  const arbReminderConditionName = fc.constantFrom('Stunned', 'Broken', 'Blinded', 'Deafened');
  const arbRemoveConditionName = fc.constant('Surprised');

  /** Arbitrary condition level */
  const arbLevel = fc.integer({ min: 1, max: 10 });

  /** Generate a mix of conditions for end-of-turn processing */
  const arbConditionSet = fc.record({
    damageConditions: fc.array(
      fc.tuple(arbDamageConditionName, arbLevel),
      { minLength: 0, maxLength: 3 }
    ),
    reminderConditions: fc.array(
      arbReminderConditionName,
      { minLength: 0, maxLength: 4 }
    ),
    removeConditions: fc.array(
      arbRemoveConditionName,
      { minLength: 0, maxLength: 1 }
    ),
  });

  /** Arbitrary params for processEndOfTurn */
  const arbEndOfTurnInputs = fc.record({
    currentWounds: fc.integer({ min: 1, max: 100 }),
    currentRound: fc.integer({ min: 0, max: 100 }),
    tb: fc.integer({ min: 0, max: 10 }),
    lowestAP: fc.integer({ min: 0, max: 10 }),
    d10Roll: fc.integer({ min: 1, max: 10 }),
    conditionSet: arbConditionSet,
  });

  it('every effect in the result has a non-empty condition name', () => {
    fc.assert(
      fc.property(arbEndOfTurnInputs, (inputs) => {
        // Deduplicate conditions by name to match how processEndOfTurn uses .find()
        const conditionMap = new Map<string, number>();
        for (const [name, level] of inputs.conditionSet.damageConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, level);
        }
        for (const name of inputs.conditionSet.reminderConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, 1);
        }
        for (const name of inputs.conditionSet.removeConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, 1);
        }

        const conditions = Array.from(conditionMap.entries()).map(([name, level]) => ({
          name,
          level,
        }));

        const result = processEndOfTurn({
          currentWounds: inputs.currentWounds,
          conditions,
          currentRound: inputs.currentRound,
          tb: inputs.tb,
          lowestAP: inputs.lowestAP,
          injectedD10: inputs.d10Roll,
        });

        // Every effect must have a non-empty condition name
        for (const effect of result.effects) {
          expect(effect.condition).toBeTruthy();
          expect(effect.condition.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('damage effects have a numeric amount >= 0', () => {
    fc.assert(
      fc.property(arbEndOfTurnInputs, (inputs) => {
        const conditionMap = new Map<string, number>();
        for (const [name, level] of inputs.conditionSet.damageConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, level);
        }
        for (const name of inputs.conditionSet.reminderConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, 1);
        }
        for (const name of inputs.conditionSet.removeConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, 1);
        }

        const conditions = Array.from(conditionMap.entries()).map(([name, level]) => ({
          name,
          level,
        }));

        const result = processEndOfTurn({
          currentWounds: inputs.currentWounds,
          conditions,
          currentRound: inputs.currentRound,
          tb: inputs.tb,
          lowestAP: inputs.lowestAP,
          injectedD10: inputs.d10Roll,
        });

        // Damage effects must have a numeric amount >= 0
        const damageEffects = result.effects.filter(e => e.type === 'damage');
        for (const effect of damageEffects) {
          expect(typeof effect.amount).toBe('number');
          expect(effect.amount).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('all effects have a non-empty description string', () => {
    fc.assert(
      fc.property(arbEndOfTurnInputs, (inputs) => {
        const conditionMap = new Map<string, number>();
        for (const [name, level] of inputs.conditionSet.damageConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, level);
        }
        for (const name of inputs.conditionSet.reminderConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, 1);
        }
        for (const name of inputs.conditionSet.removeConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, 1);
        }

        const conditions = Array.from(conditionMap.entries()).map(([name, level]) => ({
          name,
          level,
        }));

        const result = processEndOfTurn({
          currentWounds: inputs.currentWounds,
          conditions,
          currentRound: inputs.currentRound,
          tb: inputs.tb,
          lowestAP: inputs.lowestAP,
          injectedD10: inputs.d10Roll,
        });

        // Every effect must have a non-empty description
        for (const effect of result.effects) {
          expect(typeof effect.description).toBe('string');
          expect(effect.description.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('effect count in result matches expected count from input conditions', () => {
    fc.assert(
      fc.property(arbEndOfTurnInputs, (inputs) => {
        // Deduplicate conditions by name
        const conditionMap = new Map<string, number>();
        for (const [name, level] of inputs.conditionSet.damageConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, level);
        }
        for (const name of inputs.conditionSet.reminderConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, 1);
        }
        for (const name of inputs.conditionSet.removeConditions) {
          if (!conditionMap.has(name)) conditionMap.set(name, 1);
        }

        const conditions = Array.from(conditionMap.entries()).map(([name, level]) => ({
          name,
          level,
        }));

        const result = processEndOfTurn({
          currentWounds: inputs.currentWounds,
          conditions,
          currentRound: inputs.currentRound,
          tb: inputs.tb,
          lowestAP: inputs.lowestAP,
          injectedD10: inputs.d10Roll,
        });

        // Count expected effects based on what processEndOfTurn generates:
        // - Each damage condition (Bleeding, Ablaze, Poisoned) with wounds > 0 produces one damage effect
        // - Stunned produces a reminder
        // - Surprised produces a remove_condition effect
        // - Poisoned produces a reminder (in addition to damage)
        // - Broken, Blinded, Deafened produce reminders
        let expectedEffectCount = 0;

        const hasBleeding = conditionMap.has('Bleeding');
        const hasAblaze = conditionMap.has('Ablaze');
        const hasPoisoned = conditionMap.has('Poisoned');
        const hasStunned = conditionMap.has('Stunned');
        const hasSurprised = conditionMap.has('Surprised');
        const hasBroken = conditionMap.has('Broken');
        const hasBlinded = conditionMap.has('Blinded');
        const hasDeafened = conditionMap.has('Deafened');

        // Damage effects only if currentWounds > 0
        if (inputs.currentWounds > 0) {
          if (hasBleeding) expectedEffectCount++;
          if (hasAblaze) expectedEffectCount++;
          if (hasPoisoned) expectedEffectCount++;
        }

        // Reminder/remove effects are always processed
        if (hasStunned) expectedEffectCount++;
        if (hasSurprised) expectedEffectCount++;
        if (hasPoisoned) expectedEffectCount++; // Poisoned also gets a reminder
        if (hasBroken) expectedEffectCount++;
        if (hasBlinded) expectedEffectCount++;
        if (hasDeafened) expectedEffectCount++;

        expect(result.effects.length).toBe(expectedEffectCount);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: app-quality-improvements, Property 5: End-of-turn apply correctness
// **Validates: Requirements 6.6**

describe('Property 5: End-of-turn apply correctness', () => {
  // Arbitrary condition name generator
  const conditionNameArb = fc.constantFrom(
    'Bleeding', 'Ablaze', 'Poisoned', 'Stunned', 'Surprised',
    'Broken', 'Blinded', 'Deafened', 'Prone', 'Fatigued'
  );

  // Arbitrary condition object
  const conditionArb = fc.record({
    name: conditionNameArb,
    level: fc.integer({ min: 1, max: 10 }),
  });

  // Arbitrary EndOfTurnResult
  const endOfTurnResultArb = fc.record({
    newWounds: fc.integer({ min: 0, max: 20 }),
    removedConditions: fc.uniqueArray(conditionNameArb, { maxLength: 5 }),
    effects: fc.constant([]), // effects don't affect apply logic
    roundAdvanced: fc.integer({ min: 1, max: 100 }),
  }) as fc.Arbitrary<EndOfTurnResult>;

  // Arbitrary character combat state whose conditions include some of the removedConditions
  const stateAndResultArb = endOfTurnResultArb.chain((result) => {
    // Generate conditions that include at least some of the removedConditions
    const removedAsConditions = result.removedConditions.map((name) => ({
      name,
      level: 1,
    }));
    // Also generate extra random conditions
    const extraConditionsArb = fc.array(conditionArb, { minLength: 0, maxLength: 5 });
    return extraConditionsArb.map((extraConditions) => {
      const allConditions = [...removedAsConditions, ...extraConditions];
      // Deduplicate by name (keep first occurrence)
      const seen = new Set<string>();
      const uniqueConditions = allConditions.filter((c) => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      });

      const state: CharacterCombatState = {
        wounds: fc.sample(fc.integer({ min: 0, max: 30 }), 1)[0],
        conditions: uniqueConditions,
        currentRound: fc.sample(fc.integer({ min: 0, max: 99 }), 1)[0],
      };
      return { state, result };
    });
  });

  it('applying EndOfTurnResult sets wounds to result.newWounds', () => {
    fc.assert(
      fc.property(
        stateAndResultArb,
        ({ state, result }) => {
          const applied = applyEndOfTurnResult(state, result);
          expect(applied.wounds).toBe(result.newWounds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('applying EndOfTurnResult removes all result.removedConditions from character', () => {
    fc.assert(
      fc.property(
        stateAndResultArb,
        ({ state, result }) => {
          const applied = applyEndOfTurnResult(state, result);
          for (const removedName of result.removedConditions) {
            const stillPresent = applied.conditions.some((c) => c.name === removedName);
            expect(stillPresent).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('applying EndOfTurnResult sets round counter to result.roundAdvanced', () => {
    fc.assert(
      fc.property(
        stateAndResultArb,
        ({ state, result }) => {
          const applied = applyEndOfTurnResult(state, result);
          expect(applied.currentRound).toBe(result.roundAdvanced);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('applying EndOfTurnResult retains conditions not in removedConditions', () => {
    fc.assert(
      fc.property(
        stateAndResultArb,
        ({ state, result }) => {
          const applied = applyEndOfTurnResult(state, result);
          const retained = state.conditions.filter(
            (c) => !result.removedConditions.includes(c.name)
          );
          expect(applied.conditions).toEqual(retained);
        }
      ),
      { numRuns: 100 }
    );
  });
});
