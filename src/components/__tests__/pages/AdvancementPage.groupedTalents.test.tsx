import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancementPage } from '../../pages/AdvancementPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Grouped career talents on the Advancement page.
 *
 * Wizard level 2 ("Wizard") lists "Arcane Magic (Any Arcane Lore)". Buying it
 * asks for the lore first; an owned lore stays in-career, keeps its own card
 * with "+1 Level", and satisfies the level's talent requirement.
 */

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderWizard(overrides: Partial<Character> = {}) {
  let currentChar: Character = structuredClone({
    ...BLANK_CHARACTER,
    class: 'Academics',
    career: 'Wizard',
    careerLevel: 'Wizard',
    xpCur: 1000,
    xpTotal: 1000,
    ...overrides,
  });
  const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
    currentChar = mutator(currentChar);
  });

  render(
    <AdvancementPage
      character={currentChar}
      update={vi.fn()}
      updateCharacter={updateCharacter}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={10}
      coinWeight={0}
    />,
  );

  return { latest: () => currentChar };
}

/** The talent card whose name button reads `name`. */
function talentCard(name: string): HTMLElement {
  const card = screen.getAllByRole('button', { name }).map(b => b.parentElement!).find(el => el.className.includes('talentCard'));
  expect(card).toBeDefined();
  return card!;
}

describe('AdvancementPage grouped career talents', () => {
  it('asks for the lore before buying a grouped talent, then buys it in-career', () => {
    const { latest } = renderWizard();
    const card = talentCard('Arcane Magic (Any Arcane Lore)');
    fireEvent.click(within(card).getByRole('button', { name: 'Choose & Acquire (100 XP)' }));

    const picker = screen.getByRole('dialog', { name: 'Arcane Magic: choose specialisation' });
    fireEvent.click(within(picker).getByRole('button', { name: 'Shadows' }));

    const char = latest();
    expect(char.talents).toEqual([expect.objectContaining({ n: 'Arcane Magic (Shadows)', lvl: 1 })]);
    // Description borrowed from the talent list's "Arcane Magic (Lore)" row.
    expect(char.talents[0].desc).not.toBe('');
    expect(char.xpCur).toBe(900);
    expect(char.advancementLog.at(-1)).toMatchObject({ type: 'talent', name: 'Arcane Magic (Shadows)', xpCost: 100, inCareer: true });
  });

  it('buys a homebrew lore typed into the picker', () => {
    const { latest } = renderWizard();
    fireEvent.click(within(talentCard('Arcane Magic (Any Arcane Lore)')).getByRole('button', { name: 'Choose & Acquire (100 XP)' }));

    const picker = screen.getByRole('dialog', { name: 'Arcane Magic: choose specialisation' });
    fireEvent.change(within(picker).getByPlaceholderText('Search...'), { target: { value: 'Homebrew Lore' } });
    fireEvent.click(within(picker).getByRole('button', { name: 'Use “Homebrew Lore”' }));

    expect(latest().talents.map(t => t.n)).toEqual(['Arcane Magic (Homebrew Lore)']);
  });

  it('keeps an owned lore in-career with its own +1 Level card', () => {
    renderWizard({ talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }] });

    const card = talentCard('Arcane Magic (Fire)');
    expect(card.className).toContain('talentCardInCareer');
    expect(within(card).getByRole('button', { name: '+1 Level (200 XP)' })).toBeInTheDocument();
    expect(screen.queryByText('Out-of-Career Talents (owned)')).toBeNull();
  });

  it('counts the owned lore towards the level talent requirement', () => {
    renderWizard({ talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }] });
    expect(screen.getByText(/Talent: Arcane Magic \(Any Arcane Lore\)/)).toBeInTheDocument();
  });
});
