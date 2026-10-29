import { describe, it, expect } from 'vitest';
import {
  OPTIONAL_MECHANICS,
  OPTIONAL_MECHANIC_CATEGORIES,
} from '../optionalMechanics';
import { BLANK_CHARACTER } from '../../../../types/character';

/**
 * Data coverage guard for the Optional Mechanics list. This is a pure unit test
 * (no React). It pins the array to exactly the eight expected mechanics so a
 * forgotten/typo'd/extra entry trips here, and backstops the compile-time
 * `BooleanHouseRuleKey` constraint with a runtime check that every key is a
 * real boolean HouseRules field.
 */

const EXPECTED_KEYS = [
  'useYenlui',
  'useGrudgeBook',
  'usePsychologyTracker',
  'useCriticalDeflection',
  'useEnterprises',
  'useWildernessTravel',
  'useHunting',
  'useCants',
] as const;

describe('OPTIONAL_MECHANICS data module', () => {
  it('covers exactly the eight expected keys', () => {
    const keys = OPTIONAL_MECHANICS.map((m) => m.key);
    expect(new Set(keys)).toEqual(new Set(EXPECTED_KEYS));
    expect(keys).toHaveLength(EXPECTED_KEYS.length);
  });

  it('has no duplicate keys', () => {
    const keys = OPTIONAL_MECHANICS.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every entry key is a real boolean HouseRules field', () => {
    for (const entry of OPTIONAL_MECHANICS) {
      expect(typeof BLANK_CHARACTER.houseRules[entry.key]).toBe('boolean');
    }
  });

  it('every entry category is a member of the taxonomy', () => {
    for (const entry of OPTIONAL_MECHANICS) {
      expect(OPTIONAL_MECHANIC_CATEGORIES).toContain(entry.category);
    }
  });

  it('every category in the taxonomy has at least one entry', () => {
    for (const category of OPTIONAL_MECHANIC_CATEGORIES) {
      expect(OPTIONAL_MECHANICS.some((m) => m.category === category)).toBe(true);
    }
  });

  it('every entry has non-empty label, description, and location', () => {
    for (const entry of OPTIONAL_MECHANICS) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.location.length).toBeGreaterThan(0);
    }
  });
});
