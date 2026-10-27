import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellCastingPanel } from '../SpellCastingPanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, SpellItem } from '../../../types/character';
import { computeCastingTarget } from '../../../logic/spell-casting';

const bolt: SpellItem = {
  name: 'Bolt',
  cn: '4',
  range: 'WP yards',
  target: '1',
  duration: 'Instant',
  effect: 'Magic missile Dmg +4',
  memorized: true,
};

const pettySpell: SpellItem = {
  name: 'Marsh Lights',
  cn: '0',
  range: 'Vision',
  target: 'Special',
  duration: 'Special',
  effect: 'Petty effect',
  memorized: true,
};

function makeChar(overrides: Partial<Character> = {}): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: {
      ...base.chars,
      Int: { i: 35, a: 0, b: 0 }, // Int total 35
      WP: { i: 30, a: 5, b: 0 },
      T: { i: 30, a: 5, b: 0 },
    },
    talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }],
    aSkills: [
      { n: 'Language (Magick)', c: 'Int', a: 5 }, // advances 5 → target 40
      { n: 'Channelling', c: 'WP', a: 10 },
    ],
    ...overrides,
  };
}

function openGuide(spellName: string, charOverrides: Partial<Character> = {}) {
  const character = makeChar(charOverrides);
  render(
    <SpellCastingPanel
      character={character}
      update={vi.fn()}
      updateCharacter={vi.fn()}
      addRoll={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByText(spellName));
  fireEvent.click(screen.getByTestId('guided-cast-trigger'));
  return { character };
}

describe('GuidedCastPanel — Step 1 Select (AC-2)', () => {
  it('opens on Step 1 showing the casting target equal to computeCastingTarget', () => {
    const { character } = openGuide('Bolt', { spells: [bolt] });
    const dialog = screen.getByRole('dialog', { name: 'Guide my spell' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const heading = within(dialog).getByRole('heading', { level: 2 });
    // Before a cast is resolved the overcast/miscast steps are not applicable,
    // so the stepper shows 4 of the 6 steps.
    expect(heading).toHaveTextContent(/Step 1 of 4: Select your spell/);

    const expected = computeCastingTarget(character); // 35 + 5 = 40
    expect(expected).toBe(40);

    const cell = within(dialog).getByLabelText('Casting target breakdown');
    expect(cell).toHaveTextContent(String(expected));
  });

  it('shows a breakdown tooltip whose additive lines sum to the total', () => {
    const { character } = openGuide('Bolt', { spells: [bolt] });
    const expected = computeCastingTarget(character);

    const cell = screen.getByLabelText('Casting target breakdown');
    fireEvent.click(cell);

    const tooltip = screen
      .getAllByRole('tooltip')
      .find((el) => /Int total/.test(el.textContent ?? ''))!;
    expect(tooltip).toBeDefined();
    // Lines: "Int total 35", "Language (Magick) advances 5", "= 40"
    expect(tooltip).toHaveTextContent('Int total 35');
    expect(tooltip).toHaveTextContent('Language (Magick) advances 5');
    expect(tooltip).toHaveTextContent(`= ${expected}`);
    // 35 + 5 = 40 == total
    expect(35 + 5).toBe(expected);
  });
});

describe('GuidedCastPanel — Step 2 Route (AC-3)', () => {
  it('offers Cast + Channel for a non-Petty spell with a cited rationale', () => {
    openGuide('Bolt', { spells: [bolt] });
    // Advance to Step 2.
    fireEvent.click(screen.getByTestId('guided-cast-next'));

    const dialog = screen.getByRole('dialog', { name: 'Guide my spell' });
    expect(within(dialog).getByText('Cast now')).toBeInTheDocument();
    expect(within(dialog).getByText('Channel first')).toBeInTheDocument();
    // Citation from the advisor copy.
    expect(within(dialog).getByText(/Core p\.234/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Channelling Test/)).toBeInTheDocument();
  });

  it('offers Cast only (no Channel) for a Petty spell, with the Petty note', () => {
    openGuide('Marsh Lights', { spells: [pettySpell] });
    fireEvent.click(screen.getByTestId('guided-cast-next'));

    const dialog = screen.getByRole('dialog', { name: 'Guide my spell' });
    expect(within(dialog).getByText('Cast now')).toBeInTheDocument();
    expect(within(dialog).queryByText('Channel first')).not.toBeInTheDocument();
    // The Petty note appears (advisor body + the RouteStep note both cite it).
    expect(within(dialog).getAllByText(/Petty spell \(CN 0\)/).length).toBeGreaterThanOrEqual(1);
  });
});
