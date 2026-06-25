import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, GrudgeEntry, GrudgeType, GrudgeStatus } from '../../types/character';
import {
  isDwarf,
  isGrudgePanelVisible,
  canAddPartyGrudge,
  validateGrudgeForm,
  createGrudgeEntry,
  satisfyGrudge,
  deleteGrudge,
  sortGrudges,
  getGrudgeXP,
} from '../grudges';
import type { GrudgeFormData } from '../grudges';

// ─── Generators ─────────────────────────────────────────────────────────────

export const arbGrudgeType: fc.Arbitrary<GrudgeType> = fc.constantFrom('standard', 'blood');
export const arbGrudgeStatus: fc.Arbitrary<GrudgeStatus> = fc.constantFrom('outstanding', 'satisfied');

export const arbISODate: fc.Arbitrary<string> = fc.tuple(
  fc.integer({ min: 2000, max: 2099 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 }),
).map(([y, m, d]) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
);

export const arbGrudgeEntry: fc.Arbitrary<GrudgeEntry> = fc.record({
  id: fc.uuid(),
  offence: fc.string({ minLength: 1, maxLength: 100 }),
  perpetrator: fc.string({ minLength: 1, maxLength: 50 }),
  restitution: fc.string({ minLength: 1, maxLength: 100 }),
  type: arbGrudgeType,
  status: arbGrudgeStatus,
  isPartyGrudge: fc.boolean(),
  dateRecorded: arbISODate,
  dateSatisfied: fc.option(arbISODate, { nil: undefined }),
});

export const arbGrudgeArray: fc.Arbitrary<GrudgeEntry[]> = fc.array(arbGrudgeEntry, { maxLength: 20 });

/** Species strings that contain "dwarf" in various casings/positions */
export const arbDwarfSpecies: fc.Arbitrary<string> = fc.oneof(
  fc.constant('Dwarf'),
  fc.constant('dwarf'),
  fc.constant('DWARF'),
  fc.constant('Dwarf (Karaz-a-Karak)'),
  fc.constant('Dwarf (Barak Varr)'),
  fc.constant('Dwarf (Karak Azul)'),
  fc.constant('dWaRf'),
  fc.tuple(
    fc.string({ minLength: 0, maxLength: 5 }),
    fc.constantFrom('Dwarf', 'dwarf', 'DWARF', 'dWaRf'),
    fc.string({ minLength: 0, maxLength: 5 }),
  ).map(([prefix, core, suffix]) => prefix + core + suffix),
);

/** Species strings that do NOT contain "dwarf" (case-insensitive) */
export const arbNonDwarfSpecies: fc.Arbitrary<string> = fc.string({ minLength: 0, maxLength: 30 })
  .filter(s => !s.toLowerCase().includes('dwarf'));

/** Arbitrary species - mix of dwarf and non-dwarf */
export const arbSpecies: fc.Arbitrary<string> = fc.oneof(arbDwarfSpecies, arbNonDwarfSpecies);

/** Build a minimal Character with the fields relevant to grudge testing */
export function arbCharacterWithSpeciesAndToggle(
  species: fc.Arbitrary<string>,
  useGrudgeBook: fc.Arbitrary<boolean>,
): fc.Arbitrary<Character> {
  return fc.record({
    species,
    useGrudgeBook,
  }).map(({ species: sp, useGrudgeBook: toggle }) => ({
    ...BLANK_CHARACTER,
    species: sp,
    houseRules: {
      ...BLANK_CHARACTER.houseRules,
      useGrudgeBook: toggle,
    },
  }));
}

/** Generator for valid grudge form data (non-empty trimmed fields) */
export const arbValidGrudgeFormData: fc.Arbitrary<GrudgeFormData> = fc.record({
  offence: fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0),
  perpetrator: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  restitution: fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length > 0),
  type: arbGrudgeType,
  isPartyGrudge: fc.boolean(),
});

