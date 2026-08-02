// Feature: alternative-channelling-cants, Property 1: CantPanel visibility biconditional
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellCastingPanel } from '../SpellCastingPanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

/**
 * **Validates Property 1: CantPanel visibility biconditional**
 *
 * For any character, the CantPanel renders in the DOM if and only if
 * `houseRules.useCants` is true AND the character has at least one spell
 * whose lore matches one of the 8 colour magic Lore strings in the static
 * spell catalogue.
 *
 * **Requirements: 1.2, 1.3, 1.6, 7.3**
 */

/** Build a test character with spellcasting talent and sensible defaults. */
function makeChar(overrides: Partial<Character> = {}): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: {
      ...base.chars,
      WP: { i: 30, a: 5, b: 0 },
      T: { i: 30, a: 5, b: 0 },
    },
    talents: [{ n: 'Arcane Magic (Beasts)', lvl: 1, desc: '' }],
    aSkills: [
      { n: 'Language (Magick)', c: 'Int', a: 15 },
      { n: 'Channelling', c: 'WP', a: 10 },
    ],
    channellingProgress: [],
    ...overrides,
  };
}

/** Creates a SpellItem matching a real catalogue spell name */
function makeSpell(name: string, cn = '4') {
  return {
    name,
    cn,
    range: 'You',
    target: 'You',
    duration: 'WPB rounds',
    effect: 'Test effect',
    memorized: true,
  };
}

function renderPanel(charOverrides: Partial<Character> = {}) {
  const character = makeChar(charOverrides);
  const update = vi.fn();
  const updateCharacter = vi.fn();
  const addRoll = vi.fn();
  render(
    <SpellCastingPanel
      character={character}
      update={update}
      updateCharacter={updateCharacter}
      addRoll={addRoll}
    />,
  );
  return { character, update, updateCharacter, addRoll };
}

describe('CantPanel visibility biconditional (Property 1)', () => {
  // Requirement 1.3: WHEN toggle is true AND character has colour magic spell → CantPanel renders
  it('renders CantPanel when useCants=true and character has colour magic spells', () => {
    renderPanel({
      spells: [makeSpell('Amber Talons')], // Lore of Beasts — a colour magic spell
      houseRules: { ...BLANK_CHARACTER.houseRules, useCants: true },
    });

    const cantPanel = screen.getByRole('region', { name: 'Alternative Channelling Cants' });
    expect(cantPanel).toBeInTheDocument();
  });

  // Requirement 1.2: WHEN toggle is false → CantPanel SHALL NOT render
  it('does not render CantPanel when useCants=false', () => {
    renderPanel({
      spells: [makeSpell('Amber Talons')],
      houseRules: { ...BLANK_CHARACTER.houseRules, useCants: false },
    });

    const cantPanel = screen.queryByRole('region', { name: 'Alternative Channelling Cants' });
    expect(cantPanel).not.toBeInTheDocument();
  });

  // Requirement 1.6: WHEN toggle is true but character has NO colour magic spells → CantPanel SHALL NOT render
  it('does not render CantPanel when character has no colour magic spells', () => {
    renderPanel({
      spells: [makeSpell('Dart', '0')], // Petty Magic spell — not colour magic
      houseRules: { ...BLANK_CHARACTER.houseRules, useCants: true },
    });

    const cantPanel = screen.queryByRole('region', { name: 'Alternative Channelling Cants' });
    expect(cantPanel).not.toBeInTheDocument();
  });

  // Additional case: useCants=true but only non-colour spells (e.g., Petty Magic)
  it('does not render CantPanel when character has only non-colour lore spells', () => {
    renderPanel({
      spells: [
        makeSpell('Dart', '0'),     // Petty
        makeSpell('Light', '0'),    // Petty
        makeSpell('Sleep', '0'),    // Petty
      ],
      houseRules: { ...BLANK_CHARACTER.houseRules, useCants: true },
    });

    const cantPanel = screen.queryByRole('region', { name: 'Alternative Channelling Cants' });
    expect(cantPanel).not.toBeInTheDocument();
  });

  // Requirement 7.3: CantPanel positioned within SpellCastingPanel
  it('CantPanel is positioned within SpellCastingPanel', () => {
    const character = makeChar({
      spells: [makeSpell('Amber Talons')],
      houseRules: { ...BLANK_CHARACTER.houseRules, useCants: true },
    });

    const { container } = render(
      <SpellCastingPanel
        character={character}
        update={vi.fn()}
        updateCharacter={vi.fn()}
      />,
    );

    // CantPanel should be a descendant of the SpellCastingPanel's rendered output
    const cantPanel = container.querySelector('[aria-label="Alternative Channelling Cants"]');
    expect(cantPanel).not.toBeNull();
    // Verify CantPanel is nested inside the SpellCastingPanel DOM tree
    expect(cantPanel!.parentElement).toBeTruthy();
  });
});
