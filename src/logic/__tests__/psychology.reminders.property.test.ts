import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ALL_PSYCHOLOGY_TYPES, PSYCHOLOGY_REMINDERS } from '../../logic/psychology';
import type { PsychologyType } from '../../types/character';

// Feature: unified-psychology-panel, Property 4: Rule reminders completeness

describe('Feature: unified-psychology-panel', () => {
  describe('Property 4: Rule reminders completeness', () => {
    /**
     * **Validates: Requirements 4.1, 4.3**
     *
     * For any valid PsychologyType value, PSYCHOLOGY_REMINDERS[type] SHALL be a non-empty string.
     */

    it('every PsychologyType has a non-empty reminder string', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_PSYCHOLOGY_TYPES),
          (type: PsychologyType) => {
            const reminder = PSYCHOLOGY_REMINDERS[type];
            expect(typeof reminder).toBe('string');
            expect(reminder.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('PSYCHOLOGY_REMINDERS covers all 8 psychology types exhaustively', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_PSYCHOLOGY_TYPES),
          (type: PsychologyType) => {
            expect(type in PSYCHOLOGY_REMINDERS).toBe(true);
            expect(PSYCHOLOGY_REMINDERS[type].trim().length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ALL_PSYCHOLOGY_TYPES contains exactly 8 entries', () => {
      expect(ALL_PSYCHOLOGY_TYPES.length).toBe(8);
    });
  });
});