/** Generator for invalid grudge form data (at least one required field empty/whitespace) */
export const arbInvalidGrudgeFormData: fc.Arbitrary<GrudgeFormData> = fc.record({
  offence: fc.string({ minLength: 0, maxLength: 80 }),
  perpetrator: fc.string({ minLength: 0, maxLength: 50 }),
  restitution: fc.string({ minLength: 0, maxLength: 80 }),
  type: arbGrudgeType,
  isPartyGrudge: fc.boolean(),
}).filter(form =>
  !form.offence.trim() || !form.perpetrator.trim() || !form.restitution.trim()
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: dwarf-grudge-system', () => {
  /**
   * **Validates: Requirements 1.4, 1.5**
   */
  it('Property 1: Grudge serialization round-trip', () => {
    fc.assert(
      fc.property(
        arbGrudgeArray,
        (grudges) => {
          const character: Character = {
            ...BLANK_CHARACTER,
            species: 'Dwarf',
            grudges,
          };

          const serialized = JSON.stringify(character);
          const deserialized: Character = JSON.parse(serialized);

          expect(deserialized.grudges).toEqual(character.grudges);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4, 2.5, 3.1, 3.2**
   */
  it('Property 2: Panel visibility predicate', () => {
    fc.assert(
      fc.property(
        arbCharacterWithSpeciesAndToggle(arbSpecies, fc.boolean()),
        (character) => {
          const result = isGrudgePanelVisible(character);
          const speciesIsDwarf = character.species.toLowerCase().includes('dwarf');
          const toggleOn = character.houseRules.useGrudgeBook === true;

          expect(result).toBe(toggleOn && speciesIsDwarf);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 2.6, 3.3**
   */
  it('Property 3: Data preservation on visibility change', () => {
    fc.assert(
      fc.property(
        fc.array(arbGrudgeEntry, { minLength: 1, maxLength: 20 }),
        fc.boolean(),
        arbNonDwarfSpecies,
        (grudges, toggleOff, nonDwarfSpecies) => {
          // Character with grudges and panel visible
          const character: Character = {
            ...BLANK_CHARACTER,
            species: 'Dwarf',
            houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: true },
            grudges: [...grudges],
          };

          // Toggle useGrudgeBook off — grudges should remain
          const toggledOff: Character = {
            ...character,
            houseRules: { ...character.houseRules, useGrudgeBook: false },
          };
          expect(toggledOff.grudges).toEqual(grudges);

          // Change species to non-Dwarf — grudges should remain
          const speciesChanged: Character = {
            ...character,
            species: nonDwarfSpecies,
          };
          expect(speciesChanged.grudges).toEqual(grudges);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 3.5**
   */
  it('Property 4: Dwarf species detection', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        (species) => {
          const result = isDwarf(species);
          const expected = species.toLowerCase().includes('dwarf');
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * **Validates: Requirements 4.3**
   */
  it('Property 5: Grudge creation produces valid entry', () => {
    const today = new Date().toISOString().slice(0, 10);

    fc.assert(
      fc.property(
        arbValidGrudgeFormData,
        arbGrudgeArray,
        (form, existingGrudges) => {
          const character: Character = {
            ...BLANK_CHARACTER,
            species: 'Dwarf',
            grudges: existingGrudges,
          };

          const updated = createGrudgeEntry(character, form);
          const newGrudges = updated.grudges ?? [];

          // Should have one more entry
          expect(newGrudges.length).toBe(existingGrudges.length + 1);

          // Last entry is the new one
          const newEntry = newGrudges[newGrudges.length - 1];
          expect(newEntry.status).toBe('outstanding');
          expect(newEntry.id).toBeTruthy();
          expect(newEntry.id.length).toBeGreaterThan(0);
          expect(newEntry.dateRecorded).toBe(today);
          expect(newEntry.offence).toBe(form.offence.trim());
          expect(newEntry.perpetrator).toBe(form.perpetrator.trim());
          expect(newEntry.restitution).toBe(form.restitution.trim());
          expect(newEntry.type).toBe(form.type);
          expect(newEntry.isPartyGrudge).toBe(form.isPartyGrudge);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.4**
   */
  it('Property 6: Validation rejects incomplete forms', () => {
    fc.assert(
      fc.property(
        arbInvalidGrudgeFormData,
        (form) => {
          const result = validateGrudgeForm(form);

          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);

          // Each empty/whitespace field should have a corresponding error
          const errorFields = result.errors.map(e => e.field);
          if (!form.offence.trim()) {
            expect(errorFields).toContain('offence');
          }
          if (!form.perpetrator.trim()) {
            expect(errorFields).toContain('perpetrator');
          }
          if (!form.restitution.trim()) {
            expect(errorFields).toContain('restitution');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 4.5, 9.1, 9.2, 9.4**
   */
  it('Property 7: Party grudge limit enforcement', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 5 }),
        fc.array(arbGrudgeEntry, { maxLength: 10 }),
        (outstandingPartyCount, otherGrudges) => {
          // Build an array with a specific number of outstanding party grudges
          const outstandingPartyGrudges: GrudgeEntry[] = Array.from(
            { length: outstandingPartyCount },
            (_, i) => ({
              id: `party-${i}`,
              offence: `Offence ${i}`,
              perpetrator: `Perpetrator ${i}`,
              restitution: `Restitution ${i}`,
              type: 'standard' as GrudgeType,
              status: 'outstanding' as GrudgeStatus,
              isPartyGrudge: true,
              dateRecorded: '2024-01-01',
            })
          );

          // Filter other grudges so they don't add outstanding party grudges
          const filteredOthers = otherGrudges.map(g => ({
            ...g,
            isPartyGrudge: false,
          }));

          const allGrudges = [...outstandingPartyGrudges, ...filteredOthers];
          const result = canAddPartyGrudge(allGrudges);

          expect(result).toBe(outstandingPartyCount < 3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 5.6**
   */
  it('Property 8: Sort order — outstanding before satisfied', () => {
    fc.assert(
      fc.property(
        arbGrudgeArray,
        (grudges) => {
          const sorted = sortGrudges(grudges);

          // Find first satisfied and last outstanding indices
          const firstSatisfiedIdx = sorted.findIndex(g => g.status === 'satisfied');
          const lastOutstandingIdx = sorted.length - 1 -
            [...sorted].reverse().findIndex(g => g.status === 'outstanding');

          // If both types exist, all outstanding must come before all satisfied
          if (firstSatisfiedIdx !== -1 && lastOutstandingIdx < sorted.length) {
            expect(lastOutstandingIdx).toBeLessThan(firstSatisfiedIdx);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.2**
   */
  it('Property 9: Satisfy sets status and date', () => {
    const today = new Date().toISOString().slice(0, 10);

    fc.assert(
      fc.property(
        fc.array(arbGrudgeEntry, { minLength: 1, maxLength: 10 }),
        (grudges) => {
          // Ensure at least one outstanding grudge
          const outstandingGrudges = grudges.map((g, i) =>
            i === 0 ? { ...g, status: 'outstanding' as GrudgeStatus, dateSatisfied: undefined } : g
          );
          const targetId = outstandingGrudges[0].id;

          const character: Character = {
            ...BLANK_CHARACTER,
            species: 'Dwarf',
            grudges: outstandingGrudges,
          };

          const updated = satisfyGrudge(character, targetId);
          const updatedGrudges = updated.grudges ?? [];
          const satisfiedEntry = updatedGrudges.find(g => g.id === targetId)!;

          // Status changed to satisfied
          expect(satisfiedEntry.status).toBe('satisfied');
          // dateSatisfied set to today
          expect(satisfiedEntry.dateSatisfied).toBe(today);
          // All other fields unchanged
          expect(satisfiedEntry.id).toBe(outstandingGrudges[0].id);
          expect(satisfiedEntry.offence).toBe(outstandingGrudges[0].offence);
          expect(satisfiedEntry.perpetrator).toBe(outstandingGrudges[0].perpetrator);
          expect(satisfiedEntry.restitution).toBe(outstandingGrudges[0].restitution);
          expect(satisfiedEntry.type).toBe(outstandingGrudges[0].type);
          expect(satisfiedEntry.isPartyGrudge).toBe(outstandingGrudges[0].isPartyGrudge);
          expect(satisfiedEntry.dateRecorded).toBe(outstandingGrudges[0].dateRecorded);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.6**
   */
  it('Property 10: Satisfy does not modify XP', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1000 }),
        fc.nat({ max: 1000 }),
        fc.nat({ max: 2000 }),
        fc.array(arbGrudgeEntry, { minLength: 1, maxLength: 5 }),
        (xpCur, xpSpent, xpTotal, grudges) => {
          // Ensure first grudge is outstanding
          const outstandingGrudges = grudges.map((g, i) =>
            i === 0 ? { ...g, status: 'outstanding' as GrudgeStatus } : g
          );

          const character: Character = {
            ...BLANK_CHARACTER,
            species: 'Dwarf',
            xpCur,
            xpSpent,
            xpTotal,
            grudges: outstandingGrudges,
          };

          const updated = satisfyGrudge(character, outstandingGrudges[0].id);

          expect(updated.xpCur).toBe(xpCur);
          expect(updated.xpSpent).toBe(xpSpent);
          expect(updated.xpTotal).toBe(xpTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.5**
   */
  it('Property 11: Satisfy is irreversible', () => {
    fc.assert(
      fc.property(
        fc.array(arbGrudgeEntry, { minLength: 1, maxLength: 10 }),
        (grudges) => {
          // Make first grudge already satisfied
          const satisfiedGrudges = grudges.map((g, i) =>
            i === 0
              ? { ...g, status: 'satisfied' as GrudgeStatus, dateSatisfied: '2024-06-15' }
              : g
          );

          const character: Character = {
            ...BLANK_CHARACTER,
            species: 'Dwarf',
            grudges: satisfiedGrudges,
          };

          const updated = satisfyGrudge(character, satisfiedGrudges[0].id);

          // Should be a no-op — the character should be unchanged
          expect(updated).toBe(character);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 7.3**
   */
  it('Property 12: Delete removes exactly one entry', () => {
    fc.assert(
      fc.property(
        fc.array(arbGrudgeEntry, { minLength: 1, maxLength: 15 }),
        fc.nat(),
        (grudges, indexSeed) => {
          // Ensure unique IDs
          const uniqueGrudges = grudges.map((g, i) => ({ ...g, id: `grudge-${i}` }));
          const targetIndex = indexSeed % uniqueGrudges.length;
          const targetId = uniqueGrudges[targetIndex].id;

          const character: Character = {
            ...BLANK_CHARACTER,
            species: 'Dwarf',
            grudges: uniqueGrudges,
          };

          const updated = deleteGrudge(character, targetId);
          const updatedGrudges = updated.grudges ?? [];

          // Length reduced by 1
          expect(updatedGrudges.length).toBe(uniqueGrudges.length - 1);

          // Target is absent
          expect(updatedGrudges.find(g => g.id === targetId)).toBeUndefined();

          // All other entries are preserved in order
          const expectedOthers = uniqueGrudges.filter(g => g.id !== targetId);
          expect(updatedGrudges).toEqual(expectedOthers);
        }
      ),
      { numRuns: 100 }
    );
  });
});
