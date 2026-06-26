import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { processEndOfTurn } from '../end-of-turn';

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
