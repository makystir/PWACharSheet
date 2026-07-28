import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { ExpandableCell } from '../ExpandableCell';

// Feature: app-quality-improvements, Property 8: Effect cell toggle idempotence

vi.mock('../ExpandableCell.module.css', () => ({
  default: {
    cell: 'cell',
    expanded: 'expanded',
    truncated: 'truncated',
  },
}));

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary non-empty text to render in the expandable cell */
const arbEffectText = fc.string({ minLength: 1, maxLength: 200 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: app-quality-improvements', () => {
  describe('Property 8: Effect cell toggle idempotence', () => {
    /**
     * **Validates: Requirements 9.2, 9.3**
     */

    it('for any effect text, toggle(toggle(state)) returns to original truncated state', () => {
      fc.assert(
        fc.property(
          arbEffectText,
          (text) => {
            const { unmount, container } = render(
              <ExpandableCell text={text} />
            );

            const button = container.querySelector('button')!;

            // Capture initial state
            const initialAriaExpanded = button.getAttribute('aria-expanded');
            const initialClassName = button.className;
            const initialTitle = button.getAttribute('title');

            // Verify initial state is collapsed
            expect(initialAriaExpanded).toBe('false');
            expect(button.className).toContain('truncated');

            // First click: expand
            fireEvent.click(button);
            expect(button.getAttribute('aria-expanded')).toBe('true');
            expect(button.className).toContain('expanded');

            // Second click: collapse (toggle back)
            fireEvent.click(button);

            // Verify returned to original state
            expect(button.getAttribute('aria-expanded')).toBe(initialAriaExpanded);
            expect(button.className).toBe(initialClassName);
            expect(button.getAttribute('title')).toBe(initialTitle);

            unmount();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
