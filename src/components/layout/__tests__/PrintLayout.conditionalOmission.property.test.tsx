import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { PrintLayout } from '../PrintLayout';
import { arbitraryCharacter, arbitraryArmourPoints } from './printLayoutGenerators';

/**
 * Feature: print-layout-redesign, Property 1: Conditional section omission
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11
 *
 * For any Character object and any optional section key, if the section's visibility
 * condition is not met (empty data array, disabled house rule, or both), then the
 * rendered output SHALL NOT contain a DOM element for that section.
 */
describe('Feature: print-layout-redesign, Property 1: Conditional section omission', () => {
  it('spells section is omitted when spells array is empty', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({ ...c, spells: [] })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="spells"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('companions section is omitted when companions array is empty', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({ ...c, companions: [] })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="companions"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('mutations section is omitted when mutations array is empty', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({ ...c, mutations: [] })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="mutations"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('criticalWounds section is omitted when criticalWounds array is empty', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({ ...c, criticalWounds: [] })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="criticalWounds"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hirelings section is omitted when hirelings array is empty', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({ ...c, hirelings: [] })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="hirelings"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('enterprises section is omitted when useEnterprises is false', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({
          ...c,
          houseRules: { ...c.houseRules, useEnterprises: false },
        })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="enterprises"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('enterprises section is omitted when enterprises array is empty (even if enabled)', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({
          ...c,
          houseRules: { ...c.houseRules, useEnterprises: true },
          enterprises: [],
        })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="enterprises"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('grudgeBook section is omitted when useGrudgeBook is false', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({
          ...c,
          houseRules: { ...c.houseRules, useGrudgeBook: false },
        })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="grudgeBook"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('grudgeBook section is omitted when grudges array is empty (even if enabled)', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({
          ...c,
          houseRules: { ...c.houseRules, useGrudgeBook: true },
          grudges: [],
        })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="grudgeBook"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('psychologyTraits section is omitted when usePsychologyTracker is false', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({
          ...c,
          houseRules: { ...c.houseRules, usePsychologyTracker: false },
        })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="psychologyTraits"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('psychologyTraits section is omitted when psychologyTraits array is empty (even if enabled)', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({
          ...c,
          houseRules: { ...c.houseRules, usePsychologyTracker: true },
          psychologyTraits: [],
        })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="psychologyTraits"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rituals section is omitted when rituals array is empty', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({ ...c, rituals: [] })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="rituals"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('yenlui section is omitted when useYenlui is false', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({
          ...c,
          houseRules: { ...c.houseRules, useYenlui: false },
        })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="yenlui"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('estate section is omitted when estate.name is empty', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({
          ...c,
          estate: { ...c.estate, name: '' },
        })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );
          expect(container.querySelector('[data-section="estate"]')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
