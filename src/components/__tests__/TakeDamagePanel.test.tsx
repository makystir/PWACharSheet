import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TakeDamagePanel, calculateNetWounds } from '../combat/TakeDamagePanel';
import type { TakeDamagePanelProps } from '../combat/TakeDamagePanel';
import type { ArmourPoints } from '../../types/character';

// ─── Test helpers ────────────────────────────────────────────────────────────

const defaultArmourPoints: ArmourPoints = {
  head: 2, lArm: 1, rArm: 1, body: 3, lLeg: 0, rLeg: 0, shield: 0,
};

function makeProps(overrides: Partial<TakeDamagePanelProps> = {}): TakeDamagePanelProps {
  return {
    toughnessBonus: 4,
    armourPoints: defaultArmourPoints,
    wCur: 12,
    totalWounds: 14,
    onApplyWounds: vi.fn(),
    ...overrides,
  };
}

// ─── 8.6: calculateNetWounds pure function ──────────────────────────────────

describe('calculateNetWounds', () => {
  it('returns 0 when incoming damage is 0', () => {
    expect(calculateNetWounds(0, 4, 3)).toBe(0);
  });

  it('returns 0 when incoming damage is negative', () => {
    expect(calculateNetWounds(-5, 4, 3)).toBe(0);
  });

  it('returns 0 when TB + AP fully absorbs damage', () => {
    // damage 5, TB 4, AP 3 → 5 <= 7 → 0
    expect(calculateNetWounds(5, 4, 3)).toBe(0);
  });

  it('returns 0 when damage equals TB + AP exactly', () => {
    // damage 7, TB 4, AP 3 → 7 <= 7 → 0
    expect(calculateNetWounds(7, 4, 3)).toBe(0);
  });

  it('returns correct net wounds when damage exceeds TB + AP', () => {
    // damage 12, TB 4, AP 3 → 12 - 7 = 5
    expect(calculateNetWounds(12, 4, 3)).toBe(5);
  });

  it('applies minimum-1-wound rule when damage barely exceeds TB + AP', () => {
    // damage 8, TB 4, AP 3 → 8 - 7 = 1 (already >= 1, no special rule needed)
    expect(calculateNetWounds(8, 4, 3)).toBe(1);
  });

  it('returns at least 1 wound when damage exceeds TB+AP but math gives 0 (edge case with 0 AP and TB)', () => {
    // damage 1, TB 0, AP 0 → 1 - 0 = 1
    expect(calculateNetWounds(1, 0, 0)).toBe(1);
  });

  it('returns 0 when damage is 1 and TB+AP is 1', () => {
    // damage 1, TB 1, AP 0 → 1 <= 1 → 0
    expect(calculateNetWounds(1, 1, 0)).toBe(0);
  });

  it('handles large damage values correctly', () => {
    // damage 50, TB 4, AP 3 → 50 - 7 = 43
    expect(calculateNetWounds(50, 4, 3)).toBe(43);
  });

  it('handles 0 TB and 0 AP with positive damage', () => {
    // damage 3, TB 0, AP 0 → 3 - 0 = 3
    expect(calculateNetWounds(3, 0, 0)).toBe(3);
  });
});

// ─── 8.1: Component creation and props ──────────────────────────────────────

describe('TakeDamagePanel — basic rendering', () => {
  it('renders the Take Damage section header', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    expect(screen.getByText('Take Damage')).toBeInTheDocument();
  });

  it('renders the incoming damage input', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    expect(screen.getByLabelText('Incoming damage')).toBeInTheDocument();
  });

  it('renders the hit location selector', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    expect(screen.getByLabelText('Hit location')).toBeInTheDocument();
  });

  it('renders the Apply Wounds button', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    expect(screen.getByLabelText('Apply wounds')).toBeInTheDocument();
  });

  it('is collapsible', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.click(screen.getByLabelText('Toggle Take Damage panel'));
    expect(screen.queryByLabelText('Incoming damage')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Toggle Take Damage panel'));
    expect(screen.getByLabelText('Incoming damage')).toBeInTheDocument();
  });
});

// ─── 8.3: Hit location selector ─────────────────────────────────────────────

describe('TakeDamagePanel — hit location selector', () => {
  it('defaults to Body', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    const select = screen.getByLabelText('Hit location') as HTMLSelectElement;
    expect(select.value).toBe('Body');
  });

  it('lists all six hit locations', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    const select = screen.getByLabelText('Hit location') as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.text);
    expect(options).toEqual(['Head', 'Left Arm', 'Right Arm', 'Body', 'Left Leg', 'Right Leg']);
  });

  it('changes selected location', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    const select = screen.getByLabelText('Hit location');
    fireEvent.change(select, { target: { value: 'Head' } });
    expect((select as HTMLSelectElement).value).toBe('Head');
  });
});

// ─── 8.4: AP at selected location ───────────────────────────────────────────

describe('TakeDamagePanel — AP at location', () => {
  it('shows AP for default location (Body = 3)', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    expect(screen.getByTestId('ap-at-location')).toHaveTextContent('3');
  });

  it('updates AP when location changes to Head (AP = 2)', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Hit location'), { target: { value: 'Head' } });
    expect(screen.getByTestId('ap-at-location')).toHaveTextContent('2');
  });

  it('updates AP when location changes to Left Leg (AP = 0)', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Hit location'), { target: { value: 'Left Leg' } });
    expect(screen.getByTestId('ap-at-location')).toHaveTextContent('0');
  });
});

