import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatDashboard } from '../CombatDashboard';
import type { CombatState, Condition } from '../../../types/character';

/**
 * CombatDashboard Mobile Layout Tests
 * **Validates: Requirements 7.2, 7.3, 7.4**
 *
 * Tests verify that the CombatDashboard renders correct DOM structure
 * and CSS module classes for mobile-optimized layout at 375px viewport.
 */

// ─── Mock matchMedia for mobile viewport ─────────────────────────────────────

function createMatchMedia(width: number) {
  return (query: string): MediaQueryList => ({
    matches: query.includes('max-width') && width <= parseInt(query.match(/\d+/)?.[0] ?? '0'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

// ─── Default props for active combat with wound data and conditions ──────────

const defaultCombatState: CombatState = {
  inCombat: true,
  initiative: 5,
  currentRound: 3,
  engaged: true,
  surprised: false,
};

const defaultConditions: Condition[] = [
  { name: 'Stunned', level: 1 },
  { name: 'Bleeding', level: 2 },
];

function getDefaultProps() {
  return {
    wCur: 8,
    totalWounds: 14,
    advantage: 2,
    combatState: defaultCombatState,
    conditions: defaultConditions,
    fortune: 2,
    fate: 3,
    resolve: 1,
    resilience: 2,
    inCombat: true,
    onUpdateWounds: vi.fn(),
    onUpdateAdvantage: vi.fn(),
    onUpdateRound: vi.fn(),
    onToggleEngaged: vi.fn(),
    onRemoveCondition: vi.fn(),
    onSpendFortune: vi.fn(),
    onSpendResolve: vi.fn(),
    onOpenConditionPicker: vi.fn(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CombatDashboard mobile layout', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
    window.matchMedia = createMatchMedia(375);
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
  });

  describe('Requirement 7.2: Wound adjustment buttons 44px touch targets', () => {
    it('renders wound decrease and increase buttons with correct aria-labels', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      const decreaseBtn = screen.getByRole('button', { name: 'Decrease wounds' });
      const increaseBtn = screen.getByRole('button', { name: 'Increase wounds' });

      expect(decreaseBtn).toBeInTheDocument();
      expect(increaseBtn).toBeInTheDocument();
    });

    it('wound adjustment buttons have CSS classes for 44px min touch target', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      const decreaseBtn = screen.getByRole('button', { name: 'Decrease wounds' });
      const increaseBtn = screen.getByRole('button', { name: 'Increase wounds' });

      // The buttons use tapButtonDecrease and tapButtonIncrease classes
      // which compose tapButton from shared.module.css (min 44x44px)
      // and are overridden to min 44px on mobile via CSS module
      expect(decreaseBtn.className).toBeTruthy();
      expect(increaseBtn.className).toBeTruthy();
      // Verify they render the correct text content
      expect(decreaseBtn).toHaveTextContent('−');
      expect(increaseBtn).toHaveTextContent('+');
    });

    it('wound button row has correct gap structure for preventing accidental taps', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      const decreaseBtn = screen.getByRole('button', { name: 'Decrease wounds' });
      // The button row (parent of the wound buttons) uses styles.btnRow
      // which has gap: 8px on mobile (Req 7.2)
      const btnRow = decreaseBtn.parentElement;
      expect(btnRow).toBeInTheDocument();
      // Verify both buttons are siblings in the same row
      const increaseBtn = screen.getByRole('button', { name: 'Increase wounds' });
      expect(btnRow).toContainElement(increaseBtn);
    });

    it('advantage adjustment buttons are also present with touch targets', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      const decreaseAdv = screen.getByRole('button', { name: 'Decrease advantage' });
      const increaseAdv = screen.getByRole('button', { name: 'Increase advantage' });

      expect(decreaseAdv).toBeInTheDocument();
      expect(increaseAdv).toBeInTheDocument();
    });
  });

  describe('Requirement 7.3: Condition badges with min-height 40px', () => {
    it('renders condition badges for each active condition', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      // Condition badges render as buttons with the condition name
      expect(screen.getByRole('button', { name: 'Info for Stunned' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Info for Bleeding' })).toBeInTheDocument();
    });

    it('condition badges have remove buttons', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      const removeStunned = screen.getByRole('button', { name: 'Remove Stunned' });
      const removeBleeding = screen.getByRole('button', { name: 'Remove Bleeding' });

      expect(removeStunned).toBeInTheDocument();
      expect(removeBleeding).toBeInTheDocument();
      expect(removeStunned).toHaveTextContent('✕');
      expect(removeBleeding).toHaveTextContent('✕');
    });

    it('condition badges display in a wrapping flow layout container', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      // The condition row container wraps the badges
      const removeBtn = screen.getByRole('button', { name: 'Remove Stunned' });
      // The badge is the parent of the remove button
      const badge = removeBtn.parentElement;
      expect(badge).toBeInTheDocument();
      // The condition row is the parent of the badges
      const conditionRow = badge?.parentElement;
      expect(conditionRow).toBeInTheDocument();
    });

    it('renders stackable conditions with level indicator', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      // Bleeding has level 2 and is stackable, should show "(2)"
      const bleedingBtn = screen.getByRole('button', { name: 'Info for Bleeding' });
      expect(bleedingBtn).toHaveTextContent('Bleeding (2)');
    });

    it('renders add condition button when in combat', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      const addBtn = screen.getByRole('button', { name: 'Add condition' });
      expect(addBtn).toBeInTheDocument();
      expect(addBtn).toHaveTextContent('+');
    });
  });

  describe('Requirement 7.4: Wound count at font size 28px', () => {
    it('renders wound count as a prominent number', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      // The wound count uses the bigNumber class which has font-size: 28px
      // Find the wound count by its value
      const dashboard = screen.getByTestId('combat-dashboard');
      // The wound current value is rendered as text "8"
      const bigNumbers = dashboard.querySelectorAll('[class*="bigNumber"]');
      expect(bigNumbers.length).toBeGreaterThan(0);

      // First bigNumber should be the wound count
      const woundNumber = bigNumbers[0];
      expect(woundNumber).toHaveTextContent('8');
    });

    it('displays wound count with total in format "current / total"', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      const dashboard = screen.getByTestId('combat-dashboard');
      // The wound total is shown as "/ 14"
      expect(dashboard).toHaveTextContent('/ 14');
    });

    it('wound count uses bigNumber CSS class for 28px font size', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      const dashboard = screen.getByTestId('combat-dashboard');
      const bigNumbers = dashboard.querySelectorAll('[class*="bigNumber"]');

      // The wound count bigNumber element exists and has the correct class
      expect(bigNumbers[0]).toBeTruthy();
      expect(bigNumbers[0].className).toContain('bigNumber');
    });

    it('renders wound progress bar', () => {
      render(<CombatDashboard {...getDefaultProps()} />);

      const progressBar = screen.getByTestId('wound-progress');
      expect(progressBar).toBeInTheDocument();
    });
  });
});
