import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatDashboard } from '../CombatDashboard';
import type { CombatState, Condition } from '../../../types/character';

/**
 * CombatDashboard Condition Tooltip Sheet Tests
 * **Validates: Requirements 9.3**
 *
 * Tests verify that on mobile, tapping a condition badge shows a
 * bottom-anchored tooltip sheet with the condition effect text,
 * instead of inline expansion that shifts layout.
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

// ─── Default props ───────────────────────────────────────────────────────────

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

describe('CombatDashboard condition tooltip sheet (Req 9.3)', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
    window.matchMedia = createMatchMedia(375);
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    vi.useFakeTimers();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
    vi.useRealTimers();
  });

  it('shows bottom-anchored tooltip sheet when condition badge is tapped on mobile', () => {
    render(<CombatDashboard {...getDefaultProps()} />);

    const stunnedBtn = screen.getByRole('button', { name: 'Info for Stunned' });
    fireEvent.click(stunnedBtn);

    const tooltipSheet = screen.getByTestId('condition-tooltip-sheet');
    expect(tooltipSheet).toBeInTheDocument();
    expect(tooltipSheet).toHaveAttribute('role', 'tooltip');
    expect(tooltipSheet).toHaveTextContent('Stunned');
  });

  it('does not show inline expansion text below the badge on mobile', () => {
    render(<CombatDashboard {...getDefaultProps()} />);

    const stunnedBtn = screen.getByRole('button', { name: 'Info for Stunned' });
    fireEvent.click(stunnedBtn);

    // The old conditionEffectExpanded class element should not be present
    const dashboard = screen.getByTestId('combat-dashboard');
    const expandedElements = dashboard.querySelectorAll('[class*="conditionEffectExpanded"]');
    expect(expandedElements.length).toBe(0);
  });

  it('shows condition name and effect text in the tooltip sheet', () => {
    render(<CombatDashboard {...getDefaultProps()} />);

    const stunnedBtn = screen.getByRole('button', { name: 'Info for Stunned' });
    fireEvent.click(stunnedBtn);

    const tooltipSheet = screen.getByTestId('condition-tooltip-sheet');
    // Verify the name is displayed
    expect(tooltipSheet).toHaveTextContent('Stunned');
    // Verify some effect text is displayed (from CONDITIONS data)
    expect(tooltipSheet.querySelector('[class*="conditionTooltipEffect"]')).toBeInTheDocument();
  });

  it('closes tooltip sheet when overlay is tapped', () => {
    render(<CombatDashboard {...getDefaultProps()} />);

    const stunnedBtn = screen.getByRole('button', { name: 'Info for Stunned' });
    fireEvent.click(stunnedBtn);

    expect(screen.getByTestId('condition-tooltip-sheet')).toBeInTheDocument();

    const overlay = screen.getByTestId('condition-tooltip-overlay');
    fireEvent.click(overlay);

    expect(screen.queryByTestId('condition-tooltip-sheet')).not.toBeInTheDocument();
  });

  it('closes tooltip sheet after timeout', () => {
    render(<CombatDashboard {...getDefaultProps()} />);

    const stunnedBtn = screen.getByRole('button', { name: 'Info for Stunned' });
    fireEvent.click(stunnedBtn);

    expect(screen.getByTestId('condition-tooltip-sheet')).toBeInTheDocument();

    // Advance past the 4s timeout
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByTestId('condition-tooltip-sheet')).not.toBeInTheDocument();
  });

  it('toggles tooltip off when same condition badge is tapped again', () => {
    render(<CombatDashboard {...getDefaultProps()} />);

    const stunnedBtn = screen.getByRole('button', { name: 'Info for Stunned' });
    fireEvent.click(stunnedBtn);
    expect(screen.getByTestId('condition-tooltip-sheet')).toBeInTheDocument();

    fireEvent.click(stunnedBtn);
    expect(screen.queryByTestId('condition-tooltip-sheet')).not.toBeInTheDocument();
  });

  it('switches tooltip when a different condition badge is tapped', () => {
    render(<CombatDashboard {...getDefaultProps()} />);

    const stunnedBtn = screen.getByRole('button', { name: 'Info for Stunned' });
    fireEvent.click(stunnedBtn);

    const tooltipSheet = screen.getByTestId('condition-tooltip-sheet');
    expect(tooltipSheet).toHaveTextContent('Stunned');

    const bleedingBtn = screen.getByRole('button', { name: 'Info for Bleeding' });
    fireEvent.click(bleedingBtn);

    const updatedSheet = screen.getByTestId('condition-tooltip-sheet');
    expect(updatedSheet).toHaveTextContent('Bleeding');
  });

  it('does not show tooltip sheet on desktop viewport', () => {
    // Set to desktop width
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

    render(<CombatDashboard {...getDefaultProps()} />);

    const stunnedBtn = screen.getByRole('button', { name: 'Info for Stunned' });
    fireEvent.click(stunnedBtn);

    // No tooltip sheet on desktop
    expect(screen.queryByTestId('condition-tooltip-sheet')).not.toBeInTheDocument();
  });
});
