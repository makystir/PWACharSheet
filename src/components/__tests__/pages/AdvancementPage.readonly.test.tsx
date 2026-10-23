import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancementPage } from '../../pages/AdvancementPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints, CharacteristicKey, CharacteristicValue } from '../../../types/character';

// Suppress HelpPopover auto-open (career-advancement is reused by the planner too).
beforeEach(() => {
  localStorage.setItem('wfrp-hint-dismissed-career-advancement', '3');
  localStorage.setItem('wfrp-hint-dismissed-xp-cost-table', '3');
});
afterEach(() => {
  localStorage.clear();
});

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  const chars = Object.fromEntries(
    ALL_CHAR_KEYS.map(key => [key, { i: 30, a: 0, b: 0 }]),
  ) as Record<CharacteristicKey, CharacteristicValue>;
  return structuredClone({
    ...BLANK_CHARACTER,
    name: 'Test Soldier',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    status: 'Silver 1',
    chars,
    xpCur: 500,
    xpSpent: 0,
    xpTotal: 500,
    ...overrides,
  });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

describe('AdvancementPage planner — read-only guarantee (FR-6)', () => {
  it('interacting with the planner never calls update/updateCharacter and leaves the character unchanged', () => {
    const update = vi.fn();
    const updateCharacter = vi.fn();
    const char = makeTestCharacter();
    const before = structuredClone(char);

    render(
      <AdvancementPage
        character={char}
        update={update}
        updateCharacter={updateCharacter}
        totalWounds={12}
        armourPoints={defaultAP}
        maxEncumbrance={10}
        coinWeight={0}
      />,
    );

    // Open each planner requirement/grand-total tooltip.
    fireEvent.click(screen.getByRole('button', { name: /Characteristics cost to complete/i }));
    fireEvent.click(screen.getByRole('button', { name: /Skills cost to complete/i }));
    fireEvent.click(screen.getByRole('button', { name: /Talent cost to complete/i }));
    fireEvent.click(screen.getByRole('button', { name: /Grand total/i }));

    // Type into and clear the budget input, then type into it again.
    const budget = screen.getByLabelText(/XP budget to project/i);
    fireEvent.change(budget, { target: { value: '150' } });
    // The budget "spent" running total appears and can be opened.
    fireEvent.click(screen.getByRole('button', { name: /Spent \d+ XP of a \d+ budget/i }));
    fireEvent.change(budget, { target: { value: '' } });

    // No mutation calls were made during any planner interaction.
    expect(update).not.toHaveBeenCalled();
    expect(updateCharacter).not.toHaveBeenCalled();

    // The character object is unchanged (no XP/advance/log mutation).
    expect(char).toEqual(before);
  });
});
