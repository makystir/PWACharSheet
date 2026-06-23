import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { RUNE_CATALOGUE } from '../../data/runes';
import type { Talent, DoomRuneActivation } from '../../types/character';
import {
  getDoomRunesForCharacter,
  activateDoomRune,
  shouldAutoLearnDoomRunes,
} from '../doomRunes';

// ── Generators ──

const DOOM_RUNE_IDS = [
  'rune-of-hearth-and-home',
  'rune-of-oath-and-steel',
  'rune-of-wrath-and-ruin',
] as const;

const MASTER_RUNE_IDS = RUNE_CATALOGUE.filter(r => r.isMaster).map(r => r.id);

/**
 * Generator for 0-3 DoomRuneActivation entries with valid doom rune IDs.
 */
function arbitraryDoomActivations(): fc.Arbitrary<DoomRuneActivation[]> {
  return fc.array(
    fc.record({
      runeId: fc.constantFrom(...DOOM_RUNE_IDS),
      timestamp: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
      label: fc.string({ minLength: 1, maxLength: 60 }),
    }),
    { minLength: 0, maxLength: 3 }
  );
}

/**
 * Generator for a character with specific talent configurations.
 * Returns a talents array and knownRunes array.
 */
function arbitraryCharacterWithTalents(talents: Talent[]): fc.Arbitrary<{ talents: Talent[]; knownRunes: string[] }> {
  // Generate a knownRunes array that may or may not include doom rune IDs
  const allRuneIds = RUNE_CATALOGUE.map(r => r.id);
  return fc.subarray(allRuneIds).map(knownRunes => ({
    talents,
    knownRunes,
  }));
}

// ── Property 9: Doom Rune availability follows master rune knowledge ──
// **Validates: Requirements 7.1**

describe('Property 9: Doom Rune availability follows master rune knowledge', () => {
  it('character with at least one master rune in knownRunes gets exactly 3 doom runes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...MASTER_RUNE_IDS).chain(masterRuneId => {
          // Generate knownRunes containing at least this master rune
          const allRuneIds = RUNE_CATALOGUE.map(r => r.id);
          return fc.subarray(allRuneIds).map(extras => {
            const knownRunes = new Set([...extras, masterRuneId]);
            return [...knownRunes];
          });
        }),
        (knownRunes) => {
          const result = getDoomRunesForCharacter(knownRunes);
          expect(result).toHaveLength(3);
          // All returned runes are doom category
          for (const rune of result) {
            expect(rune.category).toBe('doom');
          }
          // IDs match exactly the 3 doom runes
          const ids = result.map(r => r.id).sort();
          expect(ids).toEqual([...DOOM_RUNE_IDS].sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('character with no master runes in knownRunes gets empty array', () => {
    // Get all non-master rune IDs
    const nonMasterRuneIds = RUNE_CATALOGUE.filter(r => !r.isMaster).map(r => r.id);

    fc.assert(
      fc.property(
        fc.subarray(nonMasterRuneIds),
        (knownRunes) => {
          const result = getDoomRunesForCharacter(knownRunes);
          expect(result).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 10: Doom Rune single-activation enforcement ──
// **Validates: Requirements 7.2, 7.3, 7.5**

describe('Property 10: Doom Rune single-activation enforcement', () => {
  it('activating a doom rune already in the activations array returns success: false', () => {
    fc.assert(
      fc.property(
        arbitraryDoomActivations().filter(acts => acts.length > 0),
        (activations) => {
          // Pick a runeId that's already activated
          const existingRuneId = activations[0].runeId;
          const result = activateDoomRune(existingRuneId, activations);
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.activation).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('activating a doom rune NOT in the activations array returns success: true with valid activation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DOOM_RUNE_IDS),
        arbitraryDoomActivations(),
        (runeId, activations) => {
          // Filter out any existing activations for this runeId so it's not already present
          const filteredActivations = activations.filter(a => a.runeId !== runeId);

          const result = activateDoomRune(runeId, filteredActivations);
          expect(result.success).toBe(true);
          expect(result.activation).toBeDefined();
          expect(result.activation!.runeId).toBe(runeId);
          expect(result.activation!.timestamp).toBeGreaterThan(0);
          expect(result.activation!.label.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('activateDoomRune does not modify the original activations array', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DOOM_RUNE_IDS),
        arbitraryDoomActivations(),
        (runeId, activations) => {
          const originalLength = activations.length;
          const originalCopy = [...activations];

          activateDoomRune(runeId, activations);

          // The original array must not be mutated
          expect(activations.length).toBe(originalLength);
          expect(activations).toEqual(originalCopy);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 13: Doom Rune auto-learning trigger ──
// **Validates: Requirements 8.5**

describe('Property 13: Doom Rune auto-learning trigger', () => {
  const masterRuneMagicTalent: Talent = {
    n: 'Master Rune Magic (All Forms)',
    lvl: 1,
    desc: 'Master of all rune forms',
  };

  const nonMasterTalents: Talent[] = [
    { n: 'Rune Magic (Weapon Runes)', lvl: 1, desc: 'Basic rune magic' },
    { n: 'Hardy', lvl: 2, desc: 'Extra tough' },
    { n: 'Strike Mighty Blow', lvl: 1, desc: 'Hit harder' },
  ];

  it('character with Master Rune Magic talent and NOT all doom runes known returns true', () => {
    fc.assert(
      fc.property(
        arbitraryCharacterWithTalents([masterRuneMagicTalent]).filter(
          ({ knownRunes }) => !DOOM_RUNE_IDS.every(id => knownRunes.includes(id))
        ),
        ({ talents, knownRunes }) => {
          const result = shouldAutoLearnDoomRunes(knownRunes, talents);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('character with Master Rune Magic talent who already knows ALL doom runes returns false', () => {
    fc.assert(
      fc.property(
        arbitraryCharacterWithTalents([masterRuneMagicTalent]).map(({ talents, knownRunes }) => ({
          talents,
          // Ensure all 3 doom rune IDs are in knownRunes
          knownRunes: [...new Set([...knownRunes, ...DOOM_RUNE_IDS])],
        })),
        ({ talents, knownRunes }) => {
          const result = shouldAutoLearnDoomRunes(knownRunes, talents);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('character without Master Rune Magic talent always returns false', () => {
    fc.assert(
      fc.property(
        fc.subarray(nonMasterTalents),
        fc.subarray(RUNE_CATALOGUE.map(r => r.id)),
        (talents, knownRunes) => {
          const result = shouldAutoLearnDoomRunes(knownRunes, talents);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
