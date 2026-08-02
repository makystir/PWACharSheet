import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCharPage(char: Character) {
  return render(
    <CharacterPage
      character={char}
      characterId="test-id"
      update={vi.fn()}
      updateCharacter={vi.fn()}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={5}
      coinWeight={0}
    />
  );
}

describe('CharCurrentTooltip integration', () => {
  // Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 4.1, 4.2

  const charWithTalent = makeCharacter({
    chars: {
      WS: { i: 30, a: 10, b: 5 },
      BS: { i: 25, a: 5, b: 0 },
      S: { i: 30, a: 0, b: 0 },
      T: { i: 30, a: 0, b: 0 },
      I: { i: 30, a: 0, b: 0 },
      Ag: { i: 30, a: 0, b: 0 },
      Dex: { i: 30, a: 0, b: 0 },
      Int: { i: 30, a: 0, b: 0 },
      WP: { i: 30, a: 0, b: 0 },
      Fel: { i: 30, a: 0, b: 0 },
    },
    talents: [{ n: 'Warrior Born', lvl: 1, desc: '+5 WS' }],
  });

  it('click Current cell opens tooltip with correct breakdown, Escape closes it', () => {
    renderCharPage(charWithTalent);

    // Find the WS current cell (displays 45 = 30 + 10 + 5)
    const cells = screen.getAllByRole('button');
    const wsCell = cells.find(el => el.textContent === '45');
    expect(wsCell).toBeDefined();

    // Click opens tooltip
    fireEvent.click(wsCell!);

    const tooltip = document.getElementById('tooltip-char-WS');
    expect(tooltip).not.toBeNull();
    expect(tooltip).toHaveAttribute('role', 'tooltip');
    expect(tooltip!.textContent).toContain('Weapon Skill');
    expect(tooltip!.textContent).toContain('30'); // Initial
    expect(tooltip!.textContent).toContain('10'); // Advances
    expect(tooltip!.textContent).toContain('45'); // Total

    // Press Escape closes tooltip
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.getElementById('tooltip-char-WS')).toBeNull();
  });

  it('characteristic with talent bonus shows talent name in tooltip', () => {
    renderCharPage(charWithTalent);

    // Click the WS cell (current = 45)
    const wsCell = screen.getAllByRole('button').find(el => el.textContent === '45');
    fireEvent.click(wsCell!);

    const tooltip = document.getElementById('tooltip-char-WS');
    expect(tooltip).not.toBeNull();
    // Talent bonus row should show "+5 (Warrior Born)"
    expect(tooltip!.textContent).toContain('Talent Bonus');
    expect(tooltip!.textContent).toContain('+5');
    expect(tooltip!.textContent).toContain('Warrior Born');
  });

  it('characteristic without talent bonus omits the Talent Bonus row', () => {
    renderCharPage(charWithTalent);

    // Click the BS cell (current = 30 = 25 + 5 + 0, no talent bonus)
    const bsCell = screen.getAllByRole('button').find(el => el.textContent === '30');
    fireEvent.click(bsCell!);

    const tooltip = document.getElementById('tooltip-char-BS');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain('Ballistic Skill');
    expect(tooltip!.textContent).toContain('25'); // Initial
    expect(tooltip!.textContent).toContain('5');  // Advances (in context)
    expect(tooltip!.textContent).not.toContain('Talent Bonus');
  });

  it('clicking a different cell switches tooltip target', () => {
    renderCharPage(charWithTalent);

    // Click WS cell first
    const wsCell = screen.getAllByRole('button').find(el => el.textContent === '45');
    fireEvent.click(wsCell!);
    expect(document.getElementById('tooltip-char-WS')).not.toBeNull();

    // Click BS cell
    const bsCell = screen.getAllByRole('button').find(el => el.textContent === '30');
    fireEvent.click(bsCell!);

    // WS tooltip gone, BS tooltip present
    expect(document.getElementById('tooltip-char-WS')).toBeNull();
    expect(document.getElementById('tooltip-char-BS')).not.toBeNull();
  });

  it('tap on touch device opens tooltip, tap outside closes it', () => {
    renderCharPage(charWithTalent);

    // Click serves as tap on touch devices
    const wsCell = screen.getAllByRole('button').find(el => el.textContent === '45');
    fireEvent.click(wsCell!);

    expect(document.getElementById('tooltip-char-WS')).not.toBeNull();

    // Tap outside (mousedown on document.body) closes tooltip
    fireEvent.mouseDown(document.body);
    expect(document.getElementById('tooltip-char-WS')).toBeNull();
  });
});
