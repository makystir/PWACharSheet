import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellCastingPanel } from '../SpellCastingPanel';
import { GuidedCastTrigger } from '../GuidedCastTrigger';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, SpellItem } from '../../../types/character';

/**
 * AC-1 — Guide OFF by default: SpellCastingPanel renders/behaves identically to
 * today PLUS exactly one opt-in trigger per memorized castable row, and no other
 * default-render change.
 */

const bolt: SpellItem = {
  name: 'Bolt',
  cn: '4',
  range: 'WP yards',
  target: '1',
  duration: 'Instant',
  effect: 'Magic missile Dmg +4',
  memorized: true,
};

const fireball: SpellItem = {
  name: 'Fireball',
  cn: '8',
  range: 'WP yards',
  target: 'AoE (4)',
  duration: 'Instant',
  effect: 'Magic missile Dmg +6',
  memorized: true,
};

function makeChar(overrides: Partial<Character> = {}): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: {
      ...base.chars,
      Int: { i: 35, a: 0, b: 0 },
      WP: { i: 30, a: 5, b: 0 },
      T: { i: 30, a: 5, b: 0 },
    },
    talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }],
    aSkills: [
      { n: 'Language (Magick)', c: 'Int', a: 5 },
      { n: 'Channelling', c: 'WP', a: 10 },
    ],
    ...overrides,
  };
}

function renderPanel(charOverrides: Partial<Character> = {}) {
  const character = makeChar(charOverrides);
  render(
    <SpellCastingPanel
      character={character}
      update={vi.fn()}
      updateCharacter={vi.fn()}
      addRoll={vi.fn()}
    />,
  );
  return { character };
}

describe('GuidedCastTrigger (standalone)', () => {
  it('renders an opt-in button with the correct a11y affordances', () => {
    const onOpen = vi.fn();
    render(<GuidedCastTrigger onOpen={onOpen} />);
    const btn = screen.getByTestId('guided-cast-trigger');
    expect(btn).toHaveAttribute('aria-label', 'Guide my spell');
    fireEvent.click(btn);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe('GuidedCastTrigger in SpellCastingPanel (AC-1 default-off)', () => {
  it('renders exactly one trigger on the expanded memorized castable row', () => {
    renderPanel({ spells: [bolt, fireball] });

    // Before expansion no trigger is in the compact rows (rows expand one at a time).
    expect(screen.queryAllByTestId('guided-cast-trigger')).toHaveLength(0);

    // Expanding a row reveals its single trigger alongside Cast/Channel.
    fireEvent.click(screen.getByText('Bolt'));
    expect(screen.getAllByTestId('guided-cast-trigger')).toHaveLength(1);

    // Expanding the other row collapses the first; still exactly one trigger.
    fireEvent.click(screen.getByText('Fireball'));
    expect(screen.getAllByTestId('guided-cast-trigger')).toHaveLength(1);
  });

  it('does not open any guide overlay by default (no dialog mounted)', () => {
    renderPanel({ spells: [bolt] });
    fireEvent.click(screen.getByText('Bolt'));
    // The trigger exists but the overlay is only created on click.
    expect(screen.queryByRole('dialog', { name: 'Guide my spell' })).not.toBeInTheDocument();
  });
});
