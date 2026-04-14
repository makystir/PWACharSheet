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

// ─── Condition Tooltip Tests (Task 8.4) ─────────────────────────────────────

describe('CombatPage condition tooltips', () => {
  it('clicking the info icon opens a tooltip with condition details', () => {
    renderCombatPage();
    // Click the info button for "Bleeding"
    const infoBtn = screen.getByRole('button', { name: 'Info for Bleeding' });
    fireEvent.click(infoBtn);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Bleeding');
    expect(tooltip).toHaveTextContent('Description');
    expect(tooltip).toHaveTextContent('Effects');
    expect(tooltip).toHaveTextContent('Duration');
    expect(tooltip).toHaveTextContent('Removed By');
    // Verify actual content from conditions data
    expect(tooltip).toHaveTextContent('Lose 1 Wound per level at end of round');
    expect(tooltip).toHaveTextContent('Heal test or magical healing');
  });

  it('clicking the badge name still toggles the condition (does not open tooltip)', () => {
    const { updateCharacter } = renderCombatPage();
    // Click the badge name text for "Bleeding" (not the info icon)
    // The badge name is a separate button that calls applyCondition
    const bleedingBadgeBtn = screen.getByRole('button', { name: 'Bleeding' });
    fireEvent.click(bleedingBadgeBtn);

    expect(updateCharacter).toHaveBeenCalled();
    // No tooltip should appear from clicking the badge name
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('clicking info icon for a different condition closes the first tooltip and opens a new one', () => {
    renderCombatPage();
    // Open tooltip for Bleeding
    fireEvent.click(screen.getByRole('button', { name: 'Info for Bleeding' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Bleeding');

    // Open tooltip for Stunned
    fireEvent.click(screen.getByRole('button', { name: 'Info for Stunned' }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Stunned');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });

  it('pressing Escape dismisses the condition tooltip', () => {
    renderCombatPage();
    fireEvent.click(screen.getByRole('button', { name: 'Info for Ablaze' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
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
