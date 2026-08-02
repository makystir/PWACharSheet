// Feature: characteristic-current-tooltip, Property 5: Aria-describedby linkage
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharCurrentCell } from '../CharCurrentCell';
import type { CharacteristicKey } from '../../../types/character';

/**
 * Property 5: Aria-describedby linkage
 *
 * **Validates: Requirements 3.2**
 *
 * For any characteristic key where the tooltip is open, the corresponding
 * Current value cell SHALL have `aria-describedby` equal to "tooltip-char-{key}".
 * When the tooltip is closed, the attribute SHALL not be present.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

const CHAR_KEYS = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'] as const;

/** Random characteristic key */
const arbCharKey = fc.constantFrom<CharacteristicKey>(...CHAR_KEYS);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: characteristic-current-tooltip', () => {
  describe('Property 5: Aria-describedby linkage', () => {
    it('cell has aria-describedby="tooltip-char-{key}" when tooltip is open', () => {
      fc.assert(
        fc.property(
          arbCharKey,
          (charKey) => {
            const { container } = render(
              <CharCurrentCell
                charKey={charKey}
                current={42}
                isTooltipOpen={true}
                onOpen={vi.fn()}
                onClose={vi.fn()}
              />
            );

            const cell = container.querySelector('[role="button"]');
            expect(cell).not.toBeNull();
            expect(cell!.getAttribute('aria-describedby')).toBe(`tooltip-char-${charKey}`);

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('cell does NOT have aria-describedby when tooltip is closed', () => {
      fc.assert(
        fc.property(
          arbCharKey,
          (charKey) => {
            const { container } = render(
              <CharCurrentCell
                charKey={charKey}
                current={42}
                isTooltipOpen={false}
                onOpen={vi.fn()}
                onClose={vi.fn()}
              />
            );

            const cell = container.querySelector('[role="button"]');
            expect(cell).not.toBeNull();
            expect(cell!.hasAttribute('aria-describedby')).toBe(false);

            cleanup();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
