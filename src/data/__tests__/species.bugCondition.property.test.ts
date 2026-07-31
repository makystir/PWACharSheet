import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SPECIES_DATA } from '../species';

// ─── Expected Values (Source of Truth) ───────────────────────────────────────
// Core Rulebook p.33: Halfling skills, High Elf skills
// High Elf Player's Guide p.57: Sea Elf talents

interface BugCase {
  speciesKey: string;
  fieldType: 'skill' | 'talent';
  expectedPresent: string;
  expectedAbsent?: string;
  expectedCount?: number;
}

const BUG_CASES: BugCase[] = [
  {
    speciesKey: 'Halfling',
    fieldType: 'skill',
    expectedPresent: 'Trade (Cook)',
    expectedAbsent: 'Gossip',
  },
  {
    speciesKey: 'High Elf',
    fieldType: 'skill',
    expectedPresent: 'Swim',
    expectedAbsent: 'Research',
  },
  {
    speciesKey: 'High Elves (Sea Elf)',
    fieldType: 'talent',
    expectedPresent: 'Uncouth Uranai',
    expectedCount: 6,
  },
];

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Bug Condition: Species Data Matches Source Documents', () => {
  /**
   * Property 1: Bug Condition - Species Data Matches Source Documents
   * Validates: Requirements 1.1, 1.2, 1.3
   *
   * For any species entry where the bug condition holds, the SPECIES_DATA
   * SHALL contain the correct values matching official source documents.
   *
   * EXPECTED: This test FAILS on unfixed code, confirming the bug exists.
   */
  it('affected species entries contain correct skills/talents per source documents', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...BUG_CASES),
        (bugCase) => {
          const speciesEntry = SPECIES_DATA[bugCase.speciesKey];
          const fieldArray = bugCase.fieldType === 'skill'
            ? speciesEntry.skills
            : speciesEntry.talents;

          // The correct value MUST be present
          expect(fieldArray).toContain(bugCase.expectedPresent);

          // The incorrect value MUST NOT be present (if specified)
          if (bugCase.expectedAbsent) {
            expect(fieldArray).not.toContain(bugCase.expectedAbsent);
          }

          // The array MUST have the expected count (if specified)
          if (bugCase.expectedCount !== undefined) {
            expect(fieldArray).toHaveLength(bugCase.expectedCount);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
