import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatDashboard } from '../CombatDashboard';
import type { CombatDashboardProps } from '../CombatDashboard';
import type { Character, CharacteristicKey, CharacteristicValue, CombatState, Condition, PsychologyTrait } from '../../../types/character';
import { BLANK_CHARACTER } from '../../../types/character';

/**
 * CombatDashboard reminder wiring + one-tap roll tests (reminders-design §7).
 * Verifies the dashboard surfaces reminders in combat, routes a reminder roll
 * through the existing RollDialog, forwards the result to onRoll, and NEVER
 * mutates condition/wound/advantage state (passivity invariant). Also verifies
 * the Psychology Tracker gate and the undefined-character guard.
 */

const combatState: CombatState = {
  inCombat: true,
  initiative: 5,
  currentRound: 3,
  engaged: false,
  surprised: false,
};

function makeChar(overrides: Partial<Character> = {}): Character {
  const chars: Record<CharacteristicKey, CharacteristicValue> = {
    WS: { i: 35, a: 0, b: 0 },
    BS: { i: 30, a: 0, b: 0 },
    S: { i: 30, a: 0, b: 0 },
    T: { i: 40, a: 0, b: 0 },
    I: { i: 35, a: 0, b: 0 },
    Ag: { i: 30, a: 0, b: 0 },
    Dex: { i: 25, a: 0, b: 0 },
    Int: { i: 30, a: 0, b: 0 },
    WP: { i: 45, a: 0, b: 0 },
    Fel: { i: 25, a: 0, b: 0 },
  };
  return {
    ...BLANK_CHARACTER,
    chars,
    bSkills: [
      { n: 'Endurance', c: 'T', a: 5 },
      { n: 'Cool', c: 'WP', a: 10 },
    ],
    aSkills: [],
    ...overrides,
  };
}

function getProps(overrides: Partial<CombatDashboardProps> = {}): CombatDashboardProps {
  return {
    wCur: 10,
    totalWounds: 14,
    advantage: 2,
    combatState,
    conditions: [{ name: 'Stunned', level: 1 }] as Condition[],
    fortune: 2,
    fate: 3,
    resolve: 1,
    resilience: 2,
    inCombat: true,
    character: makeChar(),
    updateCharacter: vi.fn(),
    onUpdateWounds: vi.fn(),
    onUpdateAdvantage: vi.fn(),
    onUpdateRound: vi.fn(),
    onToggleEngaged: vi.fn(),
    onRemoveCondition: vi.fn(),
    onSpendFortune: vi.fn(),
    onSpendResolve: vi.fn(),
    onOpenConditionPicker: vi.fn(),
    onRoll: vi.fn(),
    ...overrides,
  };
}

describe('CombatDashboard reminders wiring', () => {
  it('shows the Stunned reminder in combat', () => {
    render(<CombatDashboard {...getProps()} />);
    expect(screen.getByTestId('combat-reminders')).toBeInTheDocument();
    expect(screen.getByTestId('reminder-condition:Stunned')).toBeInTheDocument();
  });

  it('opens RollDialog seeded with the Endurance test at Challenging difficulty, forwards result to onRoll, mutates nothing', () => {
    const onRoll = vi.fn();
    const updateCharacter = vi.fn();
    const onRemoveCondition = vi.fn();
    const onUpdateWounds = vi.fn();
    const onUpdateAdvantage = vi.fn();
    render(
      <CombatDashboard
        {...getProps({ onRoll, updateCharacter, onRemoveCondition, onUpdateWounds, onUpdateAdvantage })}
      />,
    );

    fireEvent.click(screen.getByLabelText('Roll Endurance (remove Stunned)'));

    // RollDialog opens with the reminder's rollName and Challenging seeded.
    const dialog = screen.getByRole('dialog', { name: 'Roll Dialog' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Endurance (remove Stunned)')).toBeInTheDocument();
    expect((screen.getByLabelText('Difficulty') as HTMLSelectElement).value).toBe('Challenging');
    // Base target = Endurance: T(40) + advances(5) = 45.
    expect(screen.getAllByText('45').length).toBeGreaterThanOrEqual(2);

    // Resolve the roll (the dialog's Roll button's accessible name is exactly
    // "Roll"; the reminder button is "Roll Endurance (remove Stunned)").
    fireEvent.click(screen.getByRole('button', { name: 'Roll' }));
    expect(onRoll).toHaveBeenCalledTimes(1);

    // Passivity invariant: no condition/wound/advantage mutation from the roll path.
    expect(updateCharacter).not.toHaveBeenCalled();
    expect(onRemoveCondition).not.toHaveBeenCalled();
    expect(onUpdateWounds).not.toHaveBeenCalled();
    expect(onUpdateAdvantage).not.toHaveBeenCalled();
  });

  it('shows no psychology reminders when the Psychology Tracker house rule is off', () => {
    const traits: PsychologyTrait[] = [{ id: 'f', type: 'Fear', target: '', rating: 2 }];
    const character = makeChar({
      psychologyTraits: traits,
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: false },
    });
    render(<CombatDashboard {...getProps({ character, conditions: [] })} />);
    expect(screen.queryByText(/Fear \(Rating 2\)/)).not.toBeInTheDocument();
  });

  it('shows psychology reminders when the Psychology Tracker house rule is on', () => {
    const traits: PsychologyTrait[] = [{ id: 'f', type: 'Fear', target: '', rating: 2 }];
    const character = makeChar({
      psychologyTraits: traits,
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: true },
    });
    render(<CombatDashboard {...getProps({ character, conditions: [] })} />);
    expect(screen.getByText('Fear (Rating 2)')).toBeInTheDocument();
    expect(screen.getByLabelText('Roll Cool (overcome Fear)')).toBeInTheDocument();
  });

  it('resolves the Frenzy reminder roll against the bare Willpower total (no Cool advances) — Core p.190', () => {
    const traits: PsychologyTrait[] = [{ id: 'z', type: 'Frenzy', target: '' }];
    // Sheet has Cool advances of 10 (see makeChar). A bare WP(45) Test must seed
    // 45 — NOT 55 (WP + Cool advances), which the pre-fix skill def produced.
    const character = makeChar({
      psychologyTraits: traits,
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: true },
    });
    render(<CombatDashboard {...getProps({ character, conditions: [] })} />);

    fireEvent.click(screen.getByLabelText('Roll Willpower (resist Frenzy)'));

    const dialog = screen.getByRole('dialog', { name: 'Roll Dialog' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Willpower (resist Frenzy)')).toBeInTheDocument();
    // Base target = bare WP total 45 (not 55); seeded difficulty Challenging keeps it 45.
    expect(screen.getAllByText('45').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('55')).not.toBeInTheDocument();
  });

  it('with character undefined renders condition reminders with NO Roll button and no psychology, and never opens RollDialog', () => {
    render(
      <CombatDashboard
        {...getProps({ character: undefined, updateCharacter: undefined, conditions: [{ name: 'Stunned', level: 1 }] })}
      />,
    );
    // Condition reminder row renders...
    expect(screen.getByTestId('reminder-condition:Stunned')).toBeInTheDocument();
    // ...but with no Roll button (test stripped without a sheet).
    expect(screen.queryByLabelText('Roll Endurance (remove Stunned)')).not.toBeInTheDocument();
    // The info button exists; invoking it never opens a RollDialog.
    expect(screen.queryByRole('dialog', { name: 'Roll Dialog' })).not.toBeInTheDocument();
  });
});
