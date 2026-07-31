import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { PrintLayout } from '../PrintLayout';
import {
  arbitraryCharacter,
  arbitraryArmourPoints,
  arbitraryPsychologyTrait,
  arbitraryEnterprise,
  arbitraryGrudgeEntry,
  arbitraryCriticalWound,
  arbitraryRitualItem,
  arbitraryHireling,
} from './printLayoutGenerators';

/**
 * Validates: Requirements 1.2, 1.3, 1.4, 1.6, 1.7, 1.8
 */
describe('Feature: print-layout-redesign, Property 2: Optional section data completeness', () => {
  it('Psychology traits: type and target always rendered; rating when defined', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().chain(c =>
          fc.tuple(
            fc.array(arbitraryPsychologyTrait, { minLength: 1, maxLength: 4 }),
            fc.constant(c),
          )
        ),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        ([traits, baseChar], armourPoints, totalWounds) => {
          const character = {
            ...baseChar,
            psychologyTraits: traits,
            houseRules: { ...baseChar.houseRules, usePsychologyTracker: true },
          };

          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const text = container.textContent || '';

          for (const trait of traits) {
            expect(text).toContain(trait.type);
            expect(text).toContain(trait.target);
            if (trait.rating !== undefined) {
              expect(text).toContain(String(trait.rating));
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Enterprises: name, type, and expansionLevel rendered', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().chain(c =>
          fc.tuple(
            fc.array(arbitraryEnterprise, { minLength: 1, maxLength: 3 }),
            fc.constant(c),
          )
        ),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        ([enterprises, baseChar], armourPoints, totalWounds) => {
          const character = {
            ...baseChar,
            enterprises,
            houseRules: { ...baseChar.houseRules, useEnterprises: true },
          };

          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const text = container.textContent || '';

          for (const ent of enterprises) {
            expect(text).toContain(ent.name);
            expect(text).toContain(ent.type);
            expect(text).toContain(String(ent.expansionLevel));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Grudges: offence, perpetrator, restitution, type, and status rendered', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().chain(c =>
          fc.tuple(
            fc.array(arbitraryGrudgeEntry, { minLength: 1, maxLength: 3 }),
            fc.constant(c),
          )
        ),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        ([grudges, baseChar], armourPoints, totalWounds) => {
          const character = {
            ...baseChar,
            grudges,
            houseRules: { ...baseChar.houseRules, useGrudgeBook: true },
          };

          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const text = container.textContent || '';

          for (const grudge of grudges) {
            expect(text).toContain(grudge.offence);
            expect(text).toContain(grudge.perpetrator);
            expect(text).toContain(grudge.restitution);
            expect(text).toContain(grudge.type);
            expect(text).toContain(grudge.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Critical wounds: location, description, effects, and severity rendered', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().chain(c =>
          fc.tuple(
            fc.array(arbitraryCriticalWound, { minLength: 1, maxLength: 3 }),
            fc.constant(c),
          )
        ),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        ([criticalWounds, baseChar], armourPoints, totalWounds) => {
          const character = {
            ...baseChar,
            criticalWounds,
          };

          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const text = container.textContent || '';

          for (const cw of criticalWounds) {
            expect(text).toContain(cw.location);
            expect(text).toContain(cw.description);
            expect(text).toContain(cw.effects);
            expect(text).toContain(String(cw.severity));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Rituals: name, cn, type, and description rendered', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().chain(c =>
          fc.tuple(
            fc.array(arbitraryRitualItem, { minLength: 1, maxLength: 3 }),
            fc.constant(c),
          )
        ),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        ([rituals, baseChar], armourPoints, totalWounds) => {
          const character = {
            ...baseChar,
            rituals,
          };

          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const text = container.textContent || '';

          for (const ritual of rituals) {
            expect(text).toContain(ritual.name);
            expect(text).toContain(String(ritual.cn));
            expect(text).toContain(ritual.type);
            expect(text).toContain(ritual.description);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Hirelings: name, role, and status rendered', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().chain(c =>
          fc.tuple(
            fc.array(arbitraryHireling, { minLength: 1, maxLength: 3 }),
            fc.constant(c),
          )
        ),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        ([hirelings, baseChar], armourPoints, totalWounds) => {
          const character = {
            ...baseChar,
            hirelings,
          };

          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const text = container.textContent || '';

          for (const hireling of hirelings) {
            expect(text).toContain(hireling.name);
            expect(text).toContain(hireling.role);
            expect(text).toContain(hireling.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
