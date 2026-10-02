import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Grouped career skills on the character sheet.
 *
 * - A filled-in grouped skill ("Channelling (Aqshy)" for the career's
 *   "Channelling (Any Colour)") keeps its career-skill highlight.
 * - A placeholder row ("Channelling (Any Colour)") has a Choose button that
 *   opens a picker of suggested specialisations plus a custom entry, and
 *   renames the row in canonical "Group (Specialisation)" form.
 */

// ─── Test Helpers ────────────────────────────────────────────────────────────

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

/** High Elf Mage, level 1 ("Novitiate"): lists "Channelling (Any Colour)" and "Language (Magick)". */
function renderMage(overrides: Partial<Character> = {}) {
  const updateCharacter = vi.fn();
  const char = structuredClone({
    ...BLANK_CHARACTER,
    class: 'Academics',
    career: 'Mage',
    careerLevel: 'Novitiate',
    ...overrides,
  });

  render(
    <CharacterPage
      character={char}
      characterId="test-specialisation"
      update={vi.fn()}
      updateCharacter={updateCharacter}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={30}
      coinWeight={0}
      rollHistory={[]}
      addRoll={vi.fn()}
      clearHistory={vi.fn()}
      subTab="abilities"
      onSubTabChange={vi.fn()}
    />
  );

  /** Apply the most recent updateCharacter mutator to the rendered character. */
  const lastUpdate = (): Character => {
    const calls = updateCharacter.mock.calls;
    return calls[calls.length - 1][0](char);
  };
  return { updateCharacter, lastUpdate };
}

function rowOf(skillName: string): HTMLElement {
  const row = screen.getByText(skillName).closest('[class*="skillGridRow"]');
  expect(row).not.toBeNull();
  return row as HTMLElement;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CharacterPage grouped career skills', () => {
  it('keeps the career highlight on a filled-in grouped skill', () => {
    renderMage({
      aSkills: [
        { n: 'Channelling (Aqshy)', c: 'WP', a: 5 },
        { n: 'Language (Bretonnian)', c: 'Int', a: 0 },
      ],
    });
    expect(rowOf('Channelling (Aqshy)').className).toContain('skillGridRowCareer');
    // Novitiate lists Language (Magick) only, so another language is not in-career.
    expect(rowOf('Language (Bretonnian)').className).not.toContain('skillGridRowCareer');
  });

  it('shows a Choose button only on placeholder rows', () => {
    renderMage({
      aSkills: [
        { n: 'Channelling (Any Colour)', c: 'WP', a: 5 },
        { n: 'Language (Magick)', c: 'Int', a: 0 },
      ],
    });
    expect(screen.getByRole('button', { name: 'Choose specialisation for Channelling (Any Colour)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose specialisation for Language (Magick)' })).toBeNull();
  });

  it('renames the placeholder to the chosen suggestion', () => {
    const { lastUpdate } = renderMage({ aSkills: [{ n: 'Channelling (Any Colour)', c: 'WP', a: 5 }] });
    fireEvent.click(screen.getByRole('button', { name: 'Choose specialisation for Channelling (Any Colour)' }));

    const picker = screen.getByRole('dialog', { name: 'Channelling: choose specialisation' });
    expect(within(picker).getByRole('button', { name: 'No specialisation' })).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole('button', { name: 'Qhaysh' }));

    const updated = lastUpdate();
    expect(updated.aSkills[0]).toEqual({ n: 'Channelling (Qhaysh)', c: 'WP', a: 5 });
    expect(screen.queryByRole('dialog', { name: 'Channelling: choose specialisation' })).toBeNull();
  });

  it('accepts a homebrew specialisation typed into the picker', () => {
    const { lastUpdate } = renderMage({ aSkills: [{ n: 'Channelling (Any Colour)', c: 'WP', a: 5 }] });
    fireEvent.click(screen.getByRole('button', { name: 'Choose specialisation for Channelling (Any Colour)' }));

    const picker = screen.getByRole('dialog', { name: 'Channelling: choose specialisation' });
    fireEvent.change(within(picker).getByPlaceholderText('Search...'), { target: { value: 'Homebrew Wind' } });
    fireEvent.click(within(picker).getByRole('button', { name: 'Use “Homebrew Wind”' }));

    expect(lastUpdate().aSkills[0].n).toBe('Channelling (Homebrew Wind)');
  });

  it('disables suggestions already on the sheet', () => {
    renderMage({
      aSkills: [
        { n: 'Channelling (Any Colour)', c: 'WP', a: 5 },
        { n: 'Channelling (Aqshy)', c: 'WP', a: 0 },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Choose specialisation for Channelling (Any Colour)' }));

    const picker = screen.getByRole('dialog', { name: 'Channelling: choose specialisation' });
    expect(within(picker).queryByRole('button', { name: 'Aqshy' })).toBeNull();
    expect(within(picker).getByText('Aqshy')).toHaveAttribute('aria-disabled', 'true');
    expect(within(picker).getByRole('button', { name: 'Azyr' })).toBeInTheDocument();
  });

  it('specialises a placeholder talent the same way', () => {
    const { lastUpdate } = renderMage({ talents: [{ n: 'Etiquette (Any)', lvl: 1, desc: '' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Choose specialisation for Etiquette (Any)' }));

    const picker = screen.getByRole('dialog', { name: 'Etiquette: choose specialisation' });
    fireEvent.click(within(picker).getByRole('button', { name: 'Nobles' }));

    expect(lastUpdate().talents[0]).toEqual({ n: 'Etiquette (Nobles)', lvl: 1, desc: '' });
  });
});
