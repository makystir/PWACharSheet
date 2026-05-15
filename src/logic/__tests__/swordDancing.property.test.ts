import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  getTechniqueById,
  getTechniqueXpCost,
  canLearnTechnique,
  learnTechnique,
} from '../swordDancing';
import { SWORD_DANCING_TECHNIQUES } from '../../data/swordDancingTechniques';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides };
}

// ─── Property 1: XP cost scales linearly with known technique count ─────────
// Feature: sword-dancing-techniques, Property 1: XP cost scales linearly with known technique count
// **Validates: Requirements 4.1, 4.3, 8.2**

describe('Property 1: XP cost scales linearly with known technique count', () => {
  it('for any valid count N (1–9), getTechniqueXpCost(N) returns exactly N * 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }),
        (n) => {
          expect(getTechniqueXpCost(n)).toBe(n * 100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Learning a technique produces correct state transformation ──
// Feature: sword-dancing-techniques, Property 2: Learning a technique produces correct state transformation
// **Validates: Requirements 5.1, 5.2, 5.3, 8.3**

describe('Property 2: Learning a technique produces correct state transformation', () => {
  it('deducts XP, increases xpSpent, appends technique id, and creates advancement log entry', () => {
    const allTechniqueIds = SWORD_DANCING_TECHNIQUES.map(t => t.id);

    // Generator: pick a random subset of techniques as "already learned", then pick one unlearned
    const charAndTechniqueArb = fc
      .integer({ min: 0, max: allTechniqueIds.length - 2 })
      .chain((learnedCount) => {
        // Generate a random subset of size learnedCount from all techniques
        return fc
          .shuffledSubarray(allTechniqueIds, { minLength: learnedCount, maxLength: learnedCount })
          .chain((learnedSubset) => {
            // Pick one unlearned technique
            const unlearned = allTechniqueIds.filter(id => !learnedSubset.includes(id));
            return fc.constantFrom(...unlearned).map((techniqueToLearn) => ({
              learnedSubset,
              techniqueToLearn,
            }));
          });
      });

    fc.assert(
      fc.property(charAndTechniqueArb, ({ learnedSubset, techniqueToLearn }) => {
        const knownCount = learnedSubset.length;
        const cost = getTechniqueXpCost(knownCount);
        const xpCur = cost + 500; // Ensure sufficient XP

        const char = makeCharacter({
          xpCur,
          xpSpent: 200,
          careerLevel: 'Swordmaster',
          talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
          learnedTechniques: [...learnedSubset],
          advancementLog: [],
        });

        const result = learnTechnique(char, techniqueToLearn);

        // (a) xpCur decreased by cost
        expect(result.xpCur).toBe(xpCur - cost);
        // (b) xpSpent increased by cost
        expect(result.xpSpent).toBe(200 + cost);
        // (c) technique id appended
        expect(result.learnedTechniques).toContain(techniqueToLearn);
        expect(result.learnedTechniques!.length).toBe(knownCount + 1);
        // (d) advancement log entry created
        const entry = result.advancementLog[result.advancementLog.length - 1];
        expect(entry.type).toBe('technique');
        expect(entry.xpCost).toBe(cost);
        const technique = getTechniqueById(techniqueToLearn);
        expect(entry.name).toBe(technique!.name);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 3: Guard conditions prevent invalid learning ───────────────────
// Feature: sword-dancing-techniques, Property 3: Guard conditions prevent invalid learning
// **Validates: Requirements 5.4, 5.5, 5.6, 8.4, 8.5, 8.6**

describe('Property 3: Guard conditions prevent invalid learning', () => {
  it('canLearnTechnique returns { canLearn: false } for all invalid states', () => {
    const allTechniqueIds = SWORD_DANCING_TECHNIQUES.map(t => t.id);

    // Case 1: Character without Sword-dancing talent
    const noTalentArb = fc.constantFrom(...allTechniqueIds).map((techniqueId) => ({
      char: makeCharacter({
        xpCur: 9999,
        talents: [{ n: 'Strike Mighty Blow', lvl: 1, desc: '' }],
        learnedTechniques: [],
      }),
      techniqueId,
      case: 'no-talent' as const,
    }));

    // Case 2: Character with insufficient XP
    const insufficientXpArb = fc
      .integer({ min: 1, max: 9 })
      .chain((learnedCount) => {
        return fc
          .shuffledSubarray(allTechniqueIds, { minLength: learnedCount, maxLength: learnedCount })
          .chain((learnedSubset) => {
            const unlearned = allTechniqueIds.filter(id => !learnedSubset.includes(id));
            if (unlearned.length === 0) {
              return fc.constant(null);
            }
            const cost = learnedCount * 100;
            // XP between 0 and cost-1 (insufficient)
            return fc.integer({ min: 0, max: cost - 1 }).chain((xp) => {
              return fc.constantFrom(...unlearned).map((techniqueId) => ({
                char: makeCharacter({
                  xpCur: xp,
                  talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
                  learnedTechniques: [...learnedSubset],
                }),
                techniqueId,
                case: 'insufficient-xp' as const,
              }));
            });
          });
      });

    // Case 3: Technique already learned
    const alreadyLearnedArb = fc
      .integer({ min: 1, max: 10 })
      .chain((learnedCount) => {
        return fc
          .shuffledSubarray(allTechniqueIds, { minLength: learnedCount, maxLength: learnedCount })
          .map((learnedSubset) => {
            // Pick one from the learned subset to try to learn again
            const techniqueId = learnedSubset[0];
            return {
              char: makeCharacter({
                xpCur: 9999,
                talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
                learnedTechniques: [...learnedSubset],
              }),
              techniqueId,
              case: 'already-learned' as const,
            };
          });
      });

    const invalidStateArb = fc.oneof(
      noTalentArb,
      insufficientXpArb.filter((v): v is NonNullable<typeof v> => v !== null),
      alreadyLearnedArb
    );

    fc.assert(
      fc.property(invalidStateArb, ({ char, techniqueId }) => {
        const result = canLearnTechnique(techniqueId, char);
        expect(result.canLearn).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Technique lookup round-trip ─────────────────────────────────
// Feature: sword-dancing-techniques, Property 4: Technique lookup round-trip
// **Validates: Requirements 8.7**

describe('Property 4: Technique lookup round-trip', () => {
  it('for any technique in SWORD_DANCING_TECHNIQUES, getTechniqueById returns the original object', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...SWORD_DANCING_TECHNIQUES),
        (technique) => {
          const result = getTechniqueById(technique.id);
          expect(result).toBeDefined();
          expect(result).toBe(technique);
          expect(result!.id).toBe(technique.id);
          expect(result!.name).toBe(technique.name);
          expect(result!.sl).toBe(technique.sl);
          expect(result!.order).toBe(technique.order);
          expect(result!.description).toBe(technique.description);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Adding learnedTechniques preserves all other character fields
// Feature: sword-dancing-techniques, Property 5: Adding learnedTechniques preserves all other character fields
// **Validates: Requirements 3.3, 9.1**

describe('Property 5: Adding learnedTechniques preserves all other character fields', () => {
  it('learnTechnique does not modify any field except xpCur, xpSpent, learnedTechniques, and advancementLog', () => {
    const allTechniqueIds = SWORD_DANCING_TECHNIQUES.map(t => t.id);

    const charAndTechniqueArb = fc
      .integer({ min: 0, max: allTechniqueIds.length - 2 })
      .chain((learnedCount) => {
        return fc
          .shuffledSubarray(allTechniqueIds, { minLength: learnedCount, maxLength: learnedCount })
          .chain((learnedSubset) => {
            const unlearned = allTechniqueIds.filter(id => !learnedSubset.includes(id));
            return fc.constantFrom(...unlearned).map((techniqueToLearn) => ({
              learnedSubset,
              techniqueToLearn,
            }));
          });
      });

    fc.assert(
      fc.property(charAndTechniqueArb, ({ learnedSubset, techniqueToLearn }) => {
        const knownCount = learnedSubset.length;
        const cost = getTechniqueXpCost(knownCount);

        const char = makeCharacter({
          name: 'Aelindra',
          species: 'High Elf',
          career: 'Swordmaster',
          careerLevel: 'Swordmaster',
          xpCur: cost + 1000,
          xpSpent: 300,
          talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
          learnedTechniques: [...learnedSubset],
          advancementLog: [],
        });

        const result = learnTechnique(char, techniqueToLearn);

        // All fields except xpCur, xpSpent, learnedTechniques, advancementLog must remain unchanged
        const fieldsToCheck: (keyof Character)[] = [
          '_v', 'name', 'species', 'class', 'career', 'careerLevel', 'careerPath',
          'status', 'age', 'height', 'hair', 'eyes', 'chars', 'charBonusOverrides',
          'move', 'fate', 'fortune', 'resilience', 'resolve', 'motivation',
          'speciesExtraPoints', 'speciesSkills', 'speciesTalents', 'woundsUseSB',
          'xpTotal', 'conditions', 'advantage', 'sessionState', 'combatState',
          'advancementLogArchive', 'sessionHistory', 'quickActions', 'criticalWounds',
          'bSkills', 'aSkills', 'talents', 'ambS', 'ambL', 'partyN', 'partyS',
          'partyL', 'partyM', 'psych', 'armour', 'ap', 'trappings',
          'wD', 'wSS', 'wGC', 'eMax', 'eMaxOverride', 'wSB', 'wTB2', 'wWPB',
          'wHardy', 'wCur', 'weapons', 'spells', 'channellingProgress', 'ammo',
          'corr', 'sin', 'muts', 'mutations', 'companions', 'estate',
          'endeavours', 'portrait', 'houseRules', 'knownRunes', 'log',
        ];

        for (const field of fieldsToCheck) {
          expect(result[field]).toEqual(char[field]);
        }
      }),
      { numRuns: 100 }
    );
  });
});
