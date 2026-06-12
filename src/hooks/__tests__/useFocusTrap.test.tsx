import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRef, useState } from 'react';
import * as fc from 'fast-check';
import { useFocusTrap } from '../useFocusTrap';

// ─── Test helpers ────────────────────────────────────────────────────────────

/**
 * A test harness component that renders N focusable buttons inside a container
 * with the useFocusTrap hook applied.
 */
function FocusTrapHarness({ count, isActive }: { count: number; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, isActive);

  return (
    <div ref={containerRef} data-testid="trap-container">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} data-testid={`btn-${i}`}>
          Button {i}
        </button>
      ))}
    </div>
  );
}

/**
 * A harness that allows toggling the focus trap on/off.
 */
function ToggleableTrapHarness({ count }: { count: number }) {
  const [active, setActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, active);

  return (
    <div>
      <button data-testid="activate-btn" onClick={() => setActive(true)}>
        Activate
      </button>
      <div ref={containerRef} data-testid="trap-container">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} data-testid={`btn-${i}`}>
            Button {i}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Unit Tests ──────────────────────────────────────────────────────────────

describe('useFocusTrap — unit tests', () => {
  describe('focus moves to first element on activation', () => {
    it('focuses the first focusable element when trap activates', () => {
      const { getByTestId } = render(<FocusTrapHarness count={3} isActive={true} />);
      const firstBtn = getByTestId('btn-0');
      expect(document.activeElement).toBe(firstBtn);
    });

    it('does not move focus when trap is inactive', () => {
      const { getByTestId } = render(<FocusTrapHarness count={3} isActive={false} />);
      const firstBtn = getByTestId('btn-0');
      expect(document.activeElement).not.toBe(firstBtn);
    });

    it('moves focus to first element when trap becomes active', () => {
      const { getByTestId } = render(<ToggleableTrapHarness count={3} />);

      // Initially trap is inactive, focus should not be on btn-0
      expect(document.activeElement).not.toBe(getByTestId('btn-0'));

      // Activate the trap
      fireEvent.click(getByTestId('activate-btn'));

      expect(document.activeElement).toBe(getByTestId('btn-0'));
    });
  });

  describe('Tab from last element wraps to first', () => {
    it('wraps focus from the last button to the first on Tab', () => {
      const { getByTestId } = render(<FocusTrapHarness count={3} isActive={true} />);
      const container = getByTestId('trap-container');
      const firstBtn = getByTestId('btn-0');
      const lastBtn = getByTestId('btn-2');

      // Focus the last button
      lastBtn.focus();
      expect(document.activeElement).toBe(lastBtn);

      // Press Tab on the container (keydown event bubbles from last element)
      fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });

      expect(document.activeElement).toBe(firstBtn);
    });

    it('does not wrap when Tab is pressed on a middle element', () => {
      const { getByTestId } = render(<FocusTrapHarness count={3} isActive={true} />);
      const container = getByTestId('trap-container');
      const middleBtn = getByTestId('btn-1');

      // Focus the middle button
      middleBtn.focus();
      expect(document.activeElement).toBe(middleBtn);

      // Press Tab — should not prevent default (focus stays or moves naturally)
      fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });

      // Focus should still be on middle (since we didn't simulate actual browser Tab movement)
      expect(document.activeElement).toBe(middleBtn);
    });
  });

  describe('Shift+Tab from first element wraps to last', () => {
    it('wraps focus from the first button to the last on Shift+Tab', () => {
      const { getByTestId } = render(<FocusTrapHarness count={3} isActive={true} />);
      const container = getByTestId('trap-container');
      const firstBtn = getByTestId('btn-0');
      const lastBtn = getByTestId('btn-2');

      // Focus is already on first after activation
      expect(document.activeElement).toBe(firstBtn);

      // Press Shift+Tab
      fireEvent.keyDown(container, { key: 'Tab', shiftKey: true });

      expect(document.activeElement).toBe(lastBtn);
    });

    it('does not wrap when Shift+Tab is pressed on a non-first element', () => {
      const { getByTestId } = render(<FocusTrapHarness count={3} isActive={true} />);
      const container = getByTestId('trap-container');
      const middleBtn = getByTestId('btn-1');

      // Focus middle button
      middleBtn.focus();
      expect(document.activeElement).toBe(middleBtn);

      // Press Shift+Tab — should not wrap
      fireEvent.keyDown(container, { key: 'Tab', shiftKey: true });

      expect(document.activeElement).toBe(middleBtn);
    });
  });

  describe('single element focus trap', () => {
    it('Tab on the only element wraps to itself', () => {
      const { getByTestId } = render(<FocusTrapHarness count={1} isActive={true} />);
      const container = getByTestId('trap-container');
      const onlyBtn = getByTestId('btn-0');

      expect(document.activeElement).toBe(onlyBtn);

      fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });

      expect(document.activeElement).toBe(onlyBtn);
    });

    it('Shift+Tab on the only element wraps to itself', () => {
      const { getByTestId } = render(<FocusTrapHarness count={1} isActive={true} />);
      const container = getByTestId('trap-container');
      const onlyBtn = getByTestId('btn-0');

      expect(document.activeElement).toBe(onlyBtn);

      fireEvent.keyDown(container, { key: 'Tab', shiftKey: true });

      expect(document.activeElement).toBe(onlyBtn);
    });
  });
});

// ─── Property-Based Tests ────────────────────────────────────────────────────

/**
 * Feature: mobile-character-management, Property 5: Focus trap wraps at sheet boundaries
 * Validates: Requirements 9.1
 *
 * For any CharacterManagementSheet containing N focusable elements (where N ≥ 1),
 * pressing Tab while the last focusable element is focused SHALL move focus to the
 * first focusable element, and pressing Shift+Tab while the first focusable element
 * is focused SHALL move focus to the last focusable element.
 */
describe('Feature: mobile-character-management, Property 5: Focus trap wraps at sheet boundaries', () => {
  it('Tab from last focusable element moves focus to first (property test)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          // Clean up any previous render
          document.body.innerHTML = '';

          const { getByTestId } = render(<FocusTrapHarness count={count} isActive={true} />);
          const container = getByTestId('trap-container');
          const firstBtn = getByTestId('btn-0');
          const lastBtn = getByTestId(`btn-${count - 1}`);

          // Focus the last button
          lastBtn.focus();
          expect(document.activeElement).toBe(lastBtn);

          // Press Tab
          fireEvent.keyDown(container, { key: 'Tab', shiftKey: false });

          // Focus should wrap to first
          expect(document.activeElement).toBe(firstBtn);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Shift+Tab from first focusable element moves focus to last (property test)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          // Clean up any previous render
          document.body.innerHTML = '';

          const { getByTestId } = render(<FocusTrapHarness count={count} isActive={true} />);
          const container = getByTestId('trap-container');
          const firstBtn = getByTestId('btn-0');
          const lastBtn = getByTestId(`btn-${count - 1}`);

          // Focus should already be on first element after activation
          expect(document.activeElement).toBe(firstBtn);

          // Press Shift+Tab
          fireEvent.keyDown(container, { key: 'Tab', shiftKey: true });

          // Focus should wrap to last
          expect(document.activeElement).toBe(lastBtn);
        }
      ),
      { numRuns: 100 }
    );
  });
});
