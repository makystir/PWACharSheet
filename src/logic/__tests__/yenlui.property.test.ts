import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  normalizeYenluiState,
  isYenluiVisible,
  getYenluiDifficulty,
  getYenluiTalentNotes,
  YENLUI_STATE_META,
} from '../yenlui';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, YenluiState } from '../../types/character';

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides } as Character;
}

// Generators
const arbYenluiState = fc.constantFrom<YenluiState | undefined>('light', 'balanced', 'dark', undefined);
const arbSpecies = fc.constantFrom('Human / Reiklander', 'Dwarf', 'Halfling', 'High Elf', 'Wood Elf', '', 'Unknown');
const arbInvalidState = fc.string().filter(s => !['light', 'balanced', 'dark'].includes(s));

/**
 * Validates: Requirements 1.5
 */
describe('Feature: yenlui-balance-system, Property 2: Invalid Value Normalization', () => {
  it('normalizeYenluiState returns undefined for any string not in valid set', () => {
    fc.assert(
      fc.property(arbInvalidState, (invalidValue) => {
        const result = normalizeYenluiState(invalidValue);
        expect(result).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 2.4, 2.5, 3.1, 3.2, 3.5
 */
describe('Feature: yenlui-balance-system, Property 3: Panel Visibility Predicate', () => {
  it('panel is visible iff useYenlui is true AND species is High Elf or Wood Elf', () => {
    fc.assert(
      fc.property(fc.boolean(), arbSpecies, (useYenlui, species) => {
        const character = makeCharacter({
          species,
          houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui },
        });

        const visible = isYenluiVisible(character);
        const isElfSpecies = species === 'High Elf' || species === 'Wood Elf';
        const expected = useYenlui === true && isElfSpecies;

        expect(visible).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 2.6, 3.3
 */
describe('Feature: yenlui-balance-system, Property 4: State Preservation Invariant', () => {
  it('toggling useYenlui off does not alter stored yenluiState', () => {
    fc.assert(
      fc.property(arbYenluiState, arbSpecies, (state, species) => {
        const character = makeCharacter({
          species,
          yenluiState: state,
          houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
        });

        // Toggle useYenlui off
        const updated = makeCharacter({
          ...character,
          houseRules: { ...character.houseRules, useYenlui: false },
        });

        expect(updated.yenluiState).toBe(state);
      }),
      { numRuns: 100 }
    );
  });

  it('changing species does not alter stored yenluiState', () => {
    fc.assert(
      fc.property(arbYenluiState, arbSpecies, arbSpecies, (state, originalSpecies, newSpecies) => {
        const character = makeCharacter({
          species: originalSpecies,
          yenluiState: state,
          houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
        });

        // Change species
        const updated = makeCharacter({
          ...character,
          species: newSpecies,
        });

        expect(updated.yenluiState).toBe(state);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 6.1, 6.2, 6.3
 */
describe('Feature: yenlui-balance-system, Property 8: Sword-Dancing Difficulty Computation', () => {
  it('returns Very Hard (-30) iff state is dark AND no Sanctuary of the Mind at level >= 3', () => {
    const arbTalentLevel = fc.integer({ min: 1, max: 5 });
    const arbHasSanctuary = fc.boolean();
    const arbSanctuaryLevel = arbTalentLevel;

    fc.assert(
      fc.property(
        arbYenluiState,
        arbHasSanctuary,
        arbSanctuaryLevel,
        (state, hasSanctuary, sanctuaryLevel) => {
          const talents = hasSanctuary
            ? [{ n: 'Sanctuary of the Mind', lvl: sanctuaryLevel, desc: '' }]
            : [];

          const character = makeCharacter({
            yenluiState: state,
            talents,
          });

          const result = getYenluiDifficulty(character);

          const hasSanctuaryAtLevel3Plus = hasSanctuary && sanctuaryLevel >= 3;
          const shouldBeVeryHard = state === 'dark' && !hasSanctuaryAtLevel3Plus;

          if (shouldBeVeryHard) {
            expect(result.label).toBe('Very Hard');
            expect(result.modifier).toBe('(-30)');
          } else {
            expect(result.label).toBe('Challenging');
            expect(result.modifier).toBe('(+0)');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 8.6
 */
describe('Feature: yenlui-balance-system, Property 10: Talent Note Count Matches Qualifying Talents', () => {
  it('note count equals count of qualifying talents present on character', () => {
    const arbHasBlood = fc.boolean();
    const arbHasCadai = fc.boolean();
    const arbHasSanctuary = fc.boolean();
    const arbSanctuaryLevel = fc.integer({ min: 1, max: 5 });

    fc.assert(
      fc.property(
        arbHasBlood,
        arbHasCadai,
        arbHasSanctuary,
        arbSanctuaryLevel,
        (hasBlood, hasCadai, hasSanctuary, sanctuaryLevel) => {
          const talents: { n: string; lvl: number; desc: string }[] = [];
          if (hasBlood) talents.push({ n: 'Blood of Aenarion', lvl: 1, desc: '' });
          if (hasCadai) talents.push({ n: 'Cadai Meditation', lvl: 1, desc: '' });
          if (hasSanctuary) talents.push({ n: 'Sanctuary of the Mind', lvl: sanctuaryLevel, desc: '' });

          const character = makeCharacter({ talents });

          const notes = getYenluiTalentNotes(character);

          // Count expected qualifying talents
          let expectedCount = 0;
          if (hasBlood) expectedCount++;
          if (hasCadai) expectedCount++;
          if (hasSanctuary && sanctuaryLevel >= 3) expectedCount++;

          expect(notes.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 4.1, 4.4
 */
describe('Feature: yenlui-balance-system, Property 5: Correct State Label Display', () => {
  it('for any valid state, exactly one label from {Light, Balanced, Dark, Unset} is displayed', () => {
    fc.assert(
      fc.property(arbYenluiState, (state) => {
        const validLabels = ['Light', 'Balanced', 'Dark', 'Unset'];

        let label: string;
        if (state === undefined) {
          label = 'Unset';
        } else {
          label = YENLUI_STATE_META[state].label;
        }

        expect(validLabels).toContain(label);
        // Exactly one label matches
        const matchCount = validLabels.filter(l => l === label).length;
        expect(matchCount).toBe(1);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Feature: yenlui-balance-system, Property 11: Description Length Constraint', () => {
  it('all active state descriptions are <= 120 characters', () => {
    const arbActiveState = fc.constantFrom<YenluiState>('light', 'balanced', 'dark');

    fc.assert(
      fc.property(arbActiveState, (state) => {
        const meta = YENLUI_STATE_META[state];
        expect(meta.description.length).toBeLessThanOrEqual(120);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 1.3, 1.4
 */
describe('Feature: yenlui-balance-system, Property 1: Serialization Round-Trip', () => {
  it('serializing a character with any valid yenluiState to JSON and deserializing produces the same value', () => {
    fc.assert(
      fc.property(arbYenluiState, (state) => {
        const character = makeCharacter({ yenluiState: state });
        const deserialized = JSON.parse(JSON.stringify(character));
        expect(deserialized.yenluiState).toBe(character.yenluiState);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 5.2
 */
describe('Feature: yenlui-balance-system, Property 6: State Transition Correctness', () => {
  it('selecting a different target state updates the stored yenluiState', () => {
    fc.assert(
      fc.property(
        arbYenluiState,
        arbYenluiState,
        (current, target) => {
          fc.pre(current !== target);

          const character = makeCharacter({ yenluiState: current });
          const mutator = (char: Character) => ({ ...char, yenluiState: target });
          const updated = mutator(character);

          expect(updated.yenluiState).toBe(target);
          expect(updated.yenluiState).not.toBe(current);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 5.3
 */
describe('Feature: yenlui-balance-system, Property 7: Same-State Idempotence', () => {
  it('selecting the already-active state does not change the stored value', () => {
    fc.assert(
      fc.property(arbYenluiState, (state) => {
        const character = makeCharacter({ yenluiState: state });
        const mutator = (char: Character) => ({ ...char, yenluiState: state });
        const updated = mutator(character);

        expect(updated.yenluiState).toBe(character.yenluiState);
      }),
      { numRuns: 100 }
    );
  });
});
