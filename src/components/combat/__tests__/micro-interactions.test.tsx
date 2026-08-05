import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatDashboard } from '../CombatDashboard';
import { RollResultDisplay } from '../../shared/RollResultDisplay';
import type { CombatState, Condition } from '../../../types/character';
import type { RollResult } from '../../../logic/dice-roller';

/**
 * Micro-interactions Tests
 * **Validates: Requirements 15.1, 16.1, 25.1**
 *
 * Tests verify that:
 * 1. CombatDashboard adds flash class when wounds decrease (red flash)
 * 2. CombatDashboard adds pulse class when advantage changes
 * 3. RollResultDisplay shows rolling state initially and reveals result after 300ms
 * 4. When prefers-reduced-motion: reduce is active, animations are suppressed
 */

// ─── matchMedia mock helper ──────────────────────────────────────────────────

function createMatchMedia(reducedMotion: boolean) {
  return (query: string): MediaQueryList => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? reducedMotion : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

// ─── CombatDashboard default props ──────────────────────────────────────────

const defaultCombatState: CombatState = {
  inCombat: true,
  initiative: 5,
  currentRound: 3,
  engaged: true,
  surprised: false,
};

function getDefaultDashboardProps() {
  return {
    wCur: 10,
    totalWounds: 14,
    advantage: 2,
    combatState: defaultCombatState,
    conditions: [] as Condition[],
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

// ─── RollResult fixture ─────────────────────────────────────────────────────

function createRollResult(overrides?: Partial<RollResult>): RollResult {
  return {
    roll: 42,
    targetNumber: 55,
    sl: 1,
    passed: true,
    outcome: '+1 SL',
    isCritical: false,
    isFumble: false,
    skillOrCharName: 'Weapon Skill',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Micro-interactions: Wound Flash (Requirement 15.1)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('adds red flash class when wounds decrease (damage taken)', () => {
    const props = getDefaultDashboardProps();
    const { rerender } = render(<CombatDashboard {...props} />);

    // Re-render with decreased wounds (damage)
    rerender(<CombatDashboard {...props} wCur={8} />);

    // The wound numbers container should have the red flash class
    const dashboard = screen.getByTestId('combat-dashboard');
    const woundNumbers = dashboard.querySelector('[class*="woundFlashRed"]');
    expect(woundNumbers).toBeInTheDocument();
  });

  it('adds green flash class when wounds increase (healing)', () => {
    const props = getDefaultDashboardProps();
    const { rerender } = render(<CombatDashboard {...props} />);

    // Re-render with increased wounds (healing)
    rerender(<CombatDashboard {...props} wCur={12} />);

    const dashboard = screen.getByTestId('combat-dashboard');
    const woundNumbers = dashboard.querySelector('[class*="woundFlashGreen"]');
    expect(woundNumbers).toBeInTheDocument();
  });

  it('removes flash class after 400ms', () => {
    const props = getDefaultDashboardProps();
    const { rerender } = render(<CombatDashboard {...props} />);

    rerender(<CombatDashboard {...props} wCur={8} />);

    // Flash should be present initially
    const dashboard = screen.getByTestId('combat-dashboard');
    expect(dashboard.querySelector('[class*="woundFlash"]')).toBeInTheDocument();

    // After 400ms, flash should be removed
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(dashboard.querySelector('[class*="woundFlash"]')).not.toBeInTheDocument();
  });
});

describe('Micro-interactions: Advantage Pulse (Requirement 16.1)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('adds pulse class when advantage increases', () => {
    const props = getDefaultDashboardProps();
    const { rerender } = render(<CombatDashboard {...props} />);

    // Re-render with increased advantage
    rerender(<CombatDashboard {...props} advantage={3} />);

    const dashboard = screen.getByTestId('combat-dashboard');
    const pulseElement = dashboard.querySelector('[class*="advantagePulse"]');
    expect(pulseElement).toBeInTheDocument();
  });

  it('adds pulse class when advantage decreases', () => {
    const props = getDefaultDashboardProps();
    const { rerender } = render(<CombatDashboard {...props} />);

    // Re-render with decreased advantage
    rerender(<CombatDashboard {...props} advantage={1} />);

    const dashboard = screen.getByTestId('combat-dashboard');
    const pulseElement = dashboard.querySelector('[class*="advantagePulse"]');
    expect(pulseElement).toBeInTheDocument();
  });

  it('removes pulse class after 300ms', () => {
    const props = getDefaultDashboardProps();
    const { rerender } = render(<CombatDashboard {...props} />);

    rerender(<CombatDashboard {...props} advantage={5} />);

    const dashboard = screen.getByTestId('combat-dashboard');
    expect(dashboard.querySelector('[class*="advantagePulse"]')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(dashboard.querySelector('[class*="advantagePulse"]')).not.toBeInTheDocument();
  });
});

describe('Micro-interactions: Dice Roll Animation (Requirement 25.1)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('shows rolling state initially (displays "..." placeholder)', () => {
    const result = createRollResult();
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    // During the rolling state, the roll value should show '...'
    const dialog = screen.getByRole('dialog', { name: 'Roll Result' });
    const rollValue = dialog.querySelector('[class*="rollValue"]');
    expect(rollValue).toHaveTextContent('...');
  });

  it('shows rolling animation class during initial 300ms', () => {
    const result = createRollResult();
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Roll Result' });
    const rollValue = dialog.querySelector('[class*="rollValue"]');
    expect(rollValue?.className).toContain('diceRoll');
  });

  it('reveals actual result after 300ms', () => {
    const result = createRollResult({ roll: 42 });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    // Advance timer past the 300ms rolling animation
    act(() => {
      vi.advanceTimersByTime(300);
    });

    const dialog = screen.getByRole('dialog', { name: 'Roll Result' });
    const rollValue = dialog.querySelector('[class*="rollValue"]');
    expect(rollValue).toHaveTextContent('42');
    expect(rollValue?.className).not.toContain('diceRoll');
  });
});

describe('Micro-interactions: prefers-reduced-motion suppresses animations', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    originalMatchMedia = window.matchMedia;
    // Mock prefers-reduced-motion: reduce
    window.matchMedia = createMatchMedia(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('RollResultDisplay shows result immediately without rolling animation', () => {
    const result = createRollResult({ roll: 77 });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    // With reduced motion, the result should be displayed immediately
    const dialog = screen.getByRole('dialog', { name: 'Roll Result' });
    const rollValue = dialog.querySelector('[class*="rollValue"]');
    expect(rollValue).toHaveTextContent('77');
    // Should NOT have the dice roll animation class
    expect(rollValue?.className).not.toContain('diceRoll');
  });
});
