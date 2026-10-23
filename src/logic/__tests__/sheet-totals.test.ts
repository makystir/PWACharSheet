import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { deriveSheetTotals } from '../sheet-totals';
import { useCharacter } from '../../hooks/useCharacter';
import type { Character, CharacteristicKey, CharacteristicValue, ArmourItem, WeaponItem } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

// Keep the hook's debounced save from touching storage during these tests.
vi.mock('../../storage/character-manager', () => ({
  saveCharacter: vi.fn(),
}));

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

/** Build a chars record from a flat map of totals (placed entirely in `i`). */
function charsFrom(values: Partial<Record<CharacteristicKey, number>>): Record<CharacteristicKey, CharacteristicValue> {
  return Object.fromEntries(
    CHAR_KEYS.map(k => [k, { i: values[k] ?? 0, a: 0, b: 0 }])
  ) as Record<CharacteristicKey, CharacteristicValue>;
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Fixture',
    species: 'Human / Reiklander',
    chars: charsFrom({ S: 35, T: 38, WP: 32 }),
    ...overrides,
  };
}

/**
 * Render useCharacter and return its final (post-backfill, post-sync-effects)
 * derived values, which are the AC2 reference for deriveSheetTotals.
 */
function hookTotals(character: Character) {
  const { result } = renderHook(() => useCharacter('fixture-id', character));
  return {
    totalWounds: result.current.totalWounds,
    armourPoints: result.current.armourPoints,
    maxEncumbrance: result.current.maxEncumbrance,
    coinWeight: result.current.coinWeight,
    character: result.current.character,
  };
}

const FIXTURES: Record<string, Character> = {
  'basic Reiklander': makeCharacter(),

  'Ogre (wound multiplier 2)': makeCharacter({
    species: 'Ogre',
    chars: charsFrom({ S: 45, T: 45, WP: 30 }),
  }),

  'Hardy + Strong Back + Sturdy talents': makeCharacter({
    chars: charsFrom({ S: 41, T: 42, WP: 35 }),
    talents: [
      { n: 'Hardy', lvl: 2, desc: '' },
      { n: 'Strong Back', lvl: 3, desc: '' },
      { n: 'Sturdy', lvl: 2, desc: '' },
    ],
  }),

  'unworn + worn===undefined armour': makeCharacter({
    armour: [
      { name: 'Helm', locations: 'Head', enc: '0', ap: 1, qualities: '', worn: true },
      { name: 'Mail Shirt', locations: 'Body', enc: '1', ap: 2, qualities: '', worn: false },
      // worn === undefined must be treated as worn.
      { name: 'Leather Jack', locations: 'Body, Arms', enc: '1', ap: 1, qualities: '' } as ArmourItem,
    ],
  }),

  'non-default rangedDamageSBMode ranged weapon': makeCharacter({
    houseRules: { ...BLANK_CHARACTER.houseRules, rangedDamageSBMode: 'halfSB' },
    weapons: [
      { name: 'Bow', group: 'Bow', enc: '1', damage: '+SB+3', qualities: '', maxR: '100' } as WeaponItem,
    ],
  }),
};

describe('deriveSheetTotals matches useCharacter returned values', () => {
  for (const [label, fixture] of Object.entries(FIXTURES)) {
    it(label, () => {
      const hook = hookTotals(fixture);
      // Derive from the same post-backfill character the hook actually used.
      const derived = deriveSheetTotals(hook.character);

      expect(derived.wounds.total).toBe(hook.totalWounds);
      expect(derived.armourPoints).toEqual(hook.armourPoints);
      expect(derived.maxEncumbrance).toBe(hook.maxEncumbrance);
      expect(derived.coinWeight).toBe(hook.coinWeight);
    });
  }
});
