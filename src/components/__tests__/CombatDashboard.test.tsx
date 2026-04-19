import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatDashboard } from '../combat/CombatDashboard';
import type { CombatDashboardProps } from '../combat/CombatDashboard';
import type { CombatState, Condition } from '../../types/character';

function makeProps(overrides: Partial<CombatDashboardProps> = {}): CombatDashboardProps {
  const defaultCombatState: CombatState = {
    inCombat: false,
    initiative: 0,
    currentRound: 0,
    engaged: false,
    surprised: false,
  };
  return {
    wCur: 10,
    totalWounds: 20,
    advantage: 0,
    combatState: defaultCombatState,
    conditions: [],
    fortune: 3,
    fate: 3,
    resolve: 2,
    resilience: 2,
    inCombat: false,
    onUpdateWounds: vi.fn(),
    onUpdateAdvantage: vi.fn(),
    onUpdateRound: vi.fn(),
    onToggleEngaged: vi.fn(),
    onRemoveCondition: vi.fn(),
    onSpendFortune: vi.fn(),
    onSpendResolve: vi.fn(),
    onOpenConditionPicker: vi.fn(),
    ...overrides,
  };
}

// ─── Wounds Display (3.2) ────────────────────────────────────────────────────

describe('CombatDashboard — Wounds Display', () => {
  it('renders current wounds and total', () => {
    render(<CombatDashboard {...makeProps({ wCur: 7, totalWounds: 14 })} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(/\/ 14/)).toBeInTheDocument();
  });

  it('calls onUpdateWounds(-1) when − button is clicked', () => {
    const onUpdateWounds = vi.fn();
    render(<CombatDashboard {...makeProps({ onUpdateWounds })} />);
    fireEvent.click(screen.getByLabelText('Decrease wounds'));
    expect(onUpdateWounds).toHaveBeenCalledWith(-1);
  });

  it('calls onUpdateWounds(1) when + button is clicked', () => {
    const onUpdateWounds = vi.fn();
    render(<CombatDashboard {...makeProps({ onUpdateWounds })} />);
    fireEvent.click(screen.getByLabelText('Increase wounds'));
    expect(onUpdateWounds).toHaveBeenCalledWith(1);
  });

  it('calls onUpdateWounds with delta to full when Full button is clicked', () => {
    const onUpdateWounds = vi.fn();
    render(<CombatDashboard {...makeProps({ wCur: 5, totalWounds: 20, onUpdateWounds })} />);
    fireEvent.click(screen.getByLabelText('Full wounds'));
    expect(onUpdateWounds).toHaveBeenCalledWith(15); // 20 - 5
  });

  it('shows "Down!" alert when wCur is 0', () => {
    render(<CombatDashboard {...makeProps({ wCur: 0, totalWounds: 10 })} />);
    expect(screen.getByTestId('down-alert')).toHaveTextContent('Down!');
  });

  it('does not show "Down!" alert when wCur > 0', () => {
    render(<CombatDashboard {...makeProps({ wCur: 1, totalWounds: 10 })} />);
    expect(screen.queryByTestId('down-alert')).not.toBeInTheDocument();
  });
});

// ─── Advantage Counter (3.3) ─────────────────────────────────────────────────

