import { describe, it, expect, vi } from 'vitest';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';
import { backfillCharacter } from '../useCharacter';
import { importFromJSON, exportToJSON } from '../../storage/export-import';

/**
 * Integration tests for backfill and import compatibility with houseRules.
 *
 * Validates: Requirements 1.3, 6.1, 6.2, 6.3
 */

// Mock species data and storage to avoid side effects in backfillCharacter
vi.mock('../../data/species', () => ({
  SPECIES_DATA: {
    Human: { woundsUseSB: true, chars: {}, move: 4, fate: 2, resilience: 1, extraPoints: 3, skills: [], talents: [] },
  },
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

const RAW_DEFAULTS = {
  rangedDamageSBMode: 'none' as const,
  impaleCritsOnTens: false,
  min1Wound: true,
  advantageCap: 10,
};

/** Create a character missing the houseRules field (simulates pre-feature data). */
function makeLegacyCharacter(): Character {
  const char = structuredClone(BLANK_CHARACTER);
  // Remove houseRules to simulate a character saved before the feature existed
  delete (char as unknown as Record<string, unknown>).houseRules;
  return char as Character;
}

describe('Backfill — character loaded without houseRules', () => {
  it('backfillCharacter adds RAW defaults when houseRules is missing', () => {
    const legacy = makeLegacyCharacter();
    expect((legacy as unknown as Record<string, unknown>).houseRules).toBeUndefined();

    const patched = backfillCharacter(legacy);

    expect(patched.houseRules).toBeDefined();
    expect(patched.houseRules).toEqual(RAW_DEFAULTS);
  });

  it('backfillCharacter preserves existing houseRules when present', () => {
    const char = structuredClone(BLANK_CHARACTER);
    char.houseRules = {
      rangedDamageSBMode: 'fullSB',
      impaleCritsOnTens: true,
      min1Wound: false,
      advantageCap: 0,
    };

    const patched = backfillCharacter(char);

    expect(patched.houseRules).toEqual({
      rangedDamageSBMode: 'fullSB',
      impaleCritsOnTens: true,
      min1Wound: false,
      advantageCap: 0,
    });
  });
});

describe('Import — character imported without houseRules', () => {
  it('deep merge fills RAW defaults when houseRules is absent', () => {
    const importData = {
      _v: 6,
      name: 'Old Export',
      species: 'Human',
      chars: structuredClone(BLANK_CHARACTER.chars),
    };
    const json = JSON.stringify(importData);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character!.houseRules).toBeDefined();
    expect(result.character!.houseRules).toEqual(RAW_DEFAULTS);
  });

  it('deep merge fills RAW defaults for a v5 import without houseRules', () => {
    const importData = {
      _v: 5,
      name: 'Legacy v5',
      species: 'Human',
      chars: structuredClone(BLANK_CHARACTER.chars),
    };
    const json = JSON.stringify(importData);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character!._v).toBe(6);
    expect(result.character!.houseRules).toEqual(RAW_DEFAULTS);
  });
});

describe('Import — character imported with custom houseRules', () => {
  it('preserves all custom houseRules values on import', () => {
    const customRules = {
      rangedDamageSBMode: 'halfSB',
      impaleCritsOnTens: true,
      min1Wound: false,
      advantageCap: 5,
    };
    const importData = {
      _v: 6,
      name: 'Custom Rules',
      species: 'Human',
      chars: structuredClone(BLANK_CHARACTER.chars),
      houseRules: customRules,
    };
    const json = JSON.stringify(importData);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character!.houseRules).toEqual(customRules);
  });

  it('preserves fullSB rangedDamageSBMode on import', () => {
    const importData = {
      _v: 6,
      name: 'Full SB User',
      species: 'Human',
      chars: structuredClone(BLANK_CHARACTER.chars),
      houseRules: {
        rangedDamageSBMode: 'fullSB',
        impaleCritsOnTens: false,
        min1Wound: true,
        advantageCap: 10,
      },
    };
    const json = JSON.stringify(importData);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character!.houseRules.rangedDamageSBMode).toBe('fullSB');
  });

  it('preserves uncapped advantage (0) on import', () => {
    const importData = {
      _v: 6,
      name: 'Uncapped',
      species: 'Human',
      chars: structuredClone(BLANK_CHARACTER.chars),
      houseRules: {
        rangedDamageSBMode: 'none',
        impaleCritsOnTens: false,
        min1Wound: true,
        advantageCap: 0,
      },
    };
    const json = JSON.stringify(importData);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character!.houseRules.advantageCap).toBe(0);
  });

  it('round-trips a character with custom houseRules through export/import', () => {
    const original = structuredClone(BLANK_CHARACTER);
    original.name = 'Round Trip';
    original.species = 'Human';
    original.houseRules = {
      rangedDamageSBMode: 'halfSB',
      impaleCritsOnTens: true,
      min1Wound: false,
      advantageCap: 20,
    };

    const json = exportToJSON(original);
    const result = importFromJSON(json);

    expect(result.success).toBe(true);
    expect(result.character!.houseRules).toEqual(original.houseRules);
  });
});
