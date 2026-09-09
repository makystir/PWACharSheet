import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TakeDamagePanel } from '../TakeDamagePanel';
import type { TakeDamagePanelProps } from '../TakeDamagePanel';
import type { ArmourItem, ArmourPoints, WeaponItem } from '../../../types/character';

// ─── Test helpers ────────────────────────────────────────────────────────────
//
// Task 6.3: render tests for the Advanced_Qualities_Section (Req 3.1–3.5).
// These assert the panel's presentational behaviour only; the appendEvent
// wiring lives in CombatPage, so here we assert the panel invokes onLogDamage.

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

// A worn Bascinet covering the Head location (visor down) makes the
// "Frontal Missile?" toggle applicable.
const bascinet: ArmourItem = {
  name: 'Bascinet',
  locations: 'Head',
  enc: '1',
  ap: 2,
  qualities: '',
  worn: true,
  visorOpen: false,
};

// A shield weapon (group contains "Shield") makes the
// "Defended with Shield" toggle applicable.
const shield: WeaponItem = {
  name: 'Shield',
  group: 'Shield',
  enc: '1',
  damage: 'SB+0',
  qualities: 'Defensive, Shield Rating 2',
};

// The Advanced Qualities collapsible persists its expanded/collapsed state to
// localStorage; clear it before each test so "collapsed by default" holds.
beforeEach(() => {
  localStorage.clear();
});

// ─── Req 3.1: primary inputs always visible ──────────────────────────────────

describe('TakeDamagePanel — primary inputs (Req 3.1)', () => {
  it('shows Damage, SL, and Location inputs in the always-visible region', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    expect(screen.getByLabelText('Incoming damage')).toBeInTheDocument();
    expect(screen.getByLabelText('Success Levels')).toBeInTheDocument();
    // Location is a chip radiogroup labelled 'Hit location' (Req 10.2).
    expect(screen.getByRole('radiogroup', { name: 'Hit location' })).toBeInTheDocument();
  });
});

// ─── Req 3.2 / 3.3: advanced toggles collapsed by default ────────────────────

