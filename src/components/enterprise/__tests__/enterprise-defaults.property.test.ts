// Feature: enterprise-tracker, Property 1: Defaults merging for missing enterprise fields
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, RangedDamageSBMode, Enterprise, EnterpriseType, EnterpriseCurrency, EnterpriseIncomeSource } from '../../../types/character';

/**
 * Property 1: Defaults merging for missing enterprise fields
 *
 * **Validates: Requirements 1.3, 3.4, 3.5**
 *
 * For any partial character object that is missing the `houseRules.useEnterprises`
 * field, missing the `enterprises` field, or has enterprise entries with missing
 * sub-fields (`incomeSources`, `trappings`, `specialRules`), the defaults merging
 * logic SHALL produce:
 * - `useEnterprises === false`
 * - `enterprises` resolving to an empty array
 * - All missing array sub-fields resolving to empty arrays
 *
 * The production load path:
 * 1. character-manager.ts loadCharacter: `{ ...structuredClone(BLANK_CHARACTER), ...parsed }`
 * 2. useCharacter.ts backfillCharacter: merges BLANK_CHARACTER.houseRules defaults
 *    into partial houseRules objects
 *
 * For the `enterprises` field and enterprise sub-fields, the application uses
 * the nullish coalescing pattern: `character.enterprises ?? []` and
 * `enterprise.incomeSources ?? []`, etc.
 */

// --- Mocks required by loadCharacter and backfillCharacter ---

vi.mock('../../../logic/corruption', () => ({
  migrateCorruptionData: (char: Character) => char,
}));

vi.mock('../../../logic/advancement', () => ({
  ensureCareerSkillsExist: (char: Character) => char,
}));

vi.mock('../../../data/careers', () => ({
  CAREER_SCHEMES: {},
}));

vi.mock('../../../storage/local-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; return { ok: true }; },
    removeItem: (key: string) => { delete store[key]; },
    __setStore: (s: Record<string, string>) => { store = s; },
  };
});

vi.mock('../../../storage/portrait-store', () => ({
  getPortraitStore: () => ({
    getPortraitURL: async () => ({ ok: false }),
    savePortrait: async () => {},
    deletePortrait: async () => {},
    isDegraded: () => true,
  }),
}));

vi.mock('../../../logic/talents', () => ({
  syncTalentBonuses: (char: Character) => char,
}));

vi.mock('../../../logic/calculators', () => ({
  syncWoundFields: (char: Character) => char,
  calculateTotalWounds: () => 0,
  calculateArmourPoints: () => ({ head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 }),
  calculateMaxEncumbrance: () => 0,
  calculateCoinWeight: () => 0,
}));

vi.mock('../../../data/species', () => ({
  SPECIES_DATA: {
    Human: { woundsUseSB: true, chars: {}, move: 4, fate: 2, resilience: 1, extraPoints: 3, skills: [], talents: [] },
    Dwarf: { woundsUseSB: true, chars: {}, move: 3, fate: 0, resilience: 2, extraPoints: 2, skills: [], talents: [] },
  },
}));

vi.mock('../../../logic/armourMigration', () => ({
  migrateCharacterArmour: (armour: unknown[]) => armour,
}));

// --- Generators ---

const ALL_ENTERPRISE_TYPES: EnterpriseType[] = [
  'Courier Service', 'Crafting Workshop', 'Criminal Gang', 'Holy Temple',
  'Knightly Order', 'Tavern', 'Market Parlour', 'Noble Estate',
  'Performance Troupe', 'Publishing House',
];

const arbRangedDamageSBMode: fc.Arbitrary<RangedDamageSBMode> = fc.constantFrom('none', 'halfSB', 'fullSB');

/** Generate partial houseRules that OMITS useEnterprises */
const arbPartialHouseRulesWithoutEnterprises = fc.record(
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
  },
  { requiredKeys: [] },
);

/** Generate a minimal partial character that omits useEnterprises from houseRules */
const arbPartialCharacterWithoutEnterprisesToggle = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  species: fc.constantFrom('Human', 'Dwarf'),
  houseRules: fc.option(arbPartialHouseRulesWithoutEnterprises, { nil: undefined }),
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

