import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellCastingPanel } from '../shared/SpellCastingPanel';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, SpellItem } from '../../types/character';

/**
 * Validates: Requirements 5.1, 5.2, 5.3
 *
 * 5.1 — No spellcasting talent → message shown, no casting/memorization controls
 * 5.2 — Acquiring a qualifying talent → full casting interface rendered
 * 5.3 — Spells present but no talent → read-only list, no cast/channel/memorize controls
 */

const testSpells: SpellItem[] = [
  { name: 'Dart', cn: '0', range: 'WP yards', target: '1', duration: 'Instant', effect: 'Magic missile, Dmg +0', memorized: true },
  { name: 'Bolt', cn: '4', range: 'WP yards', target: '1', duration: 'Instant', effect: 'Magic missile Dmg +4', memorized: true },
];

/** Build a character with optional overrides for gating tests. */
function makeChar(overrides: Partial<Character> = {}): Character {
  const base = structuredClone(BLANK_CHARACTER);
  return {
    ...base,
    chars: {
      ...base.chars,
      Int: { i: 35, a: 10, b: 0 },
      WP: { i: 30, a: 5, b: 0 },
    },
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

// ─── 5.1 No spellcasting talent and no spells → "no spellcasting talent" message ───

describe('SpellCastingPanel gating — no talent, no spells', () => {
  it('shows "no spellcasting talent" message when character has no spells and no qualifying talent', () => {
    renderPanel({ talents: [], spells: [] });

    expect(
      screen.getByText(/no spellcasting talent/i),
    ).toBeInTheDocument();

    // No cast or channel buttons should be present
    expect(screen.queryByLabelText(/^Cast /)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Channel /)).not.toBeInTheDocument();
    // No manage spells button
    expect(screen.queryByText('Manage Spells')).not.toBeInTheDocument();
  });
});

// ─── 5.3 Spells present but no talent → read-only list, no cast/channel buttons ───

describe('SpellCastingPanel gating — spells but no talent', () => {
  it('shows spells in read-only mode with no cast/channel buttons', () => {
    renderPanel({
      talents: [{ n: 'Hardy', lvl: 1, desc: '' }],
      spells: testSpells.map((s) => ({ ...s })),
    });

    // Read-only banner should be visible
    expect(
      screen.getByText(/spellcasting talent required/i),
    ).toBeInTheDocument();

    // Spell names should still be visible
    expect(screen.getByText('Dart')).toBeInTheDocument();
    expect(screen.getByText('Bolt')).toBeInTheDocument();

    // No cast or channel buttons
    expect(screen.queryByLabelText('Cast Dart')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cast Bolt')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Channel Bolt')).not.toBeInTheDocument();

    // No manage spells button
    expect(screen.queryByText('Manage Spells')).not.toBeInTheDocument();
  });
});

// ─── 5.2 Arcane Magic talent → full casting interface ───

describe('SpellCastingPanel gating — Arcane Magic talent', () => {
  it('renders full casting interface when character has Arcane Magic talent', () => {
    renderPanel({
      talents: [{ n: 'Arcane Magic (Fire)', lvl: 1, desc: '' }],
      spells: testSpells.map((s) => ({ ...s })),
    });

    // No gating messages
    expect(screen.queryByText(/no spellcasting talent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/spellcasting talent required/i)).not.toBeInTheDocument();

    // Cast buttons present
    expect(screen.getByLabelText('Cast Dart')).toBeInTheDocument();
    expect(screen.getByLabelText('Cast Bolt')).toBeInTheDocument();

    // Channel button for non-petty spell
    expect(screen.getByLabelText('Channel Bolt')).toBeInTheDocument();

    // Manage spells button present
    expect(screen.getByText('Manage Spells')).toBeInTheDocument();
  });
});

// ─── 5.2 Petty Magic talent → full casting interface ───

describe('SpellCastingPanel gating — Petty Magic talent', () => {
  it('renders full casting interface when character has Petty Magic talent', () => {
    renderPanel({
      talents: [{ n: 'Petty Magic', lvl: 1, desc: '' }],
      spells: testSpells.map((s) => ({ ...s })),
    });

    // No gating messages
    expect(screen.queryByText(/no spellcasting talent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/spellcasting talent required/i)).not.toBeInTheDocument();

    // Cast buttons present
    expect(screen.getByLabelText('Cast Dart')).toBeInTheDocument();
    expect(screen.getByLabelText('Cast Bolt')).toBeInTheDocument();

    // Manage spells button present
    expect(screen.getByText('Manage Spells')).toBeInTheDocument();
  });
});

// ─── 5.2 Bless talent → full casting interface ───

describe('SpellCastingPanel gating — Bless talent', () => {
  it('renders full casting interface when character has Bless talent', () => {
    renderPanel({
      talents: [{ n: 'Bless (Sigmar)', lvl: 1, desc: '' }],
      spells: testSpells.map((s) => ({ ...s })),
    });

    // No gating messages
    expect(screen.queryByText(/no spellcasting talent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/spellcasting talent required/i)).not.toBeInTheDocument();

    // Cast buttons present
    expect(screen.getByLabelText('Cast Dart')).toBeInTheDocument();
    expect(screen.getByLabelText('Cast Bolt')).toBeInTheDocument();

    // Manage spells button present
    expect(screen.getByText('Manage Spells')).toBeInTheDocument();
  });
});
