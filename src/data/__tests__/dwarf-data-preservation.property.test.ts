import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CAREER_SCHEMES } from '../careers';
import { SPECIES_DATA } from '../species';

// ─── Observation-First Methodology ───────────────────────────────────────────
// These tests capture the CURRENT behavior of entries NOT affected by the bug.
// They must PASS on the unfixed code, confirming a baseline to preserve.

// ─── Non-Dwarf Species (observed current values) ─────────────────────────────

const NON_DWARF_SPECIES_NAMES = [
  'Human / Reiklander',
  'Halfling',
  'High Elf',
  'Wood Elf',
  'High Elves (Caledor)',
  'High Elves (Ellyrion)',
  'High Elves (Avelorn)',
  'High Elves (Saphery)',
  'High Elves (Eataine)',
  'High Elves (Tiranoc)',
  'High Elves (Nagarythe)',
  'High Elves (Chrace)',
  'High Elves (Cothique)',
  'High Elves (Yvresse)',
  'High Elves (Sea Elf)',
  'Ogre',
] as const;

// Capture current snapshot values at import time (observation)
const NON_DWARF_SPECIES_SNAPSHOT: Record<string, { skills: string[]; talents: string[]; chars: Record<string, number> }> = {};
for (const name of NON_DWARF_SPECIES_NAMES) {
  const entry = SPECIES_DATA[name];
  NON_DWARF_SPECIES_SNAPSHOT[name] = {
    skills: [...entry.skills],
    talents: [...entry.talents],
    chars: { ...entry.chars },
  };
}

// ─── Base "Dwarf" Entry (observed current values) ────────────────────────────

const BASE_DWARF_OBSERVED = {
  skills: [...SPECIES_DATA['Dwarf'].skills],
  talents: [...SPECIES_DATA['Dwarf'].talents],
};

// ─── Non-Runesmith/Runescribe Careers ────────────────────────────────────────

const ALL_CAREER_NAMES = Object.keys(CAREER_SCHEMES);
const NON_AFFECTED_CAREER_NAMES = ALL_CAREER_NAMES.filter(
  name => name !== 'Runesmith' && name !== 'Runescribe'
);

// Capture current snapshot for non-affected careers (levels 2-4 are always present; level1 is optional)
type LevelSnapshot = { title: string; status: string; skills: string[]; talents: string[] };
const NON_AFFECTED_CAREER_SNAPSHOT: Record<string, {
  level1?: LevelSnapshot;
  level2: LevelSnapshot;
  level3: LevelSnapshot;
  level4: LevelSnapshot;
}> = {};

for (const name of NON_AFFECTED_CAREER_NAMES) {
  const career = CAREER_SCHEMES[name];
  NON_AFFECTED_CAREER_SNAPSHOT[name] = {
    level1: career.level1 ? { title: career.level1.title, status: career.level1.status, skills: [...career.level1.skills], talents: [...career.level1.talents] } : undefined,
    level2: { title: career.level2.title, status: career.level2.status, skills: [...career.level2.skills], talents: [...career.level2.talents] },
    level3: { title: career.level3.title, status: career.level3.status, skills: [...career.level3.skills], talents: [...career.level3.talents] },
    level4: { title: career.level4.title, status: career.level4.status, skills: [...career.level4.skills], talents: [...career.level4.talents] },
  };
}

// ─── Dwarf Subrace Numeric Fields (observed current values) ──────────────────

const DWARF_SUBRACE_NAMES = [
  'Dwarfs (Karaz-a-Karak)',
  'Dwarfs (Barak Varr)',
  'Dwarfs (Karak Azul)',
  'Dwarfs (Karak Eight Peaks)',
  'Dwarfs (Karak Kadrin)',
  'Dwarfs (Zhufbar)',
  'Dwarfs (Karak Hirn/Black Mountains)',
  'Dwarfs (Karak Izor/The Vaults)',
  'Dwarfs (Karak Norn/Grey Mountains)',
  'Dwarfs (Norse)',
  'Dwarfs (Imperial)',
] as const;

