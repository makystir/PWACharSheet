import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancementPage } from '../../pages/AdvancementPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Build a test character with the Soldier career (level 1 = Recruit).
 * Recruit career skills: Athletics, Climb, Cool, Dodge, Endurance,
 *   Language (Battle), Melee (Basic), Play (Drum or Fife)
 */
function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({
    ...BLANK_CHARACTER,
    name: 'Test Soldier',
    species: 'Human',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    status: 'Silver 1',
    xpCur: 500,
    xpTotal: 500,
    chars: {
      ...BLANK_CHARACTER.chars,
      WS: { i: 35, a: 0, b: 0 },
      BS: { i: 30, a: 0, b: 0 },
      S: { i: 30, a: 0, b: 0 },
      T: { i: 30, a: 0, b: 0 },
      I: { i: 30, a: 0, b: 0 },
      Ag: { i: 30, a: 0, b: 0 },
      Dex: { i: 25, a: 0, b: 0 },
      Int: { i: 25, a: 0, b: 0 },
      WP: { i: 30, a: 0, b: 0 },
      Fel: { i: 25, a: 0, b: 0 },
    },
    ...overrides,
  });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderAdvancementPage(overrides: Partial<Character> = {}) {
  const char = makeTestCharacter(overrides);
  const updateCharacter = vi.fn((mutator: (c: Character) => Character) => mutator(char));
  return {
    char,
    updateCharacter,
    ...render(
      <AdvancementPage
        character={char}
        update={vi.fn()}
        updateCharacter={updateCharacter}
        totalWounds={12}
        armourPoints={defaultAP}
        maxEncumbrance={10}
        coinWeight={0}
      />,
    ),
  };
}

describe('AdvancementPage sorting behavior', () => {
  it('career skill rows appear before non-career skill rows in the rendered table (Req 1.1)', () => {
    renderAdvancementPage();

    // Get all table rows across the page
    const allRows = screen.getAllByRole('row');

    // Find the indices of the "Career Skills" and "Other Skills" header rows
    const careerHeaderIdx = allRows.findIndex(row => row.textContent?.includes('Career Skills'));
    const otherHeaderIdx = allRows.findIndex(row => row.textContent?.includes('Other Skills'));

    // Career Skills header should come before Other Skills header
    expect(careerHeaderIdx).toBeGreaterThan(-1);
    expect(otherHeaderIdx).toBeGreaterThan(-1);
    expect(careerHeaderIdx).toBeLessThan(otherHeaderIdx);

    // Verify a known career skill (Athletics) appears between the two headers
    // and a known non-career skill (Art) appears after the Other Skills header
    const athleticsRow = allRows.find(row => {
      const buttons = within(row).queryAllByRole('button', { name: 'Athletics' });
      return buttons.length > 0;
    });
    const artRow = allRows.find(row => {
      const buttons = within(row).queryAllByRole('button', { name: 'Art' });
      return buttons.length > 0;
    });

    expect(athleticsRow).toBeDefined();
    expect(artRow).toBeDefined();

    const athleticsIdx = allRows.indexOf(athleticsRow!);
    const artIdx = allRows.indexOf(artRow!);

    // Athletics (career) should be between career header and other header
    expect(athleticsIdx).toBeGreaterThan(careerHeaderIdx);
    expect(athleticsIdx).toBeLessThan(otherHeaderIdx);

    // Art (non-career) should be after other header
    expect(artIdx).toBeGreaterThan(otherHeaderIdx);
  });

  it('"Career Skills" and "Other Skills" group header rows are rendered (Req 2.1, 2.2)', () => {
    renderAdvancementPage();

    // Soldier Recruit has 6 career basic skills from bSkills:
    // Athletics, Climb, Cool, Dodge, Endurance, Melee (Basic)
    // (Language (Battle) and Play (Drum or Fife) are advanced skills not in bSkills)
    expect(screen.getByText(/^Career Skills \(6\)$/)).toBeInTheDocument();

    // The remaining 20 basic skills are non-career
    expect(screen.getByText(/^Other Skills \(20\)$/)).toBeInTheDocument();
  });

  it('group header is omitted when its group has zero skills (Req 2.5, 2.6)', () => {
    // Render without a career selected — all skills become non-career
    renderAdvancementPage({ career: '', careerLevel: '', class: '' });

    // No "Career Skills" header should be rendered
    expect(screen.queryByText(/^Career Skills/)).not.toBeInTheDocument();

    // "Other Skills" header should still be present with all 26 basic skills
    expect(screen.getByText(/^Other Skills \(26\)$/)).toBeInTheDocument();
  });

  it('clicking +1 on a sorted career skill deducts the correct XP and advances the right skill (Req 4.1)', () => {
    const { updateCharacter } = renderAdvancementPage();

    // Find the Athletics row (a career skill for Soldier Recruit)
    // Athletics is a basic skill at index 1 in BLANK_CHARACTER.bSkills
    const athleticsButton = screen.getByRole('button', { name: 'Athletics' });
    const athleticsRow = athleticsButton.closest('tr')!;

    // Click the +1 button in the Athletics row
    const plusOneBtn = within(athleticsRow).getByRole('button', { name: '+1' });
    fireEvent.click(plusOneBtn);

    // updateCharacter should have been called
    expect(updateCharacter).toHaveBeenCalled();

    // Get the mutator function and verify it produces the correct result
    const mutator = updateCharacter.mock.calls[0][0];
    const baseChar = makeTestCharacter();
    const result = mutator(baseChar);

    // Athletics is at index 1 in bSkills, should have 1 advance now
    expect(result.bSkills[1].n).toBe('Athletics');
    expect(result.bSkills[1].a).toBe(1);

    // Cost for in-career skill at 0 advances = 10 XP
    expect(result.xpCur).toBe(500 - 10);
    expect(result.xpSpent).toBe(10);
  });

  it('advanced skills in the sorted table display the * marker (Req 5.2)', () => {
    // Add an advanced skill that is a career skill (Language (Battle))
    renderAdvancementPage({
      aSkills: [
        { n: 'Language (Battle)', c: 'Int', a: 0 },
        { n: 'Lore (History)', c: 'Int', a: 0 },
      ],
    });

    // Find the Language (Battle) skill button
    const langButton = screen.getByRole('button', { name: 'Language (Battle)' });
    const langRow = langButton.closest('tr')!;

    // The row should contain the * marker for advanced skills
    expect(langRow.textContent).toContain('*');

    // Also check Lore (History) — a non-career advanced skill
    const loreButton = screen.getByRole('button', { name: 'Lore (History)' });
    const loreRow = loreButton.closest('tr')!;
    expect(loreRow.textContent).toContain('*');

    // Basic skills should NOT have the * marker
    const athleticsButton = screen.getByRole('button', { name: 'Athletics' });
    const athleticsRow = athleticsButton.closest('tr')!;
    // Get the first cell (skill name cell) and check it doesn't contain *
    const athleticsCells = within(athleticsRow).getAllByRole('cell');
    expect(athleticsCells[0].textContent).not.toContain('*');
  });
});
