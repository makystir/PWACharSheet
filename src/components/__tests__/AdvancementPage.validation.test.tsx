import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancementPage } from '../pages/AdvancementPage';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, ArmourPoints } from '../../types/character';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

/**
 * Build a Soldier character at a given career level.
 *
 * Soldier career scheme:
 *   Level 1 (Recruit):  chars WS, T, WP
 *   Level 2 (Soldier):  chars WS, BS, T, WP
 *   Level 3 (Sergeant): chars WS, BS, T, I, WP
 *   Level 4 (Officer):  chars WS, BS, T, I, WP, Fel
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
    xpCur: 1000,
    xpTotal: 1000,
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

function renderAdvancementPage(overrides: Partial<Character> = {}) {
  let currentChar = makeTestCharacter(overrides);
  const updateSpy = vi.fn();
  const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
    currentChar = mutator(currentChar);
  });

  const result = render(
    <AdvancementPage
      character={currentChar}
      update={updateSpy}
      updateCharacter={updateCharacter}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={10}
      coinWeight={0}
    />,
  );

  function rerenderWithLatest() {
    result.rerender(
      <AdvancementPage
        character={currentChar}
        update={updateSpy}
        updateCharacter={updateCharacter}
        totalWounds={12}
        armourPoints={defaultAP}
        maxEncumbrance={10}
        coinWeight={0}
      />,
    );
  }

  return { updateCharacter, updateSpy, rerenderWithLatest, getCurrentChar: () => currentChar };
}

/* ------------------------------------------------------------------ */
/*  Premature-spend warning tests                                     */
/* ------------------------------------------------------------------ */

