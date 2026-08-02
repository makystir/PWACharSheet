// Feature: characteristic-current-tooltip, Property 1 & 2
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import { CharBreakdownContent } from '../CharBreakdownContent';

/**
 * Property 1: Breakdown total invariant
 *
 * **Validates: Requirements 1.4**
 *
 * For any CharacteristicValue with fields i, a, and b (each non-negative integers),
 * the breakdown tooltip SHALL display a Total that equals exactly i + a + b.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Initial characteristic value (0–99) */
const arbInitial = fc.integer({ min: 0, max: 99 });

/** Advances value (0–99) */
const arbAdvances = fc.integer({ min: 0, max: 99 });

/** Talent bonus value (0–50) */
const arbTalentBonus = fc.integer({ min: 0, max: 50 });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: characteristic-current-tooltip', () => {
  describe('Property 1: Breakdown total invariant', () => {
    it('displayed Total equals i + a + b for any valid characteristic values', () => {
      fc.assert(
        fc.property(
          arbInitial,
          arbAdvances,
          arbTalentBonus,
          (i, a, b) => {
            const current = i + a + b;
            const { container } = render(
              <CharBreakdownContent
                charKey="WS"
                initial={i}
                advances={a}
                talentBonus={b}
                current={current}
                contributingTalentName={b > 0 ? 'Test Talent' : null}
              />
            );

            // Find the total row and extract its displayed value
            const text = container.textContent || '';
            const totalMatch = text.match(/Total:\s*(\d+)/);
            expect(totalMatch).not.toBeNull();
            expect(Number(totalMatch![1])).toBe(current);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


// ─── Property 2: Conditional talent row display ──────────────────────────────

/**
 * Property 2: Conditional talent row display
 *
 * **Validates: Requirements 1.5, 1.6**
 *
 * For any CharacteristicValue, the "Talent Bonus" row SHALL be present in the
 * breakdown if and only if b > 0. When b === 0, the row is omitted; when b > 0,
 * the row shows the bonus value and the contributing talent name.
 */

describe('Feature: characteristic-current-tooltip', () => {
  describe('Property 2: Conditional talent row display', () => {
    it('"Talent Bonus" row is present if and only if b > 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 50 }),
          (b) => {
            const i = 30;
            const a = 10;
            const current = i + a + b;
            const talentName = b > 0 ? 'Warrior Born' : null;

            const { container } = render(
              <CharBreakdownContent
                charKey="WS"
                initial={i}
                advances={a}
                talentBonus={b}
                current={current}
                contributingTalentName={talentName}
              />
            );

            const text = container.textContent || '';

            if (b > 0) {
              // "Talent Bonus" row must be present with the bonus value and talent name
              expect(text).toContain('Talent Bonus:');
              expect(text).toContain(`+${b}`);
              expect(text).toContain('(Warrior Born)');
            } else {
              // "Talent Bonus" row must be absent
              expect(text).not.toContain('Talent Bonus:');
            }

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
