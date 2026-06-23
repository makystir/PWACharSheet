import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { RUNE_CATALOGUE } from '../../data/runes';
import type { Character, Talent } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import { canLearnRune } from '../runes';

// ── Catalogue subsets ──

const PROTECTION_RUNES = RUNE_CATALOGUE.filter(r => r.category === 'protection');
const PROTECTION_NON_MASTER = PROTECTION_RUNES.filter(r => !r.isMaster);
const PROTECTION_MASTER = PROTECTION_RUNES.filter(r => r.isMaster);

const ENGINEERING_RUNES = RUNE_CATALOGUE.filter(r => r.category === 'engineering');
const ENGINEERING_NON_MASTER = ENGINEERING_RUNES.filter(r => !r.isMaster);
const ENGINEERING_MASTER = ENGINEERING_RUNES.filter(r => r.isMaster);

const DOOM_RUNE_IDS = RUNE_CATALOGUE.filter(r => r.category === 'doom').map(r => r.id);

// ── Helpers ──

/**
 * Creates a minimal Character for testing canLearnRune.
 * Sets high XP so XP check never blocks, no patronDeity so deity filter doesn't apply.
 */
function makeTestCharacter(overrides: {
  talents?: Talent[];
  knownRunes?: string[];
}): Character {
  return {
    ...BLANK_CHARACTER,
    xpCur: 10000, // High XP so the XP check never fails
    talents: overrides.talents ?? [],
    knownRunes: overrides.knownRunes ?? [],
  };
}

// ── Talent generators ──

/** Generates a valid "Rune Magic (Protection Runes)" or "Rune Magic (All Forms)" talent */
function protectionRuneMagicTalent(): fc.Arbitrary<Talent> {
  return fc.constantFrom(
    'Rune Magic (Protection Runes)',
    'Rune Magic (All Forms)'
  ).map(n => ({ n, lvl: 1, desc: 'Grants access to protection runes' }));
}

/** Generates a valid "Master Rune Magic (...)" talent for protection */
function masterProtectionRuneMagicTalent(): fc.Arbitrary<Talent> {
  return fc.constantFrom(
    'Master Rune Magic (Protection Runes)',
    'Master Rune Magic (Protective Runes)',
    'Master Rune Magic (All Forms)'
  ).map(n => ({ n, lvl: 1, desc: 'Master protection rune talent' }));
}

/** Generates a valid "Rune Magic (Engineering Runes)" or "Rune Magic (All Forms)" talent */
function engineeringRuneMagicTalent(): fc.Arbitrary<Talent> {
  return fc.constantFrom(
    'Rune Magic (Engineering Runes)',
    'Rune Magic (All Forms)'
  ).map(n => ({ n, lvl: 1, desc: 'Grants access to engineering runes' }));
}

/** Generates a valid "Master Rune Magic (...)" talent for engineering */
function masterEngineeringRuneMagicTalent(): fc.Arbitrary<Talent> {
  return fc.constantFrom(
    'Master Rune Magic (Engineering Runes)',
    'Master Rune Magic (All Forms)'
  ).map(n => ({ n, lvl: 1, desc: 'Master engineering rune talent' }));
}

/**
 * Generates talents that do NOT satisfy protection or engineering prerequisites.
 * Includes bare "Rune Magic" (no parenthetical) and unrelated talents.
 */
function insufficientTalents(): fc.Arbitrary<Talent[]> {
  const talentNames = [
    'Rune Magic',                        // bare - no parenthetical
    'Rune Magic (Weapon Runes)',
    'Rune Magic (Armour Runes)',
    'Hardy',
    'Strike Mighty Blow',
    'Craftsman (Stonemason)',
  ];
  return fc.subarray(talentNames, { minLength: 0, maxLength: 4 }).map(
    names => names.map(n => ({ n, lvl: 1, desc: 'Some talent' }))
  );
}

/**
 * Generates talents that do NOT satisfy master protection or master engineering prerequisites.
 * Includes non-master rune magic talents (even with protection/engineering parenthetical),
 * and bare "Master Rune Magic" without relevant parenthetical.
 */
function insufficientMasterTalents(): fc.Arbitrary<Talent[]> {
  const talentNames = [
    'Rune Magic (Protection Runes)',     // non-master - doesn't satisfy master requirement
    'Rune Magic (Engineering Runes)',    // non-master - doesn't satisfy master requirement
    'Master Rune Magic',                 // bare - no parenthetical (shouldn't exist but tests the logic)
    'Master Rune Magic (Weapon Runes)',  // wrong parenthetical for protection/engineering
    'Hardy',
  ];
  return fc.subarray(talentNames, { minLength: 0, maxLength: 4 }).map(
    names => names.map(n => ({ n, lvl: 1, desc: 'Some talent' }))
  );
}

// ── Property 11: Learning prerequisites for Protection and Engineering runes ──
// **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.6, 8.7**