describe('AdvancementPage premature-spend warnings', () => {
  beforeEach(() => {
    cleanup();
  });

  // **Validates: Requirements 1.1, 1.2, 7.1, 7.2**
  it('out-of-career characteristic with future in-career level renders "In-career at CL{N}" label', () => {
    // At level 1 (Recruit), BS is out-of-career but appears at level 2 (Soldier).
    // Multiple warnings will appear (for chars, skills, talents, future talents),
    // so we use getAllByText and verify at least one exists.
    renderAdvancementPage({ careerLevel: 'Recruit' });

    const warnings = screen.getAllByText(/In-career at CL2/);
    expect(warnings.length).toBeGreaterThan(0);

    // Specifically verify the BS characteristic card has the warning.
    // The BS char name is rendered with title="Ballistic Skill".
    const bsLabel = screen.getByTitle('Ballistic Skill');
    // Walk up to the characteristic card container (the card div wrapping header + stats + buttons)
    const bsCard = bsLabel.closest('div')!.parentElement!;
    expect(bsCard).toHaveTextContent(/In-career at CL2/);
  });

  // **Validates: Requirements 1.5**
  it('out-of-career characteristic with no future level does not render warning', () => {
    // At level 1 (Recruit), Ag is out-of-career and never appears in any Soldier level.
    // Use getByTitle to target the characteristic card specifically.
    renderAdvancementPage({ careerLevel: 'Recruit' });

    const agLabel = screen.getByTitle('Agility');
    const agCard = agLabel.closest('div')!.parentElement!;
    expect(agCard).not.toHaveTextContent(/In-career at CL/);
  });

  // **Validates: Requirements 1.3, 2.3, 3.3**
  it('level 4 character sees no premature warnings', () => {
    // At level 4 (Officer), there are no future levels, so no warnings at all.
    renderAdvancementPage({ careerLevel: 'Officer' });

    expect(screen.queryByText(/In-career at CL/)).not.toBeInTheDocument();
  });

  // **Validates: Requirements 2.1, 2.2**
  it('out-of-career skill with future in-career level renders warning label', () => {
    // At level 1 (Recruit), "Consume Alcohol" is out-of-career but appears at level 2.
    renderAdvancementPage({ careerLevel: 'Recruit' });

    // Find the Consume Alcohol row in the skills table
    const consumeAlcoholBtn = screen.getByText('Consume Alcohol');
    const row = consumeAlcoholBtn.closest('tr')!;
    expect(row).toHaveTextContent(/In-career at CL2/);
  });

  // **Validates: Requirements 3.1, 3.2**
  it('out-of-career talent with future in-career level renders warning label', () => {
    // At level 1 (Recruit), "Drilled" is not in-career but appears at level 2.
    // Give the character the "Drilled" talent so it shows in the out-of-career owned section.
    renderAdvancementPage({
      careerLevel: 'Recruit',
      talents: [{ n: 'Drilled', lvl: 1, desc: 'Test talent' }],
    });

    // The "Drilled" talent card should show "In-career at CL2" in its meta area
    const drilledBtn = screen.getByText('Drilled');
    const talentCard = drilledBtn.closest('div')!;
    expect(talentCard).toHaveTextContent(/In-career at CL2/);
  });

  // **Validates: Requirements 1.4, 2.4, 3.4**
  it('warning labels do not block advancement buttons — characteristic buttons remain clickable', () => {
    // At level 1 (Recruit), BS is out-of-career with a warning, but the +1 button should still work.
    const { updateCharacter } = renderAdvancementPage({
      careerLevel: 'Recruit',
      xpCur: 1000,
    });

    // Find the BS characteristic card via its title attribute
    const bsLabel = screen.getByTitle('Ballistic Skill');
    const bsCard = bsLabel.closest('div')!.parentElement!;

    // Verify the warning is present
    expect(bsCard).toHaveTextContent(/In-career at CL2/);

    // Find the +1 advance button within the BS card.
    // The button text is "+1 (50 XP)" for out-of-career at 0 advances.
    const buttons = bsCard.querySelectorAll('button');
    const advanceBtn = Array.from(buttons).find(b => b.textContent?.startsWith('+1'));
    expect(advanceBtn).toBeTruthy();
    expect(advanceBtn).not.toBeDisabled();
    fireEvent.click(advanceBtn!);

    // The updateCharacter should have been called — the button was not blocked
    expect(updateCharacter).toHaveBeenCalled();
  });

  // **Validates: Requirements 2.4**
  it('warning labels do not block skill advancement buttons', () => {
    // At level 1 (Recruit), "Consume Alcohol" is out-of-career with a warning.
    const { updateCharacter } = renderAdvancementPage({
      careerLevel: 'Recruit',
      xpCur: 1000,
    });

    // Find the Consume Alcohol row in the skills table
    const consumeAlcoholBtn = screen.getByText('Consume Alcohol');
    const row = consumeAlcoholBtn.closest('tr')!;

    // Verify warning is present
    expect(row).toHaveTextContent(/In-career at CL2/);

    // Find the +1 button in that row
    const advanceButtons = row.querySelectorAll('button');
    const plusOneBtn = Array.from(advanceButtons).find(b => b.textContent === '+1');
    expect(plusOneBtn).toBeTruthy();
    expect(plusOneBtn).not.toBeDisabled();
    fireEvent.click(plusOneBtn!);

    expect(updateCharacter).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/*  Rune learning gating tests                                        */
/* ------------------------------------------------------------------ */

describe('AdvancementPage rune learning gating', () => {
  beforeEach(() => {
    cleanup();
  });

  // **Validates: Requirements 6.2**
  it('RuneLearningPanel renders when character has "Rune Magic" talent', () => {
    renderAdvancementPage({
      talents: [{ n: 'Rune Magic', lvl: 1, desc: 'Can inscribe runes' }],
    });

    expect(screen.getByText('Rune Learning')).toBeInTheDocument();
  });

  // **Validates: Requirements 6.1**
  it('RuneLearningPanel does not render when character lacks Rune Magic talent', () => {
    renderAdvancementPage({
      talents: [{ n: 'Hardy', lvl: 1, desc: 'Extra tough' }],
    });

    expect(screen.queryByText('Rune Learning')).not.toBeInTheDocument();
  });
});
