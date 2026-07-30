// Feature: optional-psychology-tracking, Property 1: Missing field defaults to false on load
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../character';
import type { Character, HouseRules, RangedDamageSBMode } from '../character';

/**
 * Property 1: Missing field defaults to false on load
 *
 * **Validates: Requirements 1.3**
 *
 * For any character data object that does not contain a `usePsychologyTracker`
 * field in its `houseRules`, loading that character through the production merge
 * logic SHALL produce a character with `houseRules.usePsychologyTracker === false`.
 *
 * The production load path consists of:
 * 1. character-manager.ts loadCharacter: `{ ...structuredClone(BLANK_CHARACTER), ...parsed }`
 * 2. useCharacter.ts backfillCharacter: merges BLANK_CHARACTER.houseRules defaults
 *    into partial houseRules objects
 *
 * For imports, export-import.ts uses deepMergeImport which recursively merges
 * objects, so partial houseRules objects also receive usePsychologyTracker: false.
 *
 * We test BOTH paths as they are used in production.
 */

// Mock modules required by loadCharacter
vi.mock('../../logic/corruption', () => ({
  migrateCorruptionData: (char: Character) => char,
}));

vi.mock('../../logic/advancement', () => ({
  ensureCareerSkillsExist: (char: Character) => char,
}));

vi.mock('../../data/careers', () => ({
  CAREER_SCHEMES: {},
}));

vi.mock('../../storage/local-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; return { ok: true }; },
    removeItem: (key: string) => { delete store[key]; },
    __setStore: (s: Record<string, string>) => { store = s; },
  };
});

vi.mock('../../storage/portrait-store', () => ({
  getPortraitStore: () => ({
    getPortraitURL: async () => ({ ok: false }),
    savePortrait: async () => {},
    deletePortrait: async () => {},
    isDegraded: () => true,
  }),
}));

// Mock backfillCharacter dependencies
vi.mock('../../logic/talents', () => ({
  syncTalentBonuses: (char: Character) => char,
}));

vi.mock('../../logic/calculators', () => ({
  syncWoundFields: (char: Character) => char,
  calculateTotalWounds: () => 0,
  calculateArmourPoints: () => ({ head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 }),
  calculateMaxEncumbrance: () => 0,
  calculateCoinWeight: () => 0,
}));

vi.mock('../../data/species', () => ({
  SPECIES_DATA: {
    Human: { woundsUseSB: true, chars: {}, move: 4, fate: 2, resilience: 1, extraPoints: 3, skills: [], talents: [] },
    Dwarf: { woundsUseSB: true, chars: {}, move: 3, fate: 0, resilience: 2, extraPoints: 2, skills: [], talents: [] },
    Halfling: { woundsUseSB: false, chars: {}, move: 3, fate: 0, resilience: 2, extraPoints: 3, skills: [], talents: [] },
    'High Elf': { woundsUseSB: true, chars: {}, move: 5, fate: 0, resilience: 0, extraPoints: 2, skills: [], talents: [] },
    'Wood Elf': { woundsUseSB: true, chars: {}, move: 5, fate: 0, resilience: 0, extraPoints: 2, skills: [], talents: [] },
  },
}));

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a random RangedDamageSBMode */
const arbRangedDamageSBMode: fc.Arbitrary<RangedDamageSBMode> = fc.oneof(
  fc.constant('none' as const),
  fc.constant('halfSB' as const),
  fc.constant('fullSB' as const),
);

/**
 * Generate a random partial houseRules object that OMITS usePsychologyTracker.
 * Includes a random subset of the other valid houseRules fields.
 */
const arbPartialHouseRulesWithoutPsychology: fc.Arbitrary<Partial<Omit<HouseRules, 'usePsychologyTracker'>>> = fc.record(
  {
    rangedDamageSBMode: arbRangedDamageSBMode,
    impaleCritsOnTens: fc.boolean(),
    min1Wound: fc.boolean(),
    advantageCap: fc.integer({ min: 0, max: 100 }),
    useGroupAdvantage: fc.boolean(),
    useYenlui: fc.boolean(),
    useGrudgeBook: fc.boolean(),
  },
  { requiredKeys: [] }, // All fields are optional — generates varying subsets
);

/**
 * Generate a minimal partial character with random fields that
 * omits usePsychologyTracker from houseRules (if houseRules is present at all).
 */
const arbPartialCharacterWithoutPsychologyToggle = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  species: fc.oneof(fc.constant('Human'), fc.constant('Dwarf'), fc.constant('Halfling'), fc.constant('High Elf'), fc.constant('Wood Elf')),
  houseRules: fc.option(arbPartialHouseRulesWithoutPsychology, { nil: undefined }),
}).map(({ name, species, houseRules }) => {
  const partial: Record<string, unknown> = {
    _v: 7,
    name,
    species,
    chars: structuredClone(BLANK_CHARACTER.chars),
  };
  if (houseRules !== undefined) {
    partial.houseRules = houseRules;
  }
  return partial;
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: optional-psychology-tracking', () => {
  describe('Property 1: Missing field defaults to false on load', () => {
    it('loadCharacter + backfillCharacter: missing usePsychologyTracker defaults to false', async () => {
      const { loadCharacter } = await import('../../storage/character-manager');
      const { backfillCharacter } = await import('../../hooks/useCharacter');
      const { __setStore } = await import('../../storage/local-storage') as unknown as { __setStore: (s: Record<string, string>) => void };

      fc.assert(
        fc.property(
          arbPartialCharacterWithoutPsychologyToggle,
          (partialChar) => {
            // Store the partial character in mock localStorage
            const charId = 'test-char';
            const storeKey = `wfrp4e-char-${charId}`;
            __setStore({ [storeKey]: JSON.stringify(partialChar) });

            // Load through the actual production path
            const loaded = loadCharacter(charId);
            expect(loaded).not.toBeNull();

            // Apply backfill (called by useCharacter in production)
            const backfilled = backfillCharacter(loaded!);

            // The merged houseRules should have usePsychologyTracker === false
            expect(backfilled.houseRules.usePsychologyTracker).toBe(false);
          }
        ),
        { numRuns: 100 },
      );
    });

    it('importFromJSON deep merge: missing usePsychologyTracker defaults to false', async () => {
      const { importFromJSON } = await import('../../storage/export-import');

      fc.assert(
        fc.property(
          arbPartialCharacterWithoutPsychologyToggle,
          (partialChar) => {
            const json = JSON.stringify(partialChar);
            const result = importFromJSON(json);

            expect(result.success).toBe(true);
            expect(result.character).toBeDefined();

            // Deep merge should ensure usePsychologyTracker defaults to false
            expect(result.character!.houseRules.usePsychologyTracker).toBe(false);
          }
        ),
        { numRuns: 100 },
      );
    });
  });
});