describe('CombatDashboard — Advantage Counter', () => {
  it('does not render advantage when inCombat is false', () => {
    render(<CombatDashboard {...makeProps({ inCombat: false })} />);
    expect(screen.queryByText('Advantage')).not.toBeInTheDocument();
  });

  it('renders advantage counter when inCombat is true', () => {
    render(<CombatDashboard {...makeProps({ inCombat: true, advantage: 7, fortune: 2, fate: 2 })} />);
    expect(screen.getByText('Advantage')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('calls onUpdateAdvantage(1) when + is clicked', () => {
    const onUpdateAdvantage = vi.fn();
    render(<CombatDashboard {...makeProps({ inCombat: true, onUpdateAdvantage })} />);
    fireEvent.click(screen.getByLabelText('Increase advantage'));
    expect(onUpdateAdvantage).toHaveBeenCalledWith(1);
  });

  it('calls onUpdateAdvantage(-1) when − is clicked', () => {
    const onUpdateAdvantage = vi.fn();
    render(<CombatDashboard {...makeProps({ inCombat: true, onUpdateAdvantage })} />);
    fireEvent.click(screen.getByLabelText('Decrease advantage'));
    expect(onUpdateAdvantage).toHaveBeenCalledWith(-1);
  });

  it('calls onUpdateAdvantage with negative current value when Reset is clicked', () => {
    const onUpdateAdvantage = vi.fn();
    render(<CombatDashboard {...makeProps({ inCombat: true, advantage: 5, onUpdateAdvantage })} />);
    fireEvent.click(screen.getByLabelText('Reset advantage'));
    expect(onUpdateAdvantage).toHaveBeenCalledWith(-5);
  });
});

// ─── Round Counter (3.4) ─────────────────────────────────────────────────────

describe('CombatDashboard — Round Counter', () => {
  it('does not render round counter when inCombat is false', () => {
    render(<CombatDashboard {...makeProps({ inCombat: false })} />);
    expect(screen.queryByText('Round')).not.toBeInTheDocument();
  });

  it('renders round counter when inCombat is true', () => {
    const combatState: CombatState = { inCombat: true, initiative: 0, currentRound: 3, engaged: false, surprised: false };
    render(<CombatDashboard {...makeProps({ inCombat: true, combatState })} />);
    expect(screen.getByText('Round')).toBeInTheDocument();
  });

  it('calls onUpdateRound(1) when + is clicked', () => {
    const onUpdateRound = vi.fn();
    render(<CombatDashboard {...makeProps({ inCombat: true, onUpdateRound })} />);
    fireEvent.click(screen.getByLabelText('Increase round'));
    expect(onUpdateRound).toHaveBeenCalledWith(1);
  });

  it('calls onUpdateRound(-1) when − is clicked', () => {
    const onUpdateRound = vi.fn();
    render(<CombatDashboard {...makeProps({ inCombat: true, onUpdateRound })} />);
    fireEvent.click(screen.getByLabelText('Decrease round'));
    expect(onUpdateRound).toHaveBeenCalledWith(-1);
  });
});

// ─── Engaged Toggle (3.5) ────────────────────────────────────────────────────

describe('CombatDashboard — Engaged Toggle', () => {
  it('does not render engaged toggle when inCombat is false', () => {
    render(<CombatDashboard {...makeProps({ inCombat: false })} />);
    expect(screen.queryByLabelText('Engage')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Disengage')).not.toBeInTheDocument();
  });

  it('renders "Not Engaged" when not engaged', () => {
    const combatState: CombatState = { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false };
    render(<CombatDashboard {...makeProps({ inCombat: true, combatState })} />);
    expect(screen.getByText('Not Engaged')).toBeInTheDocument();
  });

  it('renders "⚔ Engaged" when engaged', () => {
    const combatState: CombatState = { inCombat: true, initiative: 0, currentRound: 1, engaged: true, surprised: false };
    render(<CombatDashboard {...makeProps({ inCombat: true, combatState })} />);
    expect(screen.getByText('⚔ Engaged')).toBeInTheDocument();
  });

  it('calls onToggleEngaged when clicked', () => {
    const onToggleEngaged = vi.fn();
    const combatState: CombatState = { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false };
    render(<CombatDashboard {...makeProps({ inCombat: true, combatState, onToggleEngaged })} />);
    fireEvent.click(screen.getByText('Not Engaged'));
    expect(onToggleEngaged).toHaveBeenCalledTimes(1);
  });
});

// ─── Condition Badges (3.6) ──────────────────────────────────────────────────

describe('CombatDashboard — Condition Badges', () => {
  it('renders condition badges for active conditions', () => {
    const conditions: Condition[] = [
      { name: 'Bleeding', level: 2 },
      { name: 'Stunned', level: 1 },
    ];
    render(<CombatDashboard {...makeProps({ conditions })} />);
    expect(screen.getByText('Bleeding (2)')).toBeInTheDocument();
    expect(screen.getByText('Stunned')).toBeInTheDocument();
  });

  it('shows level only for stackable conditions with level > 1', () => {
    const conditions: Condition[] = [
      { name: 'Ablaze', level: 3 },  // stackable
      { name: 'Prone', level: 1 },   // non-stackable
    ];
    render(<CombatDashboard {...makeProps({ conditions })} />);
    expect(screen.getByText('Ablaze (3)')).toBeInTheDocument();
    expect(screen.getByText('Prone')).toBeInTheDocument();
  });

  it('calls onRemoveCondition when ✕ is clicked', () => {
    const onRemoveCondition = vi.fn();
    const conditions: Condition[] = [{ name: 'Stunned', level: 1 }];
    render(<CombatDashboard {...makeProps({ conditions, onRemoveCondition })} />);
    fireEvent.click(screen.getByLabelText('Remove Stunned'));
    expect(onRemoveCondition).toHaveBeenCalledWith('Stunned');
  });

  it('opens tooltip when condition badge is tapped', () => {
    const conditions: Condition[] = [{ name: 'Bleeding', level: 1 }];
    render(<CombatDashboard {...makeProps({ conditions })} />);
    fireEvent.click(screen.getByLabelText('Info for Bleeding'));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Bleeding');
  });

  it('renders "+" button to open condition picker in combat mode', () => {
    const onOpenConditionPicker = vi.fn();
    render(<CombatDashboard {...makeProps({ inCombat: true, onOpenConditionPicker })} />);
    fireEvent.click(screen.getByLabelText('Add condition'));
    expect(onOpenConditionPicker).toHaveBeenCalledTimes(1);
  });

  it('does not render "+" button when not in combat', () => {
    render(<CombatDashboard {...makeProps({ inCombat: false })} />);
    expect(screen.queryByLabelText('Add condition')).not.toBeInTheDocument();
  });
});

// ─── Fortune / Resolve Display (3.7) ────────────────────────────────────────

describe('CombatDashboard — Fortune / Resolve', () => {
  it('renders fortune and resolve numbers', () => {
    render(<CombatDashboard {...makeProps({ fortune: 2, fate: 3, resolve: 1, resilience: 2 })} />);
    expect(screen.getByLabelText('Toggle fortune popover')).toHaveTextContent('2');
    expect(screen.getByLabelText('Toggle resolve popover')).toHaveTextContent('1');
  });

  it('opens fortune popover with spend buttons on tap', () => {
    render(<CombatDashboard {...makeProps({ fortune: 2, fate: 3 })} />);
    fireEvent.click(screen.getByLabelText('Toggle fortune popover'));
    expect(screen.getByTestId('fortune-popover')).toBeInTheDocument();
    expect(screen.getByText('Reroll')).toBeInTheDocument();
    expect(screen.getByText('Add +1 SL')).toBeInTheDocument();
    expect(screen.getByText('Special Ability')).toBeInTheDocument();
  });

  it('calls onSpendFortune when a spend reason is clicked', () => {
    const onSpendFortune = vi.fn();
    render(<CombatDashboard {...makeProps({ fortune: 2, fate: 3, onSpendFortune })} />);
    fireEvent.click(screen.getByLabelText('Toggle fortune popover'));
    fireEvent.click(screen.getByText('Reroll'));
    expect(onSpendFortune).toHaveBeenCalledWith('Reroll');
  });

  it('opens resolve popover with spend buttons on tap', () => {
    render(<CombatDashboard {...makeProps({ resolve: 1, resilience: 2 })} />);
    fireEvent.click(screen.getByLabelText('Toggle resolve popover'));
    expect(screen.getByTestId('resolve-popover')).toBeInTheDocument();
    expect(screen.getByText('Immunity to Psychology')).toBeInTheDocument();
    expect(screen.getByText('Remove Conditions')).toBeInTheDocument();
  });

  it('calls onSpendResolve when a spend reason is clicked', () => {
    const onSpendResolve = vi.fn();
    render(<CombatDashboard {...makeProps({ resolve: 1, resilience: 2, onSpendResolve })} />);
    fireEvent.click(screen.getByLabelText('Toggle resolve popover'));
    fireEvent.click(screen.getByText('Remove Conditions'));
    expect(onSpendResolve).toHaveBeenCalledWith('Remove Conditions');
  });

  it('disables fortune spend buttons when fortune is 0', () => {
    render(<CombatDashboard {...makeProps({ fortune: 0, fate: 3 })} />);
    fireEvent.click(screen.getByLabelText('Toggle fortune popover'));
    const rerollBtn = screen.getByText('Reroll');
    expect(rerollBtn).toBeDisabled();
  });

  it('disables resolve spend buttons when resolve is 0', () => {
    render(<CombatDashboard {...makeProps({ resolve: 0, resilience: 2 })} />);
    fireEvent.click(screen.getByLabelText('Toggle resolve popover'));
    const immunityBtn = screen.getByText('Immunity to Psychology');
    expect(immunityBtn).toBeDisabled();
  });
});

// ─── Readiness Mode (3.8 / 3.9 / Req 1.9) ──────────────────────────────────

describe('CombatDashboard — Readiness Mode', () => {
  it('hides advantage, round, and engaged toggle when not in combat', () => {
    render(<CombatDashboard {...makeProps({ inCombat: false })} />);
    expect(screen.queryByText('Advantage')).not.toBeInTheDocument();
    expect(screen.queryByText('Round')).not.toBeInTheDocument();
    expect(screen.queryByText('Not Engaged')).not.toBeInTheDocument();
  });

  it('still shows wounds and fortune/resolve when not in combat', () => {
    render(<CombatDashboard {...makeProps({ inCombat: false, wCur: 8, totalWounds: 12, fortune: 2, resolve: 1 })} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Wounds')).toBeInTheDocument();
    expect(screen.getByText('Fortune')).toBeInTheDocument();
    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  it('still shows condition badges when not in combat', () => {
    const conditions: Condition[] = [{ name: 'Fatigued', level: 2 }];
    render(<CombatDashboard {...makeProps({ inCombat: false, conditions })} />);
    expect(screen.getByText('Fatigued (2)')).toBeInTheDocument();
  });
});

// ─── Sticky Positioning (3.8) ────────────────────────────────────────────────

describe('CombatDashboard — Sticky Positioning', () => {
  it('applies sticky positioning when inCombat is true', () => {
    render(<CombatDashboard {...makeProps({ inCombat: true })} />);
    const dashboard = screen.getByTestId('combat-dashboard');
    expect(dashboard.style.position).toBe('sticky');
    expect(dashboard.style.top).toBe('0px');
    expect(dashboard.style.zIndex).toBe('50');
  });

  it('does not apply sticky positioning when inCombat is false', () => {
    render(<CombatDashboard {...makeProps({ inCombat: false })} />);
    const dashboard = screen.getByTestId('combat-dashboard');
    expect(dashboard.style.position).not.toBe('sticky');
  });
});
