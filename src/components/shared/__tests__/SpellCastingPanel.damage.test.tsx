import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellCastingPanel } from '../SpellCastingPanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, SpellItem } from '../../../types/character';

/**
 * Validates: Requirements 1.1, 1.5, 3.1, 3.2, 3.3
 *
 * 1.1 — Magic missile spells display a Damage_Breakdown below/alongside effect text
 * 1.5 — Non-magic-missile spells display only raw effect text (no breakdown)
 * 3.1 — Help indicator (info icon) adjacent to Effect column header
 * 3.2 — Tooltip displays on hover/tap with correct text
 * 3.3 — Tooltip accessible via keyboard focus
 */

const magicMissileSpell: SpellItem = {
  name: 'Bolt',
  cn: '4',
  range: 'WP yards',
  target: '1',
  duration: 'Instant',
  effect: 'Magic missile Dmg +4',
  memorized: true,
};

const nonMagicMissileSpell: SpellItem = {
  name: 'Healing Touch',
  cn: '3',
  range: 'Touch',
  target: '1',
  duration: 'Instant',
  effect: 'Healing Touch',
  memorized: true,
};

/** Build a character with spellcasting talent and known WP/T values. */
function makeChar(overrides: Partial<Character> = {}): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: {
      ...base.chars,
      WP: { i: 30, a: 5, b: 0 }, // total 35, WPB = 3
      T: { i: 30, a: 5, b: 0 },  // total 35, TB = 3
    },
    talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }],
    aSkills: [
      { n: 'Language (Magick)', c: 'Int', a: 15 },
      { n: 'Channelling', c: 'WP', a: 10 },
    ],
    channellingProgress: [],
    ...overrides,
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

// ─── 3.1 Info icon renders in Effect column header ───

describe('SpellCastingPanel damage — tooltip icon', () => {
  it('renders an info icon in the Effect column header', () => {
    renderPanel({ spells: [magicMissileSpell] });

    // The tooltip wrapper has role="tooltip" inside it; look for the tooltip element
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
  });
});

// ─── 3.2, 3.3 Tooltip text appears on focus ───

describe('SpellCastingPanel damage — tooltip accessibility', () => {
  it('tooltip text is present in the document with correct content', () => {
    renderPanel({ spells: [magicMissileSpell] });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(
      'Magic missile damage = listed modifier + Success Levels from your casting roll.',
    );
  });

  it('tooltip wrapper is keyboard-focusable (tabIndex=0)', () => {
    renderPanel({ spells: [magicMissileSpell] });

    // The tooltip wrapper has aria-describedby="effect-tooltip" and tabIndex={0}
    const wrapper = document.querySelector('[aria-describedby="effect-tooltip"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute('tabindex', '0');
  });
});

// ─── 1.1 Damage breakdown renders for magic missile spells ───

describe('SpellCastingPanel damage — breakdown for magic missile', () => {
  it('renders damage breakdown annotation for a magic missile spell', () => {
    renderPanel({ spells: [magicMissileSpell] });

    // "Magic missile Dmg +4" should produce a breakdown of "Dmg: 4 + SL"
    expect(screen.getByText('Dmg: 4 + SL')).toBeInTheDocument();
  });
});

// ─── 1.5 No breakdown for non-magic-missile spells ───

describe('SpellCastingPanel damage — no breakdown for non-magic-missile', () => {
  it('does not render damage breakdown for non-magic-missile spells', () => {
    renderPanel({ spells: [nonMagicMissileSpell] });

    // The effect text should be present (appears in both name and effect cells)
    const matches = screen.getAllByText('Healing Touch');
    expect(matches.length).toBeGreaterThanOrEqual(1);

    // No "Dmg:" annotation should appear
    expect(screen.queryByText(/^Dmg:/)).not.toBeInTheDocument();
  });
});
