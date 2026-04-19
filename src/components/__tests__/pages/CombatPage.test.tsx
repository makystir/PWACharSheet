import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatPage } from '../../pages/CombatPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCombatPage(overrides: Partial<Character> = {}) {
  const char = makeCharacter(overrides);
  let captured = char;
  const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
    captured = mutator(structuredClone(captured));
  });
  const update = vi.fn();

  render(
    <CombatPage
      character={char}
      update={update}
      updateCharacter={updateCharacter}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={5}
      coinWeight={0}
    />
  );

  return { update, updateCharacter, getCaptured: () => captured };
}

// ─── Condition Tooltip Tests (via CombatDashboard) ──────────────────────────

describe('CombatPage condition tooltips', () => {
  it('clicking the info button on an active condition badge opens a tooltip', () => {
    // Conditions are shown as badges in the CombatDashboard when active
    renderCombatPage({
      conditions: [{ name: 'Bleeding', level: 1 }],
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
    });

    const infoBtn = screen.getByRole('button', { name: 'Info for Bleeding' });
    fireEvent.click(infoBtn);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Bleeding');
    expect(tooltip).toHaveTextContent('Description');
    expect(tooltip).toHaveTextContent('Effects');
    expect(tooltip).toHaveTextContent('Duration');
    expect(tooltip).toHaveTextContent('Removed By');
    expect(tooltip).toHaveTextContent('Lose 1 Wound per level at end of round');
    expect(tooltip).toHaveTextContent('Heal test or magical healing');
  });

  it('clicking the remove button on a condition badge calls updateCharacter', () => {
    const { updateCharacter } = renderCombatPage({
      conditions: [{ name: 'Bleeding', level: 1 }],
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
    });

    const removeBtn = screen.getByRole('button', { name: 'Remove Bleeding' });
    fireEvent.click(removeBtn);

    expect(updateCharacter).toHaveBeenCalled();
  });

  it('clicking info on a different condition closes the first tooltip and opens a new one', () => {
    renderCombatPage({
      conditions: [{ name: 'Bleeding', level: 1 }, { name: 'Stunned', level: 1 }],
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Info for Bleeding' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bleeding');

    fireEvent.click(screen.getByRole('button', { name: 'Info for Stunned' }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Stunned');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });

  it('pressing Escape dismisses the condition tooltip', () => {
    renderCombatPage({
      conditions: [{ name: 'Ablaze', level: 1 }],
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Info for Ablaze' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});

// ─── Mode Switching Tests ───────────────────────────────────────────────────

describe('CombatPage mode switching', () => {
  it('renders START COMBAT button in readiness mode', () => {
    renderCombatPage();
    expect(screen.getByRole('button', { name: 'START COMBAT' })).toBeInTheDocument();
  });

  it('START COMBAT sets inCombat to true and currentRound to 1', () => {
    const { update } = renderCombatPage();
    fireEvent.click(screen.getByRole('button', { name: 'START COMBAT' }));
    expect(update).toHaveBeenCalledWith('combatState.inCombat', true);
    expect(update).toHaveBeenCalledWith('combatState.currentRound', 1);
  });

  it('renders END COMBAT button when in combat', () => {
    renderCombatPage({
      combatState: { inCombat: true, initiative: 0, currentRound: 3, engaged: false, surprised: false },
    });
    expect(screen.getByRole('button', { name: 'END COMBAT' })).toBeInTheDocument();
  });

  it('END COMBAT resets inCombat, advantage, and currentRound', () => {
    const { update } = renderCombatPage({
      combatState: { inCombat: true, initiative: 0, currentRound: 3, engaged: false, surprised: false },
      advantage: 5,
    });
    fireEvent.click(screen.getByRole('button', { name: 'END COMBAT' }));
    expect(update).toHaveBeenCalledWith('combatState.inCombat', false);
    expect(update).toHaveBeenCalledWith('combatState.currentRound', 0);
    expect(update).toHaveBeenCalledWith('advantage', 0);
  });
});

// ─── Layout Tests ───────────────────────────────────────────────────────────

describe('CombatPage layout', () => {
  it('renders CombatDashboard in both modes', () => {
    renderCombatPage();
    expect(screen.getByTestId('combat-dashboard')).toBeInTheDocument();
  });

  it('renders WeaponCards and ArmourMap in readiness mode', () => {
    renderCombatPage();
    expect(screen.getByText('Weapons')).toBeInTheDocument();
    expect(screen.getByText('Armour')).toBeInTheDocument();
  });

  it('renders AttackFlow and QuickRollBar in active combat mode', () => {
    renderCombatPage({
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
      weapons: [{ name: 'Sword', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '—' }],
    });
    expect(screen.getByText('Attack Flow')).toBeInTheDocument();
    expect(screen.getByText('Quick Rolls')).toBeInTheDocument();
  });
});

// ─── Engineering / Explosives Combat Logic Tests (Task 10.2) ─────────────────

import { RANGED_GROUPS, findSkillForWeapon } from '../../pages/CombatPage';

describe('RANGED_GROUPS classification', () => {
  it('"Engineering" is NOT in RANGED_GROUPS (treated as melee)', () => {
    expect(RANGED_GROUPS).not.toContain('Engineering');
  });

  it('"Explosives" IS in RANGED_GROUPS (treated as ranged)', () => {
    expect(RANGED_GROUPS).toContain('Explosives');
  });
});

describe('findSkillForWeapon — Engineering group', () => {
  it('maps Engineering weapons to Melee (Engineering) when character has the skill', () => {
    const weapon = { group: 'Engineering' };
    const bSkills = [{ n: 'Melee (Basic)', c: 'WS', a: 10 }];
    const aSkills = [{ n: 'Melee (Engineering)', c: 'WS', a: 15 }];

    const result = findSkillForWeapon(weapon, bSkills, aSkills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Melee (Engineering)');
  });

  it('falls back to Melee (Basic) when character lacks Melee (Engineering)', () => {
    const weapon = { group: 'Engineering' };
    const bSkills = [{ n: 'Melee (Basic)', c: 'WS', a: 10 }];
    const aSkills: { n: string; c: string; a: number }[] = [];

    const result = findSkillForWeapon(weapon, bSkills, aSkills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Melee (Basic)');
  });
});

describe('findSkillForWeapon — Explosives group', () => {
  it('maps Explosives weapons to Ranged (Explosives)', () => {
    const weapon = { group: 'Explosives' };
    const bSkills = [{ n: 'Melee (Basic)', c: 'WS', a: 0 }];
    const aSkills = [{ n: 'Ranged (Explosives)', c: 'BS', a: 20 }];

    const result = findSkillForWeapon(weapon, bSkills, aSkills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Ranged (Explosives)');
  });
});
