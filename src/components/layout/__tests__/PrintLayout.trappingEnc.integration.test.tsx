import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PrintLayout } from '../PrintLayout';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, Trapping, ArmourPoints } from '../../../types/character';
import { calculateCarriedTrappingEnc } from '../../../logic/encumbrance';

/**
 * Integration test for printed vs character-page carried-trappings total.
 *
 * Feature: worn-trappings-encumbrance
 * Example-level complement to Property 3 (Character page total equals print
 * layout total). Both CharacterPage and PrintLayout derive the carried
 * trappings encumbrance from the shared calculateCarriedTrappingEnc, so this
 * test renders PrintLayout with a representative sample character and asserts
 * the printed Trappings encumbrance value equals the same shared calculation
 * the CharacterPage uses.
 *
 * Validates: Requirements 5.4
 */
describe('Feature: worn-trappings-encumbrance — printed vs character-page trappings total', () => {
  // Representative mix of trappings exercising the worn reduction, quantity
  // multiplication, and stored-on-horse exclusion.
  const sampleTrappings: Trapping[] = [
    { name: 'Cloak', enc: '1', quantity: 1, worn: true }, // worn wearable: 1 → max(0, 1-1) = 0
    { name: 'Backpack', enc: '2', quantity: 1 }, // normal item: 2 × 1 = 2
    { name: 'Rope', enc: '1', quantity: 3 }, // quantity item: 1 × 3 = 3
    { name: 'Tent', enc: '4', quantity: 1, storedOnHorse: true }, // excluded from carried
  ];

  const sampleCharacter: Character = {
    ...BLANK_CHARACTER,
    name: 'Encumbrance Sample',
    trappings: sampleTrappings,
  };

  const armourPoints: ArmourPoints = {
    head: 0,
    lArm: 0,
    rArm: 0,
    body: 0,
    lLeg: 0,
    rLeg: 0,
    shield: 0,
  };

  /**
   * Locate the value cell of the "Trappings" row inside the printed
   * Encumbrance table (a two-cell row: label cell + value cell).
   */
  function getPrintedTrappingsEnc(container: HTMLElement): string | undefined {
    const rows = container.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length === 2 && cells[0]?.textContent?.trim() === 'Trappings') {
        return cells[1]?.textContent?.trim();
      }
    }
    return undefined;
  }

  it('printed Trappings total equals the shared character-page calculation', () => {
    const expected = calculateCarriedTrappingEnc(sampleCharacter.trappings);
    // Sanity: worn Cloak (0) + Backpack (2) + Rope×3 (3) + Tent stored-on-horse (excluded) = 5
    expect(expected).toBe(5);

    const { container } = render(
      <PrintLayout character={sampleCharacter} totalWounds={10} armourPoints={armourPoints} />,
    );

    const printed = getPrintedTrappingsEnc(container);
    expect(printed).toBeDefined();
    expect(printed).toBe(String(expected));
  });
});