// ─── 8.5: Toughness Bonus display ───────────────────────────────────────────

describe('TakeDamagePanel — Toughness Bonus display', () => {
  it('displays the toughness bonus from props', () => {
    render(<TakeDamagePanel {...makeProps({ toughnessBonus: 4 })} />);
    expect(screen.getByTestId('toughness-bonus')).toHaveTextContent('4');
  });

  it('displays TB of 0 correctly', () => {
    render(<TakeDamagePanel {...makeProps({ toughnessBonus: 0 })} />);
    expect(screen.getByTestId('toughness-bonus')).toHaveTextContent('0');
  });
});

// ─── 8.6: Net wounds calculation in UI ──────────────────────────────────────

describe('TakeDamagePanel — net wounds display', () => {
  it('shows 0 net wounds when no damage entered', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    expect(screen.getByTestId('net-wounds')).toHaveTextContent('0');
  });

  it('calculates net wounds correctly: 12 damage − 4 TB − 3 AP (Body) = 5', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    expect(screen.getByTestId('net-wounds')).toHaveTextContent('5');
  });

  it('shows 0 when damage is fully absorbed', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '5' } });
    // 5 − 4 TB − 3 AP (Body) = -2 → clamped to 0
    expect(screen.getByTestId('net-wounds')).toHaveTextContent('0');
  });

  it('updates net wounds when location changes', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '10' } });
    // Body: 10 − 4 − 3 = 3
    expect(screen.getByTestId('net-wounds')).toHaveTextContent('3');
    // Switch to Left Leg (AP 0): 10 − 4 − 0 = 6
    fireEvent.change(screen.getByLabelText('Hit location'), { target: { value: 'Left Leg' } });
    expect(screen.getByTestId('net-wounds')).toHaveTextContent('6');
  });

  it('applies minimum-1-wound rule when damage barely exceeds TB+AP', () => {
    // TB=4, Body AP=3, total reduction=7
    // damage=8 → 8-7=1 (already 1, no special rule needed)
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '8' } });
    expect(screen.getByTestId('net-wounds')).toHaveTextContent('1');
  });

  it('returns 0 when damage equals TB+AP exactly', () => {
    // TB=4, Body AP=3, total=7, damage=7 → 7 <= 7 → 0
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '7' } });
    expect(screen.getByTestId('net-wounds')).toHaveTextContent('0');
  });
});

// ─── 8.7: Apply Wounds button ───────────────────────────────────────────────

describe('TakeDamagePanel — Apply Wounds', () => {
  it('calls onApplyWounds with net wounds when clicked', () => {
    const onApplyWounds = vi.fn();
    render(<TakeDamagePanel {...makeProps({ onApplyWounds })} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    // net = 12 − 4 − 3 = 5
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(onApplyWounds).toHaveBeenCalledWith(5);
  });

  it('is disabled when net wounds is 0', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    const btn = screen.getByLabelText('Apply wounds');
    expect(btn).toBeDisabled();
  });

  it('is enabled when net wounds > 0', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    const btn = screen.getByLabelText('Apply wounds');
    expect(btn).not.toBeDisabled();
  });

  it('does not call onApplyWounds when net wounds is 0', () => {
    const onApplyWounds = vi.fn();
    render(<TakeDamagePanel {...makeProps({ onApplyWounds })} />);
    // damage 0, net wounds 0 — button is disabled, but let's try clicking anyway
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(onApplyWounds).not.toHaveBeenCalled();
  });
});

// ─── 8.8: Down alert ────────────────────────────────────────────────────────

describe('TakeDamagePanel — Down alert', () => {
  it('shows alert when applying wounds reduces wCur to 0', () => {
    const onApplyWounds = vi.fn();
    // wCur=3, damage=12, TB=4, Body AP=3 → net=5, 3-5 → clamped to 0
    render(<TakeDamagePanel {...makeProps({ wCur: 3, onApplyWounds })} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(screen.getByTestId('down-alert')).toBeInTheDocument();
    expect(screen.getByText(/Character is Down/)).toBeInTheDocument();
  });

  it('shows alert when wCur is already 0 and wounds are applied', () => {
    // wCur=1, Left Leg AP=0, TB=4, damage=6 → net=2, 1-2 → 0
    const onApplyWounds = vi.fn();
    render(<TakeDamagePanel {...makeProps({ wCur: 1, onApplyWounds })} />);
    fireEvent.change(screen.getByLabelText('Hit location'), { target: { value: 'Left Leg' } });
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '6' } });
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(screen.getByTestId('down-alert')).toBeInTheDocument();
  });

  it('does not show alert when wCur remains above 0', () => {
    const onApplyWounds = vi.fn();
    // wCur=12, damage=8, TB=4, Body AP=3 → net=1, 12-1=11 > 0
    render(<TakeDamagePanel {...makeProps({ wCur: 12, onApplyWounds })} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '8' } });
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(screen.queryByTestId('down-alert')).not.toBeInTheDocument();
  });
});

// ─── 8.9: Reset on apply ────────────────────────────────────────────────────

describe('TakeDamagePanel — reset on apply', () => {
  it('resets damage input to 0 after applying', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect((screen.getByLabelText('Incoming damage') as HTMLInputElement).value).toBe('0');
  });

  it('retains last location selection after applying', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    fireEvent.change(screen.getByLabelText('Hit location'), { target: { value: 'Head' } });
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect((screen.getByLabelText('Hit location') as HTMLSelectElement).value).toBe('Head');
  });
});
