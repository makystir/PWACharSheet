import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import type { Character, CharacteristicKey, CharacteristicValue, ArmourPoints } from '../../../types/character';
import { BLANK_CHARACTER } from '../../../types/character';

/**
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2
 *
 * Bug Condition Exploration Test:
 * This test is EXPECTED TO FAIL on unfixed code — failure confirms the bug exists.
 * It encodes the expected behavior: the Characteristics table should have a "CB" column
 * displaying Math.floor((i + a + b) / 10) and the talent bonus column should read "T. Bonus".
 */

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

// Generator for CharacteristicValue with domain-appropriate constraints
const arbitraryCharacteristicValue: fc.Arbitrary<CharacteristicValue> = fc.record({
  i: fc.integer({ min: 0, max: 99 }),
  a: fc.integer({ min: 0, max: 99 }),
  b: fc.integer({ min: 0, max: 9 }),
});

const arbitraryCharacteristics: fc.Arbitrary<Record<CharacteristicKey, CharacteristicValue>> =
  fc.tuple(
    arbitraryCharacteristicValue, // WS
    arbitraryCharacteristicValue, // BS
    arbitraryCharacteristicValue, // S
    arbitraryCharacteristicValue, // T
    arbitraryCharacteristicValue, // I
    arbitraryCharacteristicValue, // Ag
    arbitraryCharacteristicValue, // Dex
    arbitraryCharacteristicValue, // Int
    arbitraryCharacteristicValue, // WP
    arbitraryCharacteristicValue, // Fel
  ).map(([WS, BS, S, T, I, Ag, Dex, Int, WP, Fel]) => ({
    WS, BS, S, T, I, Ag, Dex, Int, WP, Fel,
  }));

function buildCharacter(chars: Record<CharacteristicKey, CharacteristicValue>): Character {
  return {
    ...BLANK_CHARACTER,
    _v: 7 as const,
    chars,
    name: 'Test',
    species: 'Human',
  } as Character;
}

const defaultProps = {
  update: vi.fn(),
  updateCharacter: vi.fn(),
  totalWounds: 12,
  armourPoints: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 } as ArmourPoints,
  maxEncumbrance: 30,
  coinWeight: 0,
  rollHistory: [],
  addRoll: vi.fn(),
  clearHistory: vi.fn(),
  subTab: 'identity' as const,
};

describe('Bug Condition: Characteristic Bonus Column Missing', () => {
  /**
   * Validates: Requirements 2.2
   *
   * Property: The Characteristics grid header MUST include a "CB" column.
   * On unfixed code, this will FAIL because no CB column exists.
   */
  it('Property 1.1: Characteristics grid header includes a "CB" column', () => {
    fc.assert(
      fc.property(
        arbitraryCharacteristics,
        (chars) => {
          const character = buildCharacter(chars);
          const { container } = render(<CharacterPage {...defaultProps} character={character} />);

          // The characteristics section uses a CSS grid with div.charGridHeader > span children
          const headerDiv = container.querySelector('[class*="charGridHeader"]');
          expect(headerDiv).not.toBeNull();

          const headerSpans = headerDiv!.querySelectorAll('span');
          const headerTexts = Array.from(headerSpans).map(s => s.textContent);

          // Bug condition: there should be a "CB" column header
          expect(headerTexts).toContain('CB');
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Validates: Requirements 2.2
   *
   * Property: For any characteristic, the CB cell value equals Math.floor(current / 10)
   * where current = c.i + c.a + c.b.
   * On unfixed code, this will FAIL because no CB column/cells exist.
   */
  it('Property 1.2: CB cell value equals Math.floor((i + a + b) / 10) for each characteristic', () => {
    fc.assert(
      fc.property(
        arbitraryCharacteristics,
        (chars) => {
          const character = buildCharacter(chars);
          const { container } = render(<CharacterPage {...defaultProps} character={character} />);

          // Find the CB cells - they have class containing "charGridCB"
          const cbCells = container.querySelectorAll('[class*="charGridCB"]');
          expect(cbCells.length).toBe(10); // 10 characteristics

          // Verify each row's CB value
          for (let rowIdx = 0; rowIdx < CHAR_KEYS.length; rowIdx++) {
            const key = CHAR_KEYS[rowIdx];
            const c = chars[key];
            const current = c.i + c.a + c.b;
            const expectedCB = Math.floor(current / 10);

            expect(cbCells[rowIdx].textContent).toBe(String(expectedCB));
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Validates: Requirements 2.1
   *
   * Property: The talent bonus column header reads "T. Bonus" or "Talent Bonus",
   * NOT bare "Bonus".
   * On unfixed code, this will FAIL because the header currently reads "Bonus".
   */
  it('Property 1.3: Talent bonus column header reads "T. Bonus", not bare "Bonus"', () => {
    fc.assert(
      fc.property(
        arbitraryCharacteristics,
        (chars) => {
          const character = buildCharacter(chars);
          const { container } = render(<CharacterPage {...defaultProps} character={character} />);

          // Click "Show Details" to reveal the T. Bonus column
          const showDetailsBtn = screen.getByText('Show Details');
          fireEvent.click(showDetailsBtn);

          // Re-query the header after revealing details
          const headerDiv = container.querySelector('[class*="charGridHeader"]');
          expect(headerDiv).not.toBeNull();

          const headerSpans = headerDiv!.querySelectorAll('span');
          const headerTexts = Array.from(headerSpans).map(s => s.textContent);

          // The column should NOT have bare text "Bonus"
          // It should read "T. Bonus" or "Talent Bonus" instead
          expect(headerTexts).not.toContain('Bonus');
          const hasTalentBonusLabel = headerTexts.includes('T. Bonus') || headerTexts.includes('Talent Bonus');
          expect(hasTalentBonusLabel).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  });
});
