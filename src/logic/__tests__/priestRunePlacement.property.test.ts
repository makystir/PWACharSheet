import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ANCESTOR_GODS } from '../../data/deityRunes';
import type { AncestorGod } from '../../data/deityRunes';
import { RUNE_CATALOGUE } from '../../data/runes';
import type { RuneCategory } from '../../data/runes';
import { validateRunePlacement, canLearnRune } from '../runes';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

// Feature: dwarf-runic-magic, Property 8: Priest Rune Validation Matches Runesmith Rules
// **Validates: Requirements 4.4, 4.5**

/**
 * Priest career level titles used to build valid priest characters.
 * We use titles that `isPriestCareer` and `shouldApplyDeityFilter` will recognise.
 */
const PRIEST_CAREER_LEVELS = [
  { career: 'Initiate of Gazul', level: 1 },
  { career: 'Doom Priest', level: 2 },
  { career: 'High Doom Priest', level: 3 },
  { career: 'Arch Doom Priest', level: 4 },
  { career: 'Initiate of Morgrim', level: 1 },
  { career: 'Forge Priest', level: 2 },
  { career: 'High Forge Priest', level: 3 },
  { career: 'Arch Forge Priest', level: 4 },
  { career: 'Initiate of Valaya', level: 1 },
  { career: 'Hearth Priest', level: 2 },
  { career: 'High Hearth Priest', level: 3 },
  { career: 'Arch Hearth Priest', level: 4 },
] as const;

const RUNESMITH_CAREER_LEVELS = [
  'Apprentice Runesmith',
  'Runesmith',
  'Master Runesmith',
  'Runelord',
] as const;

// Categorised rune IDs from RUNE_CATALOGUE
const weaponRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'weapon' && !r.isMaster).map(r => r.id);
const armourRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'armour' && !r.isMaster).map(r => r.id);
const talismanRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'talisman' && !r.isMaster).map(r => r.id);
const masterWeaponRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'weapon' && r.isMaster).map(r => r.id);
const masterArmourRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'armour' && r.isMaster).map(r => r.id);
const masterTalismanRuneIds = RUNE_CATALOGUE.filter(r => r.category === 'talisman' && r.isMaster).map(r => r.id);
const allStandardRuneIds = RUNE_CATALOGUE.filter(r => !r.isMaster && (r.category === 'weapon' || r.category === 'armour' || r.category === 'talisman')).map(r => r.id);
const allMasterRuneIds = RUNE_CATALOGUE.filter(r => r.isMaster && (r.category === 'weapon' || r.category === 'armour' || r.category === 'talisman')).map(r => r.id);
const allRuneIds = RUNE_CATALOGUE.map(r => r.id);

/** Generator for a priest career entry */
const priestCareerArb = fc.constantFrom(...PRIEST_CAREER_LEVELS);

/** Generator for any deity */
const deityArb = fc.constantFrom(...ANCESTOR_GODS);

/** Helper to build a priest character with Rune Magic talent and a valid deity */
function makePriestCharacter(overrides: Partial<Character>): Character {
  return {
    ...BLANK_CHARACTER,
    species: 'Dwarf',
    career: 'Doom Priest',
    careerLevel: 'Doom Priest',
    patronDeity: 'Gazul',
    xpCur: 500,
    talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
    ...overrides,
  };
}

/** Helper to build a Runesmith character for comparison */
function makeRunesmithCharacter(overrides: Partial<Character>): Character {
  return {
    ...BLANK_CHARACTER,
    species: 'Dwarf',
    career: 'Runesmith',
    careerLevel: 'Runesmith',
    xpCur: 500,
    talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
    ...overrides,
  };
}

