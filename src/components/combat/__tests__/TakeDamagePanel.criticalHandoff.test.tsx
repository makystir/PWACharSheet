import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TakeDamagePanel } from '../TakeDamagePanel';
import type { TakeDamagePanelProps } from '../TakeDamagePanel';
import type { ArmourPoints } from '../../../types/character';

// ─── Test helpers ────────────────────────────────────────────────────────────
//
// Task 12.2: tests for the Take-Damage → critical-wound hand-off
// (ux-audit-improvements Req 8.1–8.4). The panel surfaces a "Roll Critical
// Wound" control only once applied damage has dropped the character to ≤0
// wounds (the existing down/critical state), and activating it defers entirely
// to the host's critical-wound flow via the onRollCritical callback. The panel
// invents no critical-wound result itself (Req 8.4).

const zeroArmour: ArmourPoints = {
  head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0,
};

function makeProps(overrides: Partial<TakeDamagePanelProps> = {}): TakeDamagePanelProps {
  return {
    toughnessBonus: 3,
    armourPoints: zeroArmour,
    armourList: [],
    weapons: [],
    useCriticalDeflection: false,
    onArmourUpdate: vi.fn(),
    wCur: 10,
    totalWounds: 12,
    onApplyWounds: vi.fn(),
    min1Wound: true,
    onDown: vi.fn(),
    ...overrides,
  };
}

function setDamage(value: number) {
  fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: String(value) } });
}

function applyWounds() {
  fireEvent.click(screen.getByLabelText('Apply wounds'));
}

// ─── Req 8.1 / 8.2: control appears only at ≤0 wounds / critical state ────────

describe('TakeDamagePanel — critical hand-off visibility (Req 8.1, 8.2)', () => {
  it('does not show the Roll Critical Wound control before any damage is applied', () => {
    render(<TakeDamagePanel {...makeProps({ onRollCritical: vi.fn() })} />);
    expect(screen.queryByTestId('roll-critical-btn')).not.toBeInTheDocument();
  });

  it('does not show the control when applied damage does NOT drop the PC to ≤0', () => {
    // wCur = 10, TB = 3, AP = 0 → net = 8 − 3 = 5; newWCur = 5 (> 0), not down.
    render(<TakeDamagePanel {...makeProps({ wCur: 10, onRollCritical: vi.fn() })} />);
    setDamage(8);
    applyWounds();
    expect(screen.queryByTestId('roll-critical-btn')).not.toBeInTheDocument();
  });

  it('shows the control after Apply Wounds drops the PC to ≤0', () => {
    // wCur = 5, TB = 3, AP = 0 → net = 12 − 3 = 9; newWCur clamps to 0 → down.
    render(<TakeDamagePanel {...makeProps({ wCur: 5, onRollCritical: vi.fn() })} />);
    setDamage(12);
    applyWounds();
    const btn = screen.getByTestId('roll-critical-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-label', 'Roll Critical Wound');
  });

  it('shows the control when applied damage brings the PC to exactly 0', () => {
    // wCur = 9, TB = 3, AP = 0 → net = 12 − 3 = 9; newWCur = 0 → down.
    render(<TakeDamagePanel {...makeProps({ wCur: 9, onRollCritical: vi.fn() })} />);
    setDamage(12);
    applyWounds();
    expect(screen.getByTestId('roll-critical-btn')).toBeInTheDocument();
  });
});

// ─── Req 8.4: hand-off invokes onRollCritical, invents no critical logic ──────

describe('TakeDamagePanel — critical hand-off invocation (Req 8.3, 8.4)', () => {
  it('invokes onRollCritical with the selected location when activated', () => {
    const onRollCritical = vi.fn();
    // Select Head, deal a lethal hit (Head AP 0), then hand off.
    render(<TakeDamagePanel {...makeProps({ wCur: 4, onRollCritical })} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Head' }));
    setDamage(12); // net = 12 − 3 = 9 ≥ 4 → down
    applyWounds();
    fireEvent.click(screen.getByTestId('roll-critical-btn'));
    expect(onRollCritical).toHaveBeenCalledTimes(1);
    expect(onRollCritical).toHaveBeenCalledWith('Head');
  });

  it('defaults the location to Body when none is changed', () => {
    const onRollCritical = vi.fn();
    render(<TakeDamagePanel {...makeProps({ wCur: 4, onRollCritical })} />);
    setDamage(12);
    applyWounds();
    fireEvent.click(screen.getByTestId('roll-critical-btn'));
    expect(onRollCritical).toHaveBeenCalledWith('Body');
  });

  it('does not compute or render a critical-wound result itself (no new critical logic)', () => {
    // The panel only surfaces the hand-off control; it must not render any
    // critical-wound outcome (that is the host RollCriticalFlow/CriticalWoundsPanel
    // concern). We assert nothing beyond the hand-off button + the pre-existing
    // "may take a critical" alert appears, and no result text is produced by the
    // panel before/after activating the control.
    const onRollCritical = vi.fn();
    render(<TakeDamagePanel {...makeProps({ wCur: 4, onRollCritical })} />);
    setDamage(12);
    applyWounds();

    // The down alert notes the character MAY take a critical — it does not roll one.
    expect(screen.getByTestId('down-alert')).toHaveTextContent('May take a Critical Wound');

    // Activating the control must not change the panel's own output — it merely
    // delegates. The button remains and no critical result element appears.
    fireEvent.click(screen.getByTestId('roll-critical-btn'));
    expect(screen.getByTestId('roll-critical-btn')).toBeInTheDocument();
    expect(screen.queryByText(/Critical Wound Result/i)).not.toBeInTheDocument();
    // No rolled critical value / severity is presented by the panel.
    expect(screen.queryByTestId('critical-wound-result')).not.toBeInTheDocument();
  });
});

// ─── Req 8.1: control absent when the host provides no hand-off callback ──────

describe('TakeDamagePanel — critical hand-off opt-out (Req 8.1)', () => {
  it('does not render the control when onRollCritical is not provided', () => {
    render(<TakeDamagePanel {...makeProps({ wCur: 4, onRollCritical: undefined })} />);
    setDamage(12);
    applyWounds();
    // Character is down (down alert shows) but there is no hand-off control.
    expect(screen.getByTestId('down-alert')).toBeInTheDocument();
    expect(screen.queryByTestId('roll-critical-btn')).not.toBeInTheDocument();
  });
});
