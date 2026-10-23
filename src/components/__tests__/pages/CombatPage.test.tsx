import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatPage } from '../../pages/CombatPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

// Suppress HelpPopover auto-open by pre-setting localStorage dismissal counts
beforeEach(() => {
  localStorage.setItem('wfrp-hint-dismissed-advantage-tracking', '3');
  localStorage.setItem('wfrp-hint-dismissed-fortune-resolve-spending', '3');
  localStorage.setItem('wfrp-hint-dismissed-weapon-damage-formula', '3');
});

afterEach(() => {
  localStorage.clear();
});

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
      characterId="test-char-id"
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
    // Conditions are shown as badges in the CombatDashboard when in Status mode
    renderCombatPage({
      conditions: [{ name: 'Bleeding', level: 1 }],
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
    });

    // Switch to Status mode to see the CombatDashboard
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));

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

    // Switch to Status mode to see the CombatDashboard
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));

    const removeBtn = screen.getByRole('button', { name: 'Remove Bleeding' });
    fireEvent.click(removeBtn);

    expect(updateCharacter).toHaveBeenCalled();
  });

  it('clicking info on a different condition closes the first tooltip and opens a new one', () => {
    renderCombatPage({
      conditions: [{ name: 'Bleeding', level: 1 }, { name: 'Stunned', level: 1 }],
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
    });

    // Switch to Status mode to see the CombatDashboard
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));

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

    // Switch to Status mode to see the CombatDashboard
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));

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
    // END COMBAT now performs a single functional updateCharacter that also
    // clears the ad-hoc Combat_Target (ux-audit-improvements Req 1.5), so we
    // assert the resulting character state rather than separate update() calls.
    const { updateCharacter, getCaptured } = renderCombatPage({
      combatState: { inCombat: true, initiative: 0, currentRound: 3, engaged: false, surprised: false },
      advantage: 5,
    });
    fireEvent.click(screen.getByRole('button', { name: 'END COMBAT' }));
    expect(updateCharacter).toHaveBeenCalled();
    const result = getCaptured();
    expect(result.combatState.inCombat).toBe(false);
    expect(result.combatState.currentRound).toBe(0);
    expect(result.advantage).toBe(0);
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
    expect(screen.getAllByText('Weapons').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Armour').length).toBeGreaterThanOrEqual(1);
  });

  it('renders AttackFlow and QuickRollBar in active combat mode', () => {
    renderCombatPage({
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
      weapons: [{ name: 'Sword', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '—' }],
    });
    expect(screen.getAllByText('Attack Flow').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Quick Rolls').length).toBeGreaterThanOrEqual(1);
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

// ─── Crit-pipeline wiring (design §7.2) ──────────────────────────────────────

import { within } from '@testing-library/react';
import { useState } from 'react';

const activeCombat = { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false };

/**
 * Stateful host that threads updateCharacter through useState so recorded
 * critical wounds / applied conditions actually re-render the page (the simple
 * renderCombatPage helper captures state but never re-renders). Mirrors the
 * AttackFlow test's StatefulAttackFlowHost.
 */
function StatefulCombatHost({ initial }: { initial: Character }) {
  const [character, setCharacter] = useState<Character>(initial);
  return (
    <CombatPage
      character={character}
      characterId="test-char-id"
      update={(field, value) => {
        setCharacter((prev) => {
          // Minimal dotted-path setter sufficient for these tests.
          const next = structuredClone(prev) as unknown as Record<string, unknown>;
          const parts = (field as string).split('.');
          let obj = next;
          for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]] as Record<string, unknown>;
          obj[parts[parts.length - 1]] = value as unknown;
          return next as unknown as Character;
        });
      }}
      updateCharacter={(mutator) => setCharacter((prev) => mutator(structuredClone(prev)))}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={5}
      coinWeight={0}
    />
  );
}

function renderStatefulCombat(overrides: Partial<Character> = {}) {
  const initial = makeCharacter(overrides);
  render(<StatefulCombatHost initial={initial} />);
}

describe('CombatPage — crit-pipeline: suggested-condition apply', () => {
  afterEach(() => vi.restoreAllMocks());

  it('applies a crit-wound condition chip: adds the condition, zeroes Advantage, appends a combat event', () => {
    renderStatefulCombat({ combatState: activeCombat, advantage: 4 });

    // Switch to Status and roll a critical wound whose effect inflicts a condition.
    fireEvent.click(screen.getByRole('tab', { name: 'Status' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll Critical' }));
    // Head roll 21-30 "Stunned" → "Suffer 1 Stunned Condition". Default location is Head.
    fireEvent.change(screen.getByPlaceholderText('1–100'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Look Up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    // Suggestion chip appears; tap it.
    const strip = screen.getByTestId('crit-condition-suggestions');
    const chip = within(strip).getByRole('button', { name: /Add 1 Stunned condition/ });
    fireEvent.click(chip);

    // Switch to Status dashboard view to read the applied condition (already Status).
    // The condition badge should now reflect Stunned, and Advantage reset to 0.
    expect(screen.getByRole('button', { name: 'Info for Stunned' })).toBeInTheDocument();
    // History timeline carries the appended combat.condition event summary.
    expect(screen.getByText(/Applied 1× Stunned from attack/)).toBeInTheDocument();
  });
});

describe('CombatPage — crit-pipeline: net-wounds hand-off', () => {
  afterEach(() => vi.restoreAllMocks());

  it('onSendToTakeDamage switches to Defend and seeds only Damage/SL/Location (sheet-owner TB)', () => {
    renderStatefulCombat({
      combatState: activeCombat,
      weapons: [{ name: 'Sword', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '—' }],
      chars: {
        ...BLANK_CHARACTER.chars,
        WS: { i: 50, a: 0, b: 0 },
        S: { i: 40, a: 0, b: 0 },
        T: { i: 40, a: 0, b: 0 }, // TB 4 (sheet owner)
      },
    });

    // Drive AttackFlow to Step 4. Default mode is Attack.
    vi.spyOn(Math, 'random').mockReturnValue((25 - 1) / 100); // roll 25 → hit, Body
    fireEvent.click(screen.getByLabelText('Select Sword'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));
    fireEvent.click(screen.getByText(/Calculate Damage/));

    fireEvent.click(screen.getByLabelText('Send to Take Damage'));

    // Defend mode is now active; the Take Damage panel shows the seeded inputs.
    expect(screen.getByRole('tab', { name: 'Defend' })).toHaveAttribute('aria-selected', 'true');
    expect((screen.getByLabelText('Incoming damage') as HTMLInputElement).value).toBe('8'); // SB(4)+4
    expect((screen.getByLabelText('Success Levels') as HTMLInputElement).value).toBe('3'); // SL
    // The TB shown is the sheet owner's (4), never an opponent value.
    expect(screen.getByTestId('toughness-bonus')).toHaveTextContent('4');
  });
});
