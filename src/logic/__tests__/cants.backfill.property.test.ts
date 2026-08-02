// Feature: alternative-channelling-cants, Property 2: Backfill defaults on load
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, HouseRules, RangedDamageSBMode } from '../../types/character';

/**
 * Property 2: Backfill defaults on load
 *
 * **Validates: Requirements 1.4, 8.2**
 *
 * For any character JSON that is missing either the `useCants` field on
 * `houseRules` or the `learnedCants` field, after deep-merging with
 * BLANK_CHARACTER, `houseRules.useCants` shall be `false` and
 * `learnedCants` shall be an empty array.
 *
 * The production load path consists of:
 * 1. character-manager.ts loadCharacter: `{ ...structuredClone(BLANK_CHARACTER), ...parsed }`
 * 2. useCharacter.ts backfillCharacter: merges BLANK_CHARACTER.houseRules defaults
 *    into partial houseRules objects (handles nested field backfill)
 *
 * We test BOTH paths together as they are used in production.
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../../logic/corruption', () => ({
  migrateCorruptionData: (char: Character) => char,
}));

vi.mock('../../logic/advancement', () => ({
  ensureCareerSkillsExist: (char: Character) => char,
}));

vi.mock('../../data/careers', () => ({
  CAREER_SCHEMES: {},
}));

vi.mock('../../logic/cants', () => ({
  validateLearnedCants: (learnedCants: unknown[]) => learnedCants,
}));

vi.mock('../../data/cants', () => ({
  CANT_CATALOGUE: [],
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
    Human: { woundsUseSB: true, woundMultiplier: 1, chars: {}, move: 4, fate: 2, resilience: 1, extraPoints: 3, skills: [], talents: [] },
    Dwarf: { woundsUseSB: true, woundMultiplier: 1, chars: {}, move: 3, fate: 0, resilience: 2, extraPoints: 2, skills: [], talents: [] },
    Halfling: { woundsUseSB: false, woundMultiplier: 1, chars: {}, move: 3, fate: 0, resilience: 2, extraPoints: 3, skills: [], talents: [] },
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
 * Generate a random partial houseRules object that OMITS useCants.
 * Includes a random subset of the other valid houseRules fields.
 */
const arbPartialHouseRulesWithoutCants: fc.Arbitrary<Partial<Omit<HouseRules, 'useCants'>>> = fc.record(
  {
    rangedDamageSBMode: arbRangedDamageSBMode,
    impaleCritsOnTens: fc.boolean(),
    min1Wound: fc.boolean(),
    advantageCap: fc.integer({ min: 0, max: 100 }),
    useGroupAdvantage: fc.boolean(),
    useYenlui: fc.boolean(),
    useGrudgeBook: fc.boolean(),
    usePsychologyTracker: fc.boolean(),
    useCriticalDeflection: fc.boolean(),
    useEnterprises: fc.boolean(),
  },
  { requiredKeys: [] },
);

/**
 * Generate a minimal partial character that is MISSING:
 * - `useCants` from houseRules (if houseRules is present)
 * - `learnedCants` at the top level
 *
 * This simulates loading a character saved before the cants feature was added.
 */
const arbPartialCharacterMissingBothCantsFields = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  species: fc.oneof(fc.constant('Human'), fc.constant('Dwarf'), fc.constant('Halfling')),
  houseRules: fc.option(arbPartialHouseRulesWithoutCants, { nil: undefined }),
}).map(({ name, species, houseRules }) => {
  const partial: Record<string, unknown> = {
    _v: 7,
    name,
    species,
    chars: structuredClone(BLANK_CHARACTER.chars),
    talents: [],
  };
  if (houseRules !== undefined) {
    partial.houseRules = houseRules;
  }
  // Explicitly do NOT include learnedCants
  return partial;
});

/**
 * Generate a partial character that HAS houseRules WITHOUT useCants,
 * but MAY have an empty learnedCants array (simulating partial migration).
 */
const arbPartialCharacterMissingUseCants = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  species: fc.oneof(fc.constant('Human'), fc.constant('Dwarf'), fc.constant('Halfling')),
  houseRules: arbPartialHouseRulesWithoutCants,
  hasLearnedCants: fc.boolean(),
}).map(({ name, species, houseRules, hasLearnedCants }) => {
  const partial: Record<string, unknown> = {
    _v: 7,
    name,
    species,
    chars: structuredClone(BLANK_CHARACTER.chars),
    talents: [],
    houseRules,
  };
  if (hasLearnedCants) {
    partial.learnedCants = [];
  }
  return partial;
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: alternative-channelling-cants', () => {
  describe('Property 2: Backfill defaults on load', () => {
    it('loadCharacter + backfillCharacter: missing useCants and learnedCants default correctly', async () => {
      const { loadCharacter } = await import('../../storage/character-manager');
      const { backfillCharacter } = await import('../../hooks/useCharacter');
      const { __setStore } = await import('../../storage/local-storage') as unknown as { __setStore: (s: Record<string, string>) => void };

      fc.assert(
        fc.property(
          arbPartialCharacterMissingBothCantsFields,
          (partialChar) => {
            const charId = 'test-backfill';
            const storeKey = `wfrp4e-char-${charId}`;
            __setStore({ [storeKey]: JSON.stringify(partialChar) });

            // Load through production path (step 1: shallow merge with BLANK_CHARACTER)
            const loaded = loadCharacter(charId);
            expect(loaded).not.toBeNull();

            // Apply backfill (step 2: called by useCharacter in production)
            const backfilled = backfillCharacter(loaded!);

            // useCants must be false after backfill
            expect(backfilled.houseRules.useCants).toBe(false);
            // learnedCants must be an empty array
            expect(backfilled.learnedCants).toEqual([]);
          }
        ),
        { numRuns: 100 },
      );
    });

    it('loadCharacter + backfillCharacter: houseRules present without useCants still gets false default', async () => {
      const { loadCharacter } = await import('../../storage/character-manager');
      const { backfillCharacter } = await import('../../hooks/useCharacter');
      const { __setStore } = await import('../../storage/local-storage') as unknown as { __setStore: (s: Record<string, string>) => void };

      fc.assert(
        fc.property(
          arbPartialCharacterMissingUseCants,
          (partialChar) => {
            const charId = 'test-backfill-2';
            const storeKey = `wfrp4e-char-${charId}`;
            __setStore({ [storeKey]: JSON.stringify(partialChar) });

            // Load through production path
            const loaded = loadCharacter(charId);
            expect(loaded).not.toBeNull();

            // Apply backfill
            const backfilled = backfillCharacter(loaded!);

            // useCants must be false (backfilled from BLANK_CHARACTER.houseRules)
            expect(backfilled.houseRules.useCants).toBe(false);
            // learnedCants must be an empty array (either from BLANK_CHARACTER spread or existing [])
            expect(backfilled.learnedCants).toEqual([]);
          }
        ),
        { numRuns: 100 },
      );
    });
  });
});