describe('TakeDamagePanel — Advanced Qualities section (Req 3.2, 3.3)', () => {
  it('renders an "Advanced Qualities" section collapsed by default', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    const advancedToggle = screen.getByRole('button', { name: 'Advanced Qualities' });
    expect(advancedToggle).toBeInTheDocument();
    // CollapsibleSection reports collapsed state via aria-expanded=false on its header.
    expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('hides the advanced toggles content while collapsed (aria-hidden)', () => {
    const { container } = render(<TakeDamagePanel {...makeProps()} />);
    // The collapsible content wrapper is marked aria-hidden + data-expanded=false.
    const collapsedContent = container.querySelector('[data-expanded="false"]');
    expect(collapsedContent).not.toBeNull();
    expect(collapsedContent).toHaveAttribute('aria-hidden', 'true');
    // The To-Hit parity control and Impale/Penetrating toggles live inside it.
    // Query by text/testid rather than role: because the region is aria-hidden,
    // role queries would (correctly) exclude these nodes.
    const region = collapsedContent as HTMLElement;
    expect(within(region).getByText('To-Hit Roll:')).toBeInTheDocument();
    expect(within(region).getByText('Impale')).toBeInTheDocument();
    expect(within(region).getByTestId('penetrating-toggle')).toBeInTheDocument();
  });

  it('reveals the advanced toggles when the section is expanded', () => {
    render(<TakeDamagePanel {...makeProps({ armourList: [bascinet], weapons: [shield] })} />);
    const advancedToggle = screen.getByRole('button', { name: 'Advanced Qualities' });
    fireEvent.click(advancedToggle);
    expect(advancedToggle).toHaveAttribute('aria-expanded', 'true');
    // All five advanced toggles are the To-Hit parity, Impale, Penetrating,
    // Frontal Missile (needs Bascinet + Head), Defended with Shield (needs shield).
    // Location is now a chip radiogroup (ux-audit-improvements Req 10.2); pick
    // Head by clicking its chip. Disambiguate the To-hit parity radiogroup by
    // its accessible name (the location group's name is 'Hit location').
    fireEvent.click(screen.getByRole('radio', { name: 'Head' }));
    expect(screen.getByRole('radiogroup', { name: 'To-hit roll parity' })).toBeInTheDocument();
    expect(screen.getByText('Impale')).toBeInTheDocument();
    expect(screen.getByTestId('penetrating-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('frontal-missile-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('defended-with-shield-toggle')).toBeInTheDocument();
  });
});

// ─── Req 3.3: collapsed net wounds equals prior default behaviour ─────────────

describe('TakeDamagePanel — collapsed net wounds unchanged (Req 3.3)', () => {
  it('computes net wounds with default toggle values while section is collapsed', () => {
    render(<TakeDamagePanel {...makeProps()} />);
    // Section is collapsed by default. Enter Damage 12, SL 0, Body (AP 3), TB 4.
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    // Expected: 12 + 0 − 4 TB − 3 AP = 5 (Penetrating/Shield defaults off).
    expect(screen.getByTestId('net-wounds')).toHaveTextContent('5');
  });

  it('collapsed net wounds matches the value produced with toggles at their defaults', () => {
    // Render A: leave collapsed and read net wounds.
    const { unmount } = render(<TakeDamagePanel {...makeProps({ weapons: [shield] })} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Success Levels'), { target: { value: '2' } });
    const collapsedValue = screen.getByTestId('net-wounds').textContent;
    unmount();

    // Render B: expand the section but leave every toggle at its default, then
    // read net wounds. It must equal the collapsed value (unchanged when untouched).
    render(<TakeDamagePanel {...makeProps({ weapons: [shield] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced Qualities' }));
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Success Levels'), { target: { value: '2' } });
    const expandedDefaultValue = screen.getByTestId('net-wounds').textContent;

    expect(expandedDefaultValue).toBe(collapsedValue);
    // Sanity: 10 + 2 − 4 TB − 3 AP = 5 with all toggles default-off.
    expect(collapsedValue).toBe('5');
  });
});

// ─── Req 3.4: inapplicable toggles omitted ────────────────────────────────────

describe('TakeDamagePanel — inapplicable toggles omitted (Req 3.4)', () => {
  it('omits "Frontal Missile" when no Bascinet is worn', () => {
    render(<TakeDamagePanel {...makeProps({ armourList: [] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced Qualities' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Head' }));
    expect(screen.queryByTestId('frontal-missile-toggle')).not.toBeInTheDocument();
  });

  it('omits "Defended with Shield" when no shield is equipped', () => {
    render(<TakeDamagePanel {...makeProps({ weapons: [] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced Qualities' }));
    expect(screen.queryByTestId('defended-with-shield-toggle')).not.toBeInTheDocument();
  });

  it('shows "Frontal Missile" only at the Head location with a Bascinet worn', () => {
    render(<TakeDamagePanel {...makeProps({ armourList: [bascinet] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced Qualities' }));
    // Body location → Bascinet does not cover it → toggle omitted.
    expect(screen.queryByTestId('frontal-missile-toggle')).not.toBeInTheDocument();
    // Head location → toggle appears.
    fireEvent.click(screen.getByRole('radio', { name: 'Head' }));
    expect(screen.getByTestId('frontal-missile-toggle')).toBeInTheDocument();
  });

  it('shows "Defended with Shield" when a shield is equipped', () => {
    render(<TakeDamagePanel {...makeProps({ weapons: [shield] })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced Qualities' }));
    expect(screen.getByTestId('defended-with-shield-toggle')).toBeInTheDocument();
  });
});

// ─── Req 3.5: apply-wounds logs a combat event via onLogDamage ────────────────

describe('TakeDamagePanel — apply wounds logging (Req 3.5)', () => {
  it('invokes onLogDamage with (netWounds, newWCur, location) on Apply Wounds', () => {
    const onLogDamage = vi.fn();
    render(<TakeDamagePanel {...makeProps({ wCur: 12, onLogDamage })} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    // net = 12 − 4 TB − 3 AP (Body) = 5; newWCur = 12 − 5 = 7.
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(onLogDamage).toHaveBeenCalledTimes(1);
    expect(onLogDamage).toHaveBeenCalledWith(5, 7, 'Body');
  });

  it('reports newWCur clamped to 0 when the hit drops the character below 0', () => {
    const onLogDamage = vi.fn();
    // wCur=3, net=5 → newWCur clamps to 0.
    render(<TakeDamagePanel {...makeProps({ wCur: 3, onLogDamage })} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(onLogDamage).toHaveBeenCalledWith(5, 0, 'Body');
  });

  it('passes the selected location through to onLogDamage', () => {
    const onLogDamage = vi.fn();
    render(<TakeDamagePanel {...makeProps({ wCur: 20, onLogDamage })} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Left Leg' }));
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '10' } });
    // Left Leg AP=0 → net = 10 − 4 − 0 = 6; newWCur = 20 − 6 = 14.
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(onLogDamage).toHaveBeenCalledWith(6, 14, 'Left Leg');
  });

  it('does not invoke onLogDamage when there are no net wounds', () => {
    const onLogDamage = vi.fn();
    render(<TakeDamagePanel {...makeProps({ onLogDamage })} />);
    // Damage 5 < TB+AP (7) → net 0, Apply disabled.
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '5' } });
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(onLogDamage).not.toHaveBeenCalled();
  });

  it('still applies wounds via onApplyWounds alongside onLogDamage', () => {
    const onApplyWounds = vi.fn();
    const onLogDamage = vi.fn();
    render(<TakeDamagePanel {...makeProps({ onApplyWounds, onLogDamage })} />);
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '12' } });
    fireEvent.click(screen.getByLabelText('Apply wounds'));
    expect(onApplyWounds).toHaveBeenCalledWith(5);
    expect(onLogDamage).toHaveBeenCalledWith(5, 7, 'Body');
  });
});
