import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickRollBar } from '../combat/QuickRollBar';
import type { QuickRollBarProps } from '../combat/QuickRollBar';
import type { Character, CharacteristicKey, CharacteristicValue } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import type { RollResult } from '../../logic/dice-roller';

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeChar(overrides: Partial<Character> = {}): Character {
  const chars: Record<CharacteristicKey, CharacteristicValue> = {
    WS: { i: 35, a: 5, b: 0 },
    BS: { i: 30, a: 0, b: 0 },
    S: { i: 30, a: 0, b: 0 },
    T: { i: 40, a: 0, b: 0 },
    I: { i: 35, a: 5, b: 0 },
    Ag: { i: 30, a: 10, b: 0 },
    Dex: { i: 25, a: 0, b: 0 },
    Int: { i: 30, a: 0, b: 0 },
    WP: { i: 30, a: 5, b: 0 },
    Fel: { i: 25, a: 0, b: 0 },
  };

  return {
    ...BLANK_CHARACTER,
    chars,
    bSkills: [
      { n: 'Art', c: 'Dex', a: 0 },
      { n: 'Athletics', c: 'Ag', a: 5 },
      { n: 'Cool', c: 'WP', a: 10 },
      { n: 'Dodge', c: 'Ag', a: 15 },
      { n: 'Endurance', c: 'T', a: 5 },
      { n: 'Melee (Basic)', c: 'WS', a: 10 },
      { n: 'Melee ()', c: 'WS', a: 0 },
      { n: 'Perception', c: 'I', a: 5 },
    ],
    aSkills: [],
    ...overrides,
  };
}

function makeProps(overrides: Partial<QuickRollBarProps> = {}): QuickRollBarProps {
  return {
    character: makeChar(),
    onRoll: vi.fn(),
    ...overrides,
  };
}

// ─── 9.1: Component creation and props ──────────────────────────────────────

describe('QuickRollBar — basic rendering', () => {
  it('renders the Quick Rolls section header', () => {
    render(<QuickRollBar {...makeProps()} />);
    expect(screen.getByText('Quick Rolls')).toBeInTheDocument();
  });

  it('renders the scrollable bar container', () => {
    render(<QuickRollBar {...makeProps()} />);
    expect(screen.getByTestId('quick-roll-bar')).toBeInTheDocument();
  });
});

// ─── 9.2: Default skill list ────────────────────────────────────────────────

describe('QuickRollBar — default skills', () => {
  it('renders buttons for all six default combat skills', () => {
    render(<QuickRollBar {...makeProps()} />);
    expect(screen.getByLabelText('Roll Dodge')).toBeInTheDocument();
    expect(screen.getByLabelText('Roll Melee (Basic)')).toBeInTheDocument();
    expect(screen.getByLabelText('Roll Cool')).toBeInTheDocument();
    expect(screen.getByLabelText('Roll Endurance')).toBeInTheDocument();
    expect(screen.getByLabelText('Roll Athletics')).toBeInTheDocument();
    expect(screen.getByLabelText('Roll Perception')).toBeInTheDocument();
  });

  it('renders exactly 6 buttons when no extra combat skills exist', () => {
    render(<QuickRollBar {...makeProps()} />);
    const bar = screen.getByTestId('quick-roll-bar');
    const buttons = bar.querySelectorAll('button');
    expect(buttons.length).toBe(6);
  });
});

// ─── 9.3: Additional combat-relevant skills ─────────────────────────────────

describe('QuickRollBar — additional combat skills', () => {
  it('includes Melee specializations with advances > 0', () => {
    const char = makeChar({
      bSkills: [
        ...makeChar().bSkills,
        { n: 'Melee (Two-Handed)', c: 'WS', a: 10 },
      ],
    });
    render(<QuickRollBar {...makeProps({ character: char })} />);
    expect(screen.getByLabelText('Roll Melee (Two-Handed)')).toBeInTheDocument();
  });

  it('includes Ranged specializations with advances > 0 from aSkills', () => {
    const char = makeChar({
      aSkills: [
        { n: 'Ranged (Bow)', c: 'BS', a: 15 },
      ],
    });
    render(<QuickRollBar {...makeProps({ character: char })} />);
    expect(screen.getByLabelText('Roll Ranged (Bow)')).toBeInTheDocument();
  });

  it('does NOT include Melee specializations with 0 advances', () => {
    const char = makeChar({
      bSkills: [
        ...makeChar().bSkills,
        { n: 'Melee (Fencing)', c: 'WS', a: 0 },
      ],
    });
    render(<QuickRollBar {...makeProps({ character: char })} />);
    expect(screen.queryByLabelText('Roll Melee (Fencing)')).not.toBeInTheDocument();
  });

  it('does NOT include the empty Melee () placeholder', () => {
    render(<QuickRollBar {...makeProps()} />);
    expect(screen.queryByLabelText('Roll Melee ()')).not.toBeInTheDocument();
  });

  it('does NOT include non-combat skills even with advances', () => {
    const char = makeChar({
      aSkills: [
        { n: 'Language (Magick)', c: 'Int', a: 10 },
      ],
    });
    render(<QuickRollBar {...makeProps({ character: char })} />);
    expect(screen.queryByLabelText('Roll Language (Magick)')).not.toBeInTheDocument();
  });

  it('does not duplicate Melee (Basic) if it appears in both default and specialization scan', () => {
    render(<QuickRollBar {...makeProps()} />);
    const bar = screen.getByTestId('quick-roll-bar');
    const meleeBasicButtons = Array.from(bar.querySelectorAll('button')).filter(
      btn => btn.getAttribute('aria-label') === 'Roll Melee (Basic)'
    );
    expect(meleeBasicButtons.length).toBe(1);
  });
});

