import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TALENT_DB } from '../talents';

// Feature: app-quality-improvements, Property 1: Talent database structural consistency

describe('Property 1: Talent database structural consistency', () => {
  /**
   * Every entry in TALENT_DB has non-empty `name`, `max`, and `desc` strings.
   * **Validates: Requirements 2.3**
   */
  it('every talent entry has non-empty name, max, and desc strings', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TALENT_DB),
        (talent) => {
          expect(typeof talent.name).toBe('string');
          expect(talent.name.length).toBeGreaterThan(0);

          expect(typeof talent.max).toBe('string');
          expect(talent.max.length).toBeGreaterThan(0);

          expect(typeof talent.desc).toBe('string');
          expect(talent.desc.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
