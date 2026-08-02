import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CantPanel } from '../CantPanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import { CANT_CATALOGUE } from '../../../data/cants';

/**
 * Helper to create a test character with overrides.
 * Uses real spell names from the catalogue so CantPanel logic computes correctly.
 */
function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...BLANK_CHARACTER, ...overrides } as Character;
}

/** Creates a SpellItem matching a real catalogue spell name */
function makeSpell(name: string) {
  return { name, cn: '4', range: 'You', target: 'You', duration: 'WPB rounds', effect: 'Test effect' };
}

describe('CantPanel', () => {
  let updateCharacter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    updateCharacter = vi.fn();
  });

  // **Validates: Requirements 5.6**
  it('renders Lore groups in alphabetical order by Wind display name', () => {
    // Character with spells from Beasts and Fire → groups should be "Beasts (Ghur)" before "Fire (Aqshy)"
    const char = makeCharacter({
      spells: [
        makeSpell('Amber Talons'),   // Lore of Beasts
        makeSpell('Ignite'),         // Lore of Fire
      ],
      channellingProgress: [],
      learnedCants: [],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    const { container } = render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    // Find all lore group headers
    const loreNames = container.querySelectorAll('[class*="loreName"]');
    expect(loreNames.length).toBe(2);
    expect(loreNames[0].textContent).toBe('Beasts (Ghur)');
    expect(loreNames[1].textContent).toBe('Fire (Aqshy)');
  });

  // **Validates: Requirements 5.1**
  it('learned Cant shows name, SL cost, and effect', () => {
    const beastsCant = CANT_CATALOGUE.find(c => c.name === 'Face of the Wild')!;
    const char = makeCharacter({
      spells: [makeSpell('Amber Talons')],
      channellingProgress: [],
      learnedCants: [{ lore: 'Lore of Beasts', cantName: 'Face of the Wild' }],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    expect(screen.getByText('Face of the Wild')).toBeInTheDocument();
    expect(screen.getByText('1 SL')).toBeInTheDocument();
    expect(screen.getByText(beastsCant.effect)).toBeInTheDocument();
  });

  // **Validates: Requirements 5.2**
  it('available Cant shows learnable indicator (Learn button)', () => {
    // Character has 1 spell from Beasts, 0 learned Cants → 1 slot available
    const char = makeCharacter({
      spells: [makeSpell('Amber Talons')],
      channellingProgress: [],
      learnedCants: [],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    // Should have a Learn button for available Cants
    const learnButtons = screen.getAllByRole('button', { name: /Learn/i });
    expect(learnButtons.length).toBeGreaterThan(0);
    // The first available Cant should show "Learn" text
    expect(learnButtons[0]).toHaveTextContent('+ Learn');
  });

  // **Validates: Requirements 5.3**
  it('locked Cant shows prerequisite message', () => {
    // Character has 1 spell → 1 slot permitted
    // Already learned 1 Cant → remaining Cants are locked
    const char = makeCharacter({
      spells: [makeSpell('Amber Talons')],
      channellingProgress: [],
      learnedCants: [{ lore: 'Lore of Beasts', cantName: 'Face of the Wild' }],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    // Locked Cants should display the locked message (there are 2 locked cants)
    const lockedMessages = screen.getAllByText('Max Cants learned for this Lore');
    expect(lockedMessages.length).toBeGreaterThanOrEqual(1);
  });

  // **Validates: Requirements 4.3**
  it('Learn button calls updateCharacter correctly', () => {
    const char = makeCharacter({
      spells: [makeSpell('Amber Talons')],
      channellingProgress: [],
      learnedCants: [],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    // Click the first Learn button
    const learnBtn = screen.getAllByRole('button', { name: /Learn/i })[0];
    fireEvent.click(learnBtn);

    expect(updateCharacter).toHaveBeenCalledTimes(1);
    // updateCharacter is called with a mutator function
    const mutator = updateCharacter.mock.calls[0][0];
    const result = mutator(char);
    // Should have added a cant to learnedCants
    expect(result.learnedCants.length).toBe(1);
    expect(result.learnedCants[0].lore).toBe('Lore of Beasts');
  });

  // **Validates: Requirements 4.1, 4.5**
  it('Activate button deducts SL and shows confirmation', () => {
    const char = makeCharacter({
      spells: [makeSpell('Amber Talons')],
      channellingProgress: [{ spellName: 'Amber Talons', accumulatedSL: 3 }],
      learnedCants: [{ lore: 'Lore of Beasts', cantName: 'Face of the Wild' }],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    const activateBtn = screen.getByRole('button', { name: /Activate Face of the Wild/i });
    expect(activateBtn).not.toBeDisabled();

    fireEvent.click(activateBtn);

    // updateCharacter should have been called to deduct SL
    expect(updateCharacter).toHaveBeenCalledTimes(1);

    // Confirmation message should be displayed
    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveTextContent(/Activated/);
    expect(statusEl).toHaveTextContent(/Face of the Wild/);
    expect(statusEl).toHaveTextContent(/1 SL deducted/);
  });

  // **Validates: Requirements 4.2, 5.5**
  it('Activation disabled when SL insufficient', () => {
    const char = makeCharacter({
      spells: [makeSpell('Amber Talons')],
      channellingProgress: [{ spellName: 'Amber Talons', accumulatedSL: 0 }],
      learnedCants: [{ lore: 'Lore of Beasts', cantName: 'Face of the Wild' }],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    const activateBtn = screen.getByRole('button', { name: /Activate Face of the Wild/i });
    expect(activateBtn).toBeDisabled();
  });

  // **Validates: Requirements 4.4, 5.5**
  it('All activation disabled after one Cant activated per round', () => {
    // Character has 3 spells from Beasts → can learn up to 2 Cants
    // Has learned 2 Cants and has enough SL for both
    const char = makeCharacter({
      spells: [
        makeSpell('Amber Talons'),
        makeSpell('Beast Tongue'),
        makeSpell('Beast Form'),
      ],
      channellingProgress: [
        { spellName: 'Amber Talons', accumulatedSL: 5 },
      ],
      learnedCants: [
        { lore: 'Lore of Beasts', cantName: 'Face of the Wild' },
        { lore: 'Lore of Beasts', cantName: 'Talons of Ghur' },
      ],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    // Activate the first Cant
    const activateBtn1 = screen.getByRole('button', { name: /Activate Face of the Wild/i });
    fireEvent.click(activateBtn1);

    // After activation, the second Cant's activate button should be disabled
    const activateBtn2 = screen.getByRole('button', { name: /Activate Talons of Ghur/i });
    expect(activateBtn2).toBeDisabled();
  });

  // **Validates: Requirements 4.4** (round change re-enables)
  it('Round change re-enables activation', () => {
    const char = makeCharacter({
      spells: [
        makeSpell('Amber Talons'),
        makeSpell('Beast Tongue'),
        makeSpell('Beast Form'),
      ],
      channellingProgress: [
        { spellName: 'Amber Talons', accumulatedSL: 5 },
      ],
      learnedCants: [
        { lore: 'Lore of Beasts', cantName: 'Face of the Wild' },
        { lore: 'Lore of Beasts', cantName: 'Talons of Ghur' },
      ],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    const { rerender } = render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    // Activate Face of the Wild
    const activateBtn = screen.getByRole('button', { name: /Activate Face of the Wild/i });
    fireEvent.click(activateBtn);

    // Talons of Ghur should be disabled
    expect(screen.getByRole('button', { name: /Activate Talons of Ghur/i })).toBeDisabled();

    // Advance to next round — note: the character still has SL because
    // updateCharacter is mocked and doesn't actually mutate
    // We need a character that still has SL for the re-render
    const charAfterDeduction = makeCharacter({
      spells: [
        makeSpell('Amber Talons'),
        makeSpell('Beast Tongue'),
        makeSpell('Beast Form'),
      ],
      channellingProgress: [
        { spellName: 'Amber Talons', accumulatedSL: 4 },
      ],
      learnedCants: [
        { lore: 'Lore of Beasts', cantName: 'Face of the Wild' },
        { lore: 'Lore of Beasts', cantName: 'Talons of Ghur' },
      ],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    rerender(
      <CantPanel character={charAfterDeduction} updateCharacter={updateCharacter} currentRound={2} />
    );

    // Activation should be re-enabled after round change
    expect(screen.getByRole('button', { name: /Activate Talons of Ghur/i })).not.toBeDisabled();
  });

  // **Validates: Requirements 3.4**
  it('Over-limit warning displayed and Learn disabled', () => {
    // Character has 1 spell → 1 slot permitted
    // But learnedCants has 2 entries → over-limit violation
    const char = makeCharacter({
      spells: [makeSpell('Amber Talons')],
      channellingProgress: [],
      learnedCants: [
        { lore: 'Lore of Beasts', cantName: 'Face of the Wild' },
        { lore: 'Lore of Beasts', cantName: 'Talons of Ghur' },
      ],
      chars: { ...BLANK_CHARACTER.chars, WP: { i: 40, a: 0, b: 0 } },
    });

    render(
      <CantPanel character={char} updateCharacter={updateCharacter} currentRound={1} />
    );

    // Over-limit warning should be displayed
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Over-limit violation/)).toBeInTheDocument();

    // The "Learning new Cants is disabled" message should show
    expect(screen.getByText(/Learning new Cants is disabled until resolved/)).toBeInTheDocument();
  });
});