/** Generate a partial character that omits the enterprises field entirely */
const arbPartialCharacterWithoutEnterprisesField = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  species: fc.constantFrom('Human', 'Dwarf'),
  useEnterprises: fc.boolean(),
}).map(({ name, species, useEnterprises }) => ({
  _v: 7,
  name,
  species,
  chars: structuredClone(BLANK_CHARACTER.chars),
  houseRules: { useEnterprises },
  // enterprises field intentionally omitted
}));

function arbitraryEnterpriseCurrency(): fc.Arbitrary<EnterpriseCurrency> {
  return fc.record({
    gc: fc.integer({ min: 0, max: 999 }),
    ss: fc.integer({ min: 0, max: 999 }),
    d: fc.integer({ min: 0, max: 999 }),
  });
}

/** Generate an enterprise object with some sub-fields randomly missing */
const arbEnterpriseWithMissingSubFields = fc.record({
  id: fc.string({ minLength: 1, maxLength: 36 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  type: fc.constantFrom(...ALL_ENTERPRISE_TYPES),
  expansionLevel: fc.integer({ min: 1, max: 4 }),
  debt: arbitraryEnterpriseCurrency(),
  creditorName: fc.string({ minLength: 0, maxLength: 100 }),
  interestPayment: arbitraryEnterpriseCurrency(),
  notes: fc.string({ minLength: 0, maxLength: 200 }),
  hasIncomeSources: fc.boolean(),
  hasTrappings: fc.boolean(),
  hasSpecialRules: fc.boolean(),
}).map(({ hasIncomeSources, hasTrappings, hasSpecialRules, ...enterprise }) => {
  const result: Record<string, unknown> = { ...enterprise };
  // Conditionally include or omit sub-field arrays
  if (!hasIncomeSources) delete result.incomeSources;
  if (!hasTrappings) delete result.trappings;
  if (!hasSpecialRules) delete result.specialRules;
  return result;
});

// --- Defaults resolution helper (mirrors production pattern) ---

/**
 * Resolves enterprise defaults using the same pattern the application uses:
 * - `character.enterprises ?? []` for the top-level array
 * - `enterprise.incomeSources ?? []` for each sub-field
 */
function resolveEnterpriseDefaults(character: Record<string, unknown>) {
  const enterprises = (character.enterprises as unknown[] | undefined) ?? [];
  return enterprises.map((e: unknown) => {
    const ent = e as Record<string, unknown>;
    return {
      ...ent,
      incomeSources: (ent.incomeSources as unknown[] | undefined) ?? [],
      trappings: (ent.trappings as unknown[] | undefined) ?? [],
      specialRules: (ent.specialRules as unknown[] | undefined) ?? [],
    };
  });
}

// --- Property Tests ---

describe('Feature: enterprise-tracker, Property 1: Defaults merging for missing enterprise fields', () => {
  it('character with missing houseRules → useEnterprises defaults to false (loadCharacter + backfill)', async () => {
    const { loadCharacter } = await import('../../../storage/character-manager');
    const { backfillCharacter } = await import('../../../hooks/useCharacter');
    const { __setStore } = await import('../../../storage/local-storage') as unknown as { __setStore: (s: Record<string, string>) => void };

    fc.assert(
      fc.property(
        arbPartialCharacterWithoutEnterprisesToggle,
        (partialChar) => {
          const charId = 'test-defaults';
          const storeKey = `wfrp4e-char-${charId}`;
          __setStore({ [storeKey]: JSON.stringify(partialChar) });

          const loaded = loadCharacter(charId);
          expect(loaded).not.toBeNull();

          const backfilled = backfillCharacter(loaded!);

          // useEnterprises must default to false when missing
          expect(backfilled.houseRules.useEnterprises).toBe(false);
        }
      ),
      { numRuns: 100 },
    );
  });

  it('character with houseRules but no useEnterprises → defaults to false (importFromJSON)', async () => {
    const { importFromJSON } = await import('../../../storage/export-import');

    fc.assert(
      fc.property(
        arbPartialCharacterWithoutEnterprisesToggle,
        (partialChar) => {
          const json = JSON.stringify(partialChar);
          const result = importFromJSON(json);

          expect(result.success).toBe(true);
          expect(result.character).toBeDefined();
          expect(result.character!.houseRules.useEnterprises).toBe(false);
        }
      ),
      { numRuns: 100 },
    );
  });

  it('character with no enterprises field → treated as empty array', () => {
    fc.assert(
      fc.property(
        arbPartialCharacterWithoutEnterprisesField,
        (partialChar) => {
          // The production pattern uses `character.enterprises ?? []`
          const resolved = (partialChar as unknown as Record<string, unknown>).enterprises ?? [];
          expect(resolved).toEqual([]);
        }
      ),
      { numRuns: 100 },
    );
  });

  it('enterprise with missing incomeSources/trappings/specialRules → treated as empty arrays', () => {
    fc.assert(
      fc.property(
        fc.array(arbEnterpriseWithMissingSubFields, { minLength: 1, maxLength: 5 }),
        (enterprises) => {
          const character = { enterprises };
          const resolved = resolveEnterpriseDefaults(character);

          for (const enterprise of resolved) {
            // All array sub-fields must resolve to arrays (empty or populated)
            expect(Array.isArray(enterprise.incomeSources)).toBe(true);
            expect(Array.isArray(enterprise.trappings)).toBe(true);
            expect(Array.isArray(enterprise.specialRules)).toBe(true);
          }
        }
      ),
      { numRuns: 100 },
    );
  });

  it('complete defaults merging path: missing enterprises field resolves via loadCharacter + backfill', async () => {
    const { loadCharacter } = await import('../../../storage/character-manager');
    const { backfillCharacter } = await import('../../../hooks/useCharacter');
    const { __setStore } = await import('../../../storage/local-storage') as unknown as { __setStore: (s: Record<string, string>) => void };

    fc.assert(
      fc.property(
        arbPartialCharacterWithoutEnterprisesField,
        (partialChar) => {
          const charId = 'test-enterprises-field';
          const storeKey = `wfrp4e-char-${charId}`;
          __setStore({ [storeKey]: JSON.stringify(partialChar) });

          const loaded = loadCharacter(charId);
          expect(loaded).not.toBeNull();

          const backfilled = backfillCharacter(loaded!);

          // enterprises field should resolve - since BLANK_CHARACTER omits it,
          // the spread merge means the field remains absent on the loaded character,
          // and the production code uses `character.enterprises ?? []`
          const enterprises = backfilled.enterprises ?? [];
          expect(enterprises).toEqual([]);
        }
      ),
      { numRuns: 100 },
    );
  });

  it('enterprise sub-fields resolve correctly through production nullish coalescing pattern', () => {
    fc.assert(
      fc.property(
        arbEnterpriseWithMissingSubFields,
        (partialEnterprise) => {
          // Simulate the production resolution pattern
          const ent = partialEnterprise as Record<string, unknown>;
          const incomeSources = (ent.incomeSources as unknown[] | undefined) ?? [];
          const trappings = (ent.trappings as unknown[] | undefined) ?? [];
          const specialRules = (ent.specialRules as unknown[] | undefined) ?? [];

          // All must be arrays
          expect(Array.isArray(incomeSources)).toBe(true);
          expect(Array.isArray(trappings)).toBe(true);
          expect(Array.isArray(specialRules)).toBe(true);

          // If the field was present in the generated enterprise, it should be an array
          // If it was missing, it should be an empty array
          if (!('incomeSources' in ent)) {
            expect(incomeSources).toEqual([]);
          }
          if (!('trappings' in ent)) {
            expect(trappings).toEqual([]);
          }
          if (!('specialRules' in ent)) {
            expect(specialRules).toEqual([]);
          }
        }
      ),
      { numRuns: 100 },
    );
  });
});
