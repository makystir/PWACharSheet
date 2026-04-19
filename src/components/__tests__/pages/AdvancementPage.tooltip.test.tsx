import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancementPage } from '../../pages/AdvancementPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Build a test character with the Soldier career (level 1 = Recruit).
 * Career talents: Diceman, Marksman, Strong Back, Warrior Born
 * Career skills include: Athletics (Ag), Dodge (Ag), Cool (WP), Climb (S), etc.
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
  return render(
    <AdvancementPage
      character={char}
      update={vi.fn()}
      updateCharacter={vi.fn()}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={10}
      coinWeight={0}
    />,
  );
}

describe('AdvancementPage tooltip behavior', () => {
  // --- Talent tooltips ---

  it('clicking a talent name opens a tooltip with correct content (Req 1.1)', () => {
    renderAdvancementPage();
    // "Marksman" is a career talent for Soldier level 1, exists in TALENT_DB
    const btn = screen.getByRole('button', { name: 'Marksman' });
    fireEvent.click(btn);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Marksman');
    expect(tooltip).toHaveTextContent('+5 permanent BS (not an Advance)');
    expect(tooltip).toHaveTextContent('Max');
    expect(tooltip).toHaveTextContent('1');
  });

  it('clicking the same talent name again closes the tooltip (toggle) (Req 1.4)', () => {
    renderAdvancementPage();
    const btn = screen.getByRole('button', { name: 'Marksman' });

    fireEvent.click(btn);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.click(btn);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('clicking a different talent switches the tooltip (Req 1.4)', () => {
    renderAdvancementPage();
    fireEvent.click(screen.getByRole('button', { name: 'Marksman' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Marksman');

    fireEvent.click(screen.getByRole('button', { name: 'Warrior Born' }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Warrior Born');
    expect(tooltip).toHaveTextContent('+5 permanent WS (not an Advance)');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });

  // --- Skill tooltips ---

  it('clicking a skill name opens a tooltip with correct content (Req 2.1)', () => {
    renderAdvancementPage();
    // "Athletics" is a basic skill with a known description
    const btn = screen.getByRole('button', { name: 'Athletics' });
    fireEvent.click(btn);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Athletics');
    expect(tooltip).toHaveTextContent('Description');
    expect(tooltip).toHaveTextContent('Linked Characteristic');
    expect(tooltip).toHaveTextContent('Ag');
  });

  // --- Cross-type replacement (Req 3.2, 3.3) ---

  it('clicking a skill while a talent tooltip is open replaces it (Req 3.2)', () => {
    renderAdvancementPage();
    // Open talent tooltip
    fireEvent.click(screen.getByRole('button', { name: 'Marksman' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Marksman');

    // Click a skill — should replace the talent tooltip
    fireEvent.click(screen.getByRole('button', { name: 'Athletics' }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Athletics');
    expect(tooltip).not.toHaveTextContent('Marksman');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });

  it('clicking a talent while a skill tooltip is open replaces it (Req 3.3)', () => {
    renderAdvancementPage();
    // Open skill tooltip
    fireEvent.click(screen.getByRole('button', { name: 'Athletics' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Athletics');

    // Click a talent — should replace the skill tooltip
    fireEvent.click(screen.getByRole('button', { name: 'Warrior Born' }));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Warrior Born');
    expect(tooltip).not.toHaveTextContent('Athletics');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });

  // --- Escape dismiss (Req 1.2, 2.2) ---

  it('pressing Escape closes a talent tooltip (Req 1.2)', () => {
    renderAdvancementPage();
    fireEvent.click(screen.getByRole('button', { name: 'Marksman' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('pressing Escape closes a skill tooltip (Req 2.2)', () => {
    renderAdvancementPage();
    fireEvent.click(screen.getByRole('button', { name: 'Athletics' }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  // --- aria-describedby (Req 1.5, 2.5) ---

  it('aria-describedby is set on the active talent trigger and absent on others (Req 1.5)', () => {
    renderAdvancementPage();
    const marksmanBtn = screen.getByRole('button', { name: 'Marksman' });
    const warriorBornBtn = screen.getByRole('button', { name: 'Warrior Born' });

    // Before click — no aria-describedby
    expect(marksmanBtn).not.toHaveAttribute('aria-describedby');
    expect(warriorBornBtn).not.toHaveAttribute('aria-describedby');

    // Click Marksman
    fireEvent.click(marksmanBtn);
    expect(marksmanBtn).toHaveAttribute('aria-describedby', 'tooltip-talent-Marksman');
    expect(warriorBornBtn).not.toHaveAttribute('aria-describedby');
  });

  it('aria-describedby is set on the active skill trigger and absent on others (Req 2.5)', () => {
    renderAdvancementPage();
    const athleticsBtn = screen.getByRole('button', { name: 'Athletics' });
    const dodgeBtn = screen.getByRole('button', { name: 'Dodge' });

    // Before click — no aria-describedby
    expect(athleticsBtn).not.toHaveAttribute('aria-describedby');
    expect(dodgeBtn).not.toHaveAttribute('aria-describedby');

    // Click Athletics
    fireEvent.click(athleticsBtn);
    expect(athleticsBtn).toHaveAttribute('aria-describedby', 'tooltip-skill-Athletics');
    expect(dodgeBtn).not.toHaveAttribute('aria-describedby');
  });
});