describe('Property 11: Learning prerequisites for Protection and Engineering runes', () => {
  describe('Non-master Protection runes', () => {
    it('canLearn is true when character has appropriate Rune Magic talent', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PROTECTION_NON_MASTER.map(r => r.id)),
          protectionRuneMagicTalent(),
          (runeId, talent) => {
            const character = makeTestCharacter({ talents: [talent], knownRunes: [] });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('canLearn is false when character lacks appropriate talent', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PROTECTION_NON_MASTER.map(r => r.id)),
          insufficientTalents(),
          (runeId, talents) => {
            const character = makeTestCharacter({ talents, knownRunes: [] });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('bare "Rune Magic" (no parenthetical) does NOT satisfy protection prerequisite', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PROTECTION_NON_MASTER.map(r => r.id)),
          (runeId) => {
            const character = makeTestCharacter({
              talents: [{ n: 'Rune Magic', lvl: 1, desc: 'Bare rune magic' }],
              knownRunes: [],
            });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Master Protection runes', () => {
    it('canLearn is true when character has Master Rune Magic with appropriate parenthetical', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PROTECTION_MASTER.map(r => r.id)),
          masterProtectionRuneMagicTalent(),
          (runeId, talent) => {
            const character = makeTestCharacter({ talents: [talent], knownRunes: [] });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('canLearn is false when character lacks Master Rune Magic talent with appropriate parenthetical', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...PROTECTION_MASTER.map(r => r.id)),
          insufficientMasterTalents().filter(talents =>
            // Ensure no talent satisfies master protection requirement
            !talents.some(t =>
              t.n.startsWith('Master Rune Magic') &&
              (t.n.includes('(Protection Runes)') || t.n.includes('(Protective Runes)') || t.n.includes('(All Forms)'))
            )
          ),
          (runeId, talents) => {
            const character = makeTestCharacter({ talents, knownRunes: [] });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Non-master Engineering runes', () => {
    it('canLearn is true when character has appropriate Rune Magic talent', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ENGINEERING_NON_MASTER.map(r => r.id)),
          engineeringRuneMagicTalent(),
          (runeId, talent) => {
            const character = makeTestCharacter({ talents: [talent], knownRunes: [] });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('canLearn is false when character lacks appropriate talent', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ENGINEERING_NON_MASTER.map(r => r.id)),
          insufficientTalents(),
          (runeId, talents) => {
            const character = makeTestCharacter({ talents, knownRunes: [] });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('bare "Rune Magic" (no parenthetical) does NOT satisfy engineering prerequisite', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ENGINEERING_NON_MASTER.map(r => r.id)),
          (runeId) => {
            const character = makeTestCharacter({
              talents: [{ n: 'Rune Magic', lvl: 1, desc: 'Bare rune magic' }],
              knownRunes: [],
            });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Master Engineering runes', () => {
    it('canLearn is true when character has Master Rune Magic with appropriate parenthetical', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ENGINEERING_MASTER.map(r => r.id)),
          masterEngineeringRuneMagicTalent(),
          (runeId, talent) => {
            const character = makeTestCharacter({ talents: [talent], knownRunes: [] });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('canLearn is false when character lacks Master Rune Magic talent with appropriate parenthetical', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ENGINEERING_MASTER.map(r => r.id)),
          insufficientMasterTalents().filter(talents =>
            // Ensure no talent satisfies master engineering requirement
            !talents.some(t =>
              t.n.startsWith('Master Rune Magic') &&
              (t.n.includes('(Engineering Runes)') || t.n.includes('(All Forms)'))
            )
          ),
          (runeId, talents) => {
            const character = makeTestCharacter({ talents, knownRunes: [] });
            const result = canLearnRune(runeId, character);
            expect(result.canLearn).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ── Property 12: Doom Runes cannot be learned individually ──
// **Validates: Requirements 8.6**

describe('Property 12: Doom Runes cannot be learned individually', () => {
  it('canLearnRune returns canLearn: false for any doom rune regardless of character talents', () => {
    // Generate a character with arbitrary talent combinations (including Master Rune Magic)
    const arbitraryTalents = fc.array(
      fc.record({
        n: fc.constantFrom(
          'Rune Magic (All Forms)',
          'Master Rune Magic (All Forms)',
          'Rune Magic (Protection Runes)',
          'Master Rune Magic (Engineering Runes)',
          'Hardy',
          'Strike Mighty Blow',
        ),
        lvl: fc.integer({ min: 1, max: 5 }),
        desc: fc.constant('Test talent'),
      }),
      { minLength: 0, maxLength: 5 }
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...DOOM_RUNE_IDS),
        arbitraryTalents,
        (runeId, talents) => {
          const character = makeTestCharacter({ talents, knownRunes: [] });
          const result = canLearnRune(runeId, character);
          expect(result.canLearn).toBe(false);
          expect(result.error).toContain('auto');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('error message mentions auto-granting for doom runes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DOOM_RUNE_IDS),
        (runeId) => {
          const character = makeTestCharacter({
            talents: [{ n: 'Master Rune Magic (All Forms)', lvl: 1, desc: 'Has everything' }],
            knownRunes: [],
          });
          const result = canLearnRune(runeId, character);
          expect(result.canLearn).toBe(false);
          expect(result.error).toBe(
            'Doom Runes are only granted automatically upon acquiring the Master Rune Magic talent.'
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
