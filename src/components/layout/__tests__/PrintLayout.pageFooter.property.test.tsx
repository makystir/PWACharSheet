import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { PrintLayout } from '../PrintLayout';
import { arbitraryCharacter, arbitraryArmourPoints } from './printLayoutGenerators';

/**
 * Feature: print-layout-redesign, Property 3: Page footer contains character name
 * Validates: Requirements 4.6
 */
describe('Feature: print-layout-redesign', () => {
  it('Property 3: Page footer contains character name', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().filter(c => c.name.length > 0),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          // Find all footer elements (CSS Modules hashes the class name, so use partial match)
          const footers = container.querySelectorAll('[class*="pageFooter"]');

          // There should be at least 1 footer (component renders 3 pages)
          expect(footers.length).toBeGreaterThanOrEqual(1);

          // Every footer must contain the character's name
          for (const footer of footers) {
            expect(footer.textContent).toContain(character.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
