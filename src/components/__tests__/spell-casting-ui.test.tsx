import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellCastingPanel } from '../shared/SpellCastingPanel';
import { OvercastAllocator } from '../shared/OvercastAllocator';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, SpellItem } from '../../types/character';
import type { OvercastOption } from '../../logic/spell-casting';

const testSpells: SpellItem[] = [
  { name: 'Dart', cn: '0', range: 'WP yards', target: '1', duration: 'Instant', effect: 'Magic missile, Dmg +0', memorized: true },
  { name: 'Bolt', cn: '4', range: 'WP yards', target: '1', duration: 'Instant', effect: 'Magic missile Dmg +4', memorized: true },
  { name: 'Flight', cn: '8', range: 'You', target: 'You', duration: 'WPB rounds+', effect: 'Gain Flight trait', memorized: false },
  { name: 'Light', cn: '0', range: 'You', target: 'You', duration: 'WPB mins', effect: 'Create light', memorized: true },
];

/** Build a test character with spells and relevant skills/characteristics. */
function makeSpellChar(overrides: Partial<Character> = {}): Character {
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
    spells: testSpells.map((s) => ({ ...s })),
    channellingProgress: [],
    ...overrides,
  };
}

function renderPanel(charOverrides: Partial<Character> = {}) {
  const character = makeSpellChar(charOverrides);
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


// ─── 7.1.1 Memorized spells are displayed; non-memorized are hidden ──────────

describe('SpellCastingPanel — memorized spells display', () => {
  it('displays memorized spells and hides non-memorized ones', () => {
    renderPanel();
    expect(screen.getByText('Dart')).toBeInTheDocument();
    expect(screen.getByText('Bolt')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.queryByText('Flight')).not.toBeInTheDocument();
  });
});

// ─── 7.1.2 Empty state message when no spells memorized ─────────────────────

describe('SpellCastingPanel — empty state', () => {
  it('shows "No spells memorized" when character has no memorized spells', () => {
    renderPanel({
      spells: [
        { name: 'Flight', cn: '8', range: 'You', target: 'You', duration: 'WPB rounds+', effect: 'Gain Flight trait', memorized: false },
      ],
    });
    expect(screen.getByText('No spells memorized')).toBeInTheDocument();
  });
});

// ─── 7.1.3 Petty spells (CN 0) have no Channel button ───────────────────────

describe('SpellCastingPanel — Petty spell channel button', () => {
  it('does not render a Channel button for Petty spells (CN 0)', () => {
    renderPanel();
    // Dart is CN 0 — should have no Channel button
    expect(screen.queryByLabelText('Channel Dart')).not.toBeInTheDocument();
    // Bolt is CN 4 — should have a Channel button
    expect(screen.getByLabelText('Channel Bolt')).toBeInTheDocument();
  });
});

// ─── 7.1.4 Cast button opens RollDialog with "Language (Magick)" label ──────

describe('SpellCastingPanel — Cast button opens RollDialog', () => {
  it('clicking Cast opens RollDialog with "Language (Magick)" text', () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText('Cast Bolt'));
    expect(screen.getByRole('dialog', { name: 'Roll Dialog' })).toBeInTheDocument();
    expect(screen.getByText('Language (Magick)')).toBeInTheDocument();
  });
});

// ─── 7.1.5 Channel button opens RollDialog with "Channelling" label ─────────

describe('SpellCastingPanel — Channel button opens RollDialog', () => {
  it('clicking Channel opens RollDialog with "Channelling" text', () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText('Channel Bolt'));
    expect(screen.getByRole('dialog', { name: 'Roll Dialog' })).toBeInTheDocument();
    expect(screen.getByText('Channelling')).toBeInTheDocument();
  });
});

// ─── 7.1.6 Channelling progress displays "X / Y" format ─────────────────────

describe('SpellCastingPanel — channelling progress display', () => {
  it('displays channelling progress as "X / Y"', () => {
    renderPanel({
      channellingProgress: [{ spellName: 'Bolt', accumulatedSL: 3 }],
    });
    expect(screen.getByText('3 / 4')).toBeInTheDocument();
  });
});

// ─── 7.1.7 Cancel channelling resets progress ───────────────────────────────

describe('SpellCastingPanel — cancel channelling', () => {
  it('clicking cancel channelling calls updateCharacter with a mutator that removes progress', () => {
    const { character, updateCharacter } = renderPanel({
      channellingProgress: [{ spellName: 'Bolt', accumulatedSL: 3 }],
    });
    fireEvent.click(screen.getByLabelText('Cancel channelling Bolt'));
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    // The cancel should remove the Bolt channelling progress entry
    const boltProgress = updated.channellingProgress.find(
      (cp: { spellName: string }) => cp.spellName === 'Bolt',
    );
    expect(boltProgress).toBeUndefined();
  });
});

// ─── 7.1.8 Memorization toggle updates character data ────────────────────────

describe('SpellCastingPanel — memorization toggle', () => {
  it('toggling a non-memorized spell calls updateCharacter to set memorized to true', () => {
    const { character, updateCharacter } = renderPanel();
    // Open the manage spells section
    fireEvent.click(screen.getByText('Manage Spells'));
    // Find the checkbox for Flight (non-memorized spell) — it's in the manage section
    const checkboxes = screen.getAllByRole('checkbox');
    // Flight is the 3rd spell (index 2) in the spells array
    const flightCheckbox = checkboxes[2];
    fireEvent.click(flightCheckbox);
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const updated = mutator(character);
    const flightSpell = updated.spells.find((s: SpellItem) => s.name === 'Flight');
    expect(flightSpell?.memorized).toBe(true);
  });
});

// ─── 7.1.9 OvercastAllocator enforces slot limits ───────────────────────────

describe('OvercastAllocator — slot limits', () => {
  it('prevents allocating more than available slots', () => {
    const options: OvercastOption[] = [
      { category: 'range', label: 'Range', baseValue: '48 yards', enabled: true },
      { category: 'aoe', label: 'Area of Effect', baseValue: '48 yards', enabled: true },
      { category: 'duration', label: 'Duration', baseValue: '1 round', enabled: true },
      { category: 'targets', label: 'Targets', baseValue: '1', enabled: true },
    ];
    const onAllocate = vi.fn();
    render(<OvercastAllocator options={options} availableSlots={2} onAllocate={onAllocate} />);

    // Click + on Range twice to fill both slots
    const increaseRange = screen.getByLabelText('Increase Range');
    fireEvent.click(increaseRange);
    fireEvent.click(increaseRange);

    // All + buttons should now be disabled
    expect(screen.getByLabelText('Increase Range')).toBeDisabled();
    expect(screen.getByLabelText('Increase Area of Effect')).toBeDisabled();
    expect(screen.getByLabelText('Increase Duration')).toBeDisabled();
    expect(screen.getByLabelText('Increase Targets')).toBeDisabled();

    // Verify the allocated text
    expect(screen.getByText('Allocated: 2 / 2')).toBeInTheDocument();
  });
});
