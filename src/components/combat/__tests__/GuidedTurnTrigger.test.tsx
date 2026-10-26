import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatPage } from '../../pages/CombatPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

beforeEach(() => {
  localStorage.setItem('wfrp-hint-dismissed-advantage-tracking', '3');
  localStorage.setItem('wfrp-hint-dismissed-fortune-resolve-spending', '3');
  localStorage.setItem('wfrp-hint-dismissed-weapon-damage-formula', '3');
});

afterEach(() => localStorage.clear());

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCombatPage(overrides: Partial<Character> = {}) {
  const char = makeCharacter(overrides);
  const updateCharacter = vi.fn();
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
    />,
  );
  return { update, updateCharacter };
}

describe('GuidedTurnTrigger opt-in (AC-1, AC-2)', () => {
  it('is present when in combat and the guide is closed (off by default)', () => {
    renderCombatPage({
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
    });
    expect(screen.getByTestId('guided-turn-trigger')).toBeInTheDocument();
    // Guide itself is NOT rendered (off by default).
    expect(screen.queryByTestId('guided-turn-backdrop')).not.toBeInTheDocument();
  });

  it('is absent when not in combat (AC-2)', () => {
    renderCombatPage({
      combatState: { inCombat: false, initiative: 0, currentRound: 0, engaged: false, surprised: false },
    });
    expect(screen.queryByTestId('guided-turn-trigger')).not.toBeInTheDocument();
  });

  it('is NOT part of the role="tablist" (tab DOM unchanged, AC-3)', () => {
    renderCombatPage({
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
    });
    const tablist = screen.getByRole('tablist', { name: 'Combat mode' });
    expect(tablist.querySelectorAll('[role="tab"]')).toHaveLength(3);
    // trigger lives outside the tablist
    expect(tablist.querySelector('[data-testid="guided-turn-trigger"]')).toBeNull();
  });

  it('opening the guide hides the trigger and shows the panel', () => {
    renderCombatPage({
      combatState: { inCombat: true, initiative: 0, currentRound: 1, engaged: false, surprised: false },
    });
    fireEvent.click(screen.getByTestId('guided-turn-trigger'));
    expect(screen.getByTestId('guided-turn-backdrop')).toBeInTheDocument();
    expect(screen.queryByTestId('guided-turn-trigger')).not.toBeInTheDocument();
  });
});