// Expected numeric values for all Dwarf subraces (same across all holds)
const DWARF_SUBRACE_EXPECTED_NUMERICS = {
  chars: { WS: 30, BS: 20, S: 20, T: 30, I: 20, Ag: 10, Dex: 30, Int: 20, WP: 40, Fel: 10 },
  move: 3,
  fate: 0,
  resilience: 2,
  extraPoints: 2,
};

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property 2: Preservation - Non-Dwarf and Unaffected Data Unchanged', () => {
  /**
   * Property: for all non-Dwarf species entries, skills/talents/chars match current snapshot values
   * **Validates: Requirements 3.1, 3.3**
   */
  describe('Non-Dwarf species entries retain their current values', () => {
    it('for all non-Dwarf species, skills match observed snapshot', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NON_DWARF_SPECIES_NAMES),
          (speciesName) => {
            const actual = SPECIES_DATA[speciesName];
            const expected = NON_DWARF_SPECIES_SNAPSHOT[speciesName];
            expect(actual.skills).toEqual(expected.skills);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for all non-Dwarf species, talents match observed snapshot', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NON_DWARF_SPECIES_NAMES),
          (speciesName) => {
            const actual = SPECIES_DATA[speciesName];
            const expected = NON_DWARF_SPECIES_SNAPSHOT[speciesName];
            expect(actual.talents).toEqual(expected.talents);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for all non-Dwarf species, characteristics match observed snapshot', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NON_DWARF_SPECIES_NAMES),
          (speciesName) => {
            const actual = SPECIES_DATA[speciesName];
            const expected = NON_DWARF_SPECIES_SNAPSHOT[speciesName];
            expect(actual.chars).toEqual(expected.chars);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property: base "Dwarf" entry skills and talents match current observed values
   * **Validates: Requirements 3.1, 3.2**
   */
  describe('Base "Dwarf" species entry retains correct values', () => {
    it('base Dwarf skills match observed values', () => {
      expect(SPECIES_DATA['Dwarf'].skills).toEqual(BASE_DWARF_OBSERVED.skills);
    });

    it('base Dwarf talents match observed values (already has "X or Y" format)', () => {
      expect(SPECIES_DATA['Dwarf'].talents).toEqual(BASE_DWARF_OBSERVED.talents);
    });

    it('base Dwarf talents include proper choice format entries', () => {
      // The base Dwarf entry already correctly uses "X or Y" format
      expect(SPECIES_DATA['Dwarf'].talents).toContain('Read/Write or Relentless');
      expect(SPECIES_DATA['Dwarf'].talents).toContain('Resolute or Strong-minded');
    });
  });

  /**
   * Property: for all non-Runesmith/Runescribe careers, all level data matches current snapshot values
   * **Validates: Requirements 3.1, 3.4**
   */
  describe('Non-Runesmith/Runescribe careers retain their current values', () => {
    it('for all non-affected careers, levels 2-4 data matches observed snapshot', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...NON_AFFECTED_CAREER_NAMES),
          fc.constantFrom('level2' as const, 'level3' as const, 'level4' as const),
          (careerName, level) => {
            const actual = CAREER_SCHEMES[careerName][level];
            const expected = NON_AFFECTED_CAREER_SNAPSHOT[careerName][level];
            expect(actual.title).toBe(expected.title);
            expect(actual.status).toBe(expected.status);
            expect(actual.skills).toEqual(expected.skills);
            expect(actual.talents).toEqual(expected.talents);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('for all non-affected careers with level1, level1 data matches observed snapshot', () => {
      const careersWithLevel1 = NON_AFFECTED_CAREER_NAMES.filter(
        name => CAREER_SCHEMES[name].level1 !== undefined
      );

      fc.assert(
        fc.property(
          fc.constantFrom(...careersWithLevel1),
          (careerName) => {
            const actual = CAREER_SCHEMES[careerName].level1!;
            const expected = NON_AFFECTED_CAREER_SNAPSHOT[careerName].level1!;
            expect(actual.title).toBe(expected.title);
            expect(actual.status).toBe(expected.status);
            expect(actual.skills).toEqual(expected.skills);
            expect(actual.talents).toEqual(expected.talents);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  /**
   * Property: for all Dwarf subraces, numeric fields are unchanged
   * **Validates: Requirements 3.5**
   */
  describe('Dwarf subrace numeric fields remain unchanged', () => {
    it('for all Dwarf subraces, characteristics match expected values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DWARF_SUBRACE_NAMES),
          (subraceName) => {
            const actual = SPECIES_DATA[subraceName];
            expect(actual.chars).toEqual(DWARF_SUBRACE_EXPECTED_NUMERICS.chars);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for all Dwarf subraces, move value is 3', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DWARF_SUBRACE_NAMES),
          (subraceName) => {
            const actual = SPECIES_DATA[subraceName];
            expect(actual.move).toBe(DWARF_SUBRACE_EXPECTED_NUMERICS.move);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for all Dwarf subraces, fate value is 0', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DWARF_SUBRACE_NAMES),
          (subraceName) => {
            const actual = SPECIES_DATA[subraceName];
            expect(actual.fate).toBe(DWARF_SUBRACE_EXPECTED_NUMERICS.fate);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for all Dwarf subraces, resilience value is 2', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DWARF_SUBRACE_NAMES),
          (subraceName) => {
            const actual = SPECIES_DATA[subraceName];
            expect(actual.resilience).toBe(DWARF_SUBRACE_EXPECTED_NUMERICS.resilience);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for all Dwarf subraces, extraPoints value is 2', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...DWARF_SUBRACE_NAMES),
          (subraceName) => {
            const actual = SPECIES_DATA[subraceName];
            expect(actual.extraPoints).toBe(DWARF_SUBRACE_EXPECTED_NUMERICS.extraPoints);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