describe('Property 8: Priest Rune Validation Matches Runesmith Rules', () => {
  // --- Sub-property 1: Max 3 runes per item applies to priests ---
  describe('Max 3 runes per item applies identically to priests', () => {
    it('rejects a 4th rune on an item regardless of priest deity or career level', () => {
      fc.assert(
        fc.property(
          priestCareerArb,
          deityArb,
          fc.constantFrom(...allRuneIds),
          // Generate 3 existing runes that are valid on a weapon (weapon or talisman category)
          fc.tuple(
            fc.constantFrom(...[...weaponRuneIds, ...talismanRuneIds]),
            fc.constantFrom(...[...weaponRuneIds, ...talismanRuneIds]),
            fc.constantFrom(...[...weaponRuneIds, ...talismanRuneIds])
          ),
          (priestCareer, deity, newRuneId, [rune1, rune2, rune3]) => {
            const currentRunes = [rune1, rune2, rune3];
            // validateRunePlacement doesn't depend on character — it's purely item-based
            const result = validateRunePlacement(newRuneId, currentRunes, 'weapon');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('This item already has the maximum of 3 runes.');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('result is identical for priest and Runesmith when item has 3 runes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allRuneIds),
          fc.tuple(
            fc.constantFrom(...[...armourRuneIds, ...talismanRuneIds]),
            fc.constantFrom(...[...armourRuneIds, ...talismanRuneIds]),
            fc.constantFrom(...[...armourRuneIds, ...talismanRuneIds])
          ),
          (newRuneId, [rune1, rune2, rune3]) => {
            const currentRunes = [rune1, rune2, rune3];
            // Both should give same result — validateRunePlacement is character-agnostic
            const result = validateRunePlacement(newRuneId, currentRunes, 'armour');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('This item already has the maximum of 3 runes.');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // --- Sub-property 2: Max 1 Master Rune per item applies to priests ---
  describe('Max 1 Master Rune per item applies identically to priests', () => {
    it('rejects a 2nd master rune on a weapon that already has one', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...masterWeaponRuneIds),
          fc.constantFrom(...masterWeaponRuneIds),
          (existingMaster, newMaster) => {
            const result = validateRunePlacement(newMaster, [existingMaster], 'weapon');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('This item already has a Master Rune. Only one Master Rune is allowed per item.');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects a 2nd master rune on armour that already has one', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...masterArmourRuneIds),
          fc.constantFrom(...[...masterArmourRuneIds, ...masterTalismanRuneIds]),
          (existingMaster, newMaster) => {
            const result = validateRunePlacement(newMaster, [existingMaster], 'armour');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('This item already has a Master Rune. Only one Master Rune is allowed per item.');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // --- Sub-property 3: Category restrictions apply identically to priests ---
  describe('Category restrictions apply identically to priests', () => {
    it('weapon runes are rejected on armour', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...weaponRuneIds),
          (weaponRuneId) => {
            const result = validateRunePlacement(weaponRuneId, [], 'armour');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Weapon runes cannot be placed on armour.');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('armour runes are rejected on weapons', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...armourRuneIds),
          (armourRuneId) => {
            const result = validateRunePlacement(armourRuneId, [], 'weapon');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Armour runes cannot be placed on weapons.');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('talisman runes are accepted on both weapons and armour', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...talismanRuneIds),
          fc.constantFrom('weapon' as const, 'armour' as const),
          (talismanRuneId, itemType) => {
            const result = validateRunePlacement(talismanRuneId, [], itemType);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // --- Sub-property 4: Talent prerequisites apply identically to priests ---
  describe('Talent prerequisites apply identically to priests', () => {
    it('priest without Rune Magic talent cannot learn standard runes', () => {
      fc.assert(
        fc.property(
          priestCareerArb,
          fc.constantFrom(...allStandardRuneIds),
          (priestCareer, runeId) => {
            const char = makePriestCharacter({
              career: priestCareer.career,
              careerLevel: priestCareer.career,
              patronDeity: undefined, // No deity restriction — isolate talent check
              talents: [], // No Rune Magic talent
              xpCur: 500,
            });
            const result = canLearnRune(runeId, char);
            expect(result.canLearn).toBe(false);
            expect(result.error).toBe('Requires Rune Magic talent.');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('priest without Master Rune Magic talent cannot learn master runes', () => {
      fc.assert(
        fc.property(
          priestCareerArb,
          fc.constantFrom(...allMasterRuneIds),
          (priestCareer, runeId) => {
            const char = makePriestCharacter({
              career: priestCareer.career,
              careerLevel: priestCareer.career,
              patronDeity: undefined, // No deity restriction — isolate talent check
              talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }], // Only standard, no Master
              xpCur: 500,
            });
            const result = canLearnRune(runeId, char);
            expect(result.canLearn).toBe(false);
            expect(result.error).toBe('Requires Master Rune Magic talent.');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('talent prerequisite behaviour is identical for priest and Runesmith', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allStandardRuneIds),
          (runeId) => {
            // Priest without talent — no deity restriction to isolate talent check
            const priest = makePriestCharacter({
              patronDeity: undefined,
              talents: [],
              xpCur: 500,
            });
            // Runesmith without talent
            const runesmith = makeRunesmithCharacter({
              talents: [],
              xpCur: 500,
            });

            const priestResult = canLearnRune(runeId, priest);
            const runesmithResult = canLearnRune(runeId, runesmith);

            // Both should fail with same error
            expect(priestResult.canLearn).toBe(false);
            expect(runesmithResult.canLearn).toBe(false);
            expect(priestResult.error).toBe(runesmithResult.error);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('talent prerequisite for master runes is identical for priest and Runesmith', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...allMasterRuneIds),
          (runeId) => {
            // Priest with only Rune Magic (not Master Rune Magic) — no deity restriction
            const priest = makePriestCharacter({
              patronDeity: undefined,
              talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
              xpCur: 500,
            });
            // Runesmith with only Rune Magic (not Master Rune Magic)
            const runesmith = makeRunesmithCharacter({
              talents: [{ n: 'Rune Magic', lvl: 1, desc: '' }],
              xpCur: 500,
            });

            const priestResult = canLearnRune(runeId, priest);
            const runesmithResult = canLearnRune(runeId, runesmith);

            // Both should fail with same error
            expect(priestResult.canLearn).toBe(false);
            expect(runesmithResult.canLearn).toBe(false);
            expect(priestResult.error).toBe(runesmithResult.error);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