// ─── 9.4: Target number computation ────────────────────────────────────────

describe('QuickRollBar — target number computation', () => {
  it('computes Dodge target: Ag(30+10+0) + advances(15) = 55', () => {
    render(<QuickRollBar {...makeProps()} />);
    const btn = screen.getByLabelText('Roll Dodge');
    expect(btn.textContent).toContain('55');
  });

  it('computes Melee (Basic) target: WS(35+5+0) + advances(10) = 50', () => {
    render(<QuickRollBar {...makeProps()} />);
    const btn = screen.getByLabelText('Roll Melee (Basic)');
    expect(btn.textContent).toContain('50');
  });

  it('computes Cool target: WP(30+5+0) + advances(10) = 45', () => {
    render(<QuickRollBar {...makeProps()} />);
    const btn = screen.getByLabelText('Roll Cool');
    expect(btn.textContent).toContain('45');
  });

  it('computes Endurance target: T(40+0+0) + advances(5) = 45', () => {
    render(<QuickRollBar {...makeProps()} />);
    const btn = screen.getByLabelText('Roll Endurance');
    expect(btn.textContent).toContain('45');
  });

  it('computes Athletics target: Ag(30+10+0) + advances(5) = 45', () => {
    render(<QuickRollBar {...makeProps()} />);
    const btn = screen.getByLabelText('Roll Athletics');
    expect(btn.textContent).toContain('45');
  });

  it('computes Perception target: I(35+5+0) + advances(5) = 45', () => {
    render(<QuickRollBar {...makeProps()} />);
    const btn = screen.getByLabelText('Roll Perception');
    expect(btn.textContent).toContain('45');
  });

  it('includes characteristic bonus in target computation', () => {
    const char = makeChar();
    char.chars.Ag = { i: 30, a: 10, b: 5 }; // bonus of 5
    // Dodge: 30+10+5 + 15 = 60
    render(<QuickRollBar {...makeProps({ character: char })} />);
    const btn = screen.getByLabelText('Roll Dodge');
    expect(btn.textContent).toContain('60');
  });
});

// ─── 9.5: Button display format ─────────────────────────────────────────────

describe('QuickRollBar — button display', () => {
  it('shows dice emoji, skill name, and target on each button', () => {
    render(<QuickRollBar {...makeProps()} />);
    const btn = screen.getByLabelText('Roll Dodge');
    expect(btn.textContent).toContain('🎲');
    expect(btn.textContent).toContain('Dodge');
    expect(btn.textContent).toContain('55');
  });
});

// ─── 9.6: RollDialog integration ───────────────────────────────────────────

describe('QuickRollBar — RollDialog', () => {
  it('opens RollDialog when a skill button is tapped', () => {
    render(<QuickRollBar {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Roll Dodge'));
    expect(screen.getByRole('dialog', { name: 'Roll Dialog' })).toBeInTheDocument();
    expect(screen.getByText('Dodge')).toBeInTheDocument();
  });

  it('pre-populates RollDialog with correct base target', () => {
    render(<QuickRollBar {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Roll Dodge'));
    // Base target for Dodge = 55 — appears as both "Base Target" value and "Modified Target"
    const allTargets = screen.getAllByText('55');
    // At least 2: base target display + modified target (Challenging +0 = same)
    expect(allTargets.length).toBeGreaterThanOrEqual(2);
  });

  it('closes RollDialog when Cancel is clicked', () => {
    render(<QuickRollBar {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Roll Dodge'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByRole('dialog', { name: 'Roll Dialog' })).not.toBeInTheDocument();
  });
});

// ─── 9.7: Roll result callback and display ──────────────────────────────────

describe('QuickRollBar — roll result', () => {
  it('calls onRoll callback when a roll is made', () => {
    const onRoll = vi.fn();
    render(<QuickRollBar {...makeProps({ onRoll })} />);
    fireEvent.click(screen.getByLabelText('Roll Dodge'));
    fireEvent.click(screen.getByText('Roll'));
    expect(onRoll).toHaveBeenCalledTimes(1);
    const result: RollResult = onRoll.mock.calls[0][0];
    expect(result.skillOrCharName).toBe('Dodge');
  });

  it('displays RollResultDisplay after a roll is made', () => {
    render(<QuickRollBar {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Roll Dodge'));
    fireEvent.click(screen.getByText('Roll'));
    expect(screen.getByRole('dialog', { name: 'Roll Result' })).toBeInTheDocument();
  });

  it('closes RollResultDisplay when Dismiss is clicked', () => {
    render(<QuickRollBar {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Roll Dodge'));
    fireEvent.click(screen.getByText('Roll'));
    fireEvent.click(screen.getByText('Dismiss'));
    expect(screen.queryByRole('dialog', { name: 'Roll Result' })).not.toBeInTheDocument();
  });
});

// ─── 9.8: Horizontal scroll on mobile ──────────────────────────────────────

describe('QuickRollBar — horizontal scroll styling', () => {
  it('has overflow-x: auto on the bar container', () => {
    render(<QuickRollBar {...makeProps()} />);
    const bar = screen.getByTestId('quick-roll-bar');
    expect(bar.style.overflowX).toBe('auto');
  });

  it('has white-space: nowrap on the bar container', () => {
    render(<QuickRollBar {...makeProps()} />);
    const bar = screen.getByTestId('quick-roll-bar');
    expect(bar.style.whiteSpace).toBe('nowrap');
  });

  it('skill buttons have flex-shrink: 0 to prevent wrapping', () => {
    render(<QuickRollBar {...makeProps()} />);
    const btn = screen.getByLabelText('Roll Dodge');
    expect(btn.style.flexShrink).toBe('0');
  });
});
