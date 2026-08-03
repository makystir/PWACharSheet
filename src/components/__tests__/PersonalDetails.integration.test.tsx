import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CharacterPage } from '../pages/CharacterPage';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, ArmourPoints } from '../../types/character';

/**
 * Integration tests for personal details roll and selection workflows.
 * These tests render the full CharacterPage and verify end-to-end behaviour
 * of the random generation and manual selection features.
 *
 * Validates: Requirements 2.1, 2.8, 4.9, 5.1, 6.9, 7.1, 7.2, 8.8,
 *            9.3, 9.5, 9.6, 10.5, 12.1, 12.3, 12.4, 13.2, 13.3
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

interface RenderOptions {
  character?: Partial<Character>;
  subTab?: string;
}

function renderCharPage(opts: RenderOptions = {}) {
  const { character: overrides = {}, subTab = 'identity' } = opts;
  const char = makeCharacter(overrides);
  const update = vi.fn();
  const updateCharacter = vi.fn();

  const result = render(
    <CharacterPage
      character={char}
      characterId="test-integration"
      update={update}
      updateCharacter={updateCharacter}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={30}
      coinWeight={0}
      rollHistory={[]}
      addRoll={vi.fn()}
      clearHistory={vi.fn()}
      subTab={subTab}
      onSubTabChange={vi.fn()}
    />
  );

  return { ...result, update, updateCharacter, char };
}

/**
 * Helper: mock Math.random to return a sequence of values.
 * Each call to Math.random() pops from the front of the queue.
 * Values should be in [0, 1) — they map to dice via Math.floor(val * 10) + 1 → [1..10]
 * or Math.floor(val * 100) + 1 → [1..100].
 */
function mockRandomSequence(values: number[]) {
  const queue = [...values];
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    if (queue.length === 0) return 0.5; // fallback
    return queue.shift()!;
  });
}

describe('PersonalDetails integration — Roll workflows', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    if (randomSpy) randomSpy.mockRestore();
  });

  // ─── Requirement 2.1, 2.8: Age roll produces valid numeric string ───

  describe('Age roll (Req 2.1, 2.8)', () => {
    it('click age roll button updates age field with valid numeric string for Human', () => {
      // Human age = 15 + 1d10. Mock random to produce die value 7 → age 22
      // Math.floor(0.6 * 10) + 1 = 7
      randomSpy = mockRandomSequence([0.6]);

      const { update } = renderCharPage({ character: { species: 'Human / Reiklander' } });

      const rollBtn = screen.getByRole('button', { name: 'Roll Age' });
      fireEvent.click(rollBtn);

      expect(update).toHaveBeenCalledWith('age', '22');
    });

    it('click age roll button updates age for Dwarf (10d10)', () => {
      // Dwarf age = 15 + 10d10. All dice produce 5 → sum = 50 → age 65
      // Math.floor(0.4 * 10) + 1 = 5
      randomSpy = mockRandomSequence(Array(10).fill(0.4));

      const { update } = renderCharPage({ character: { species: 'Dwarf' } });

      const rollBtn = screen.getByRole('button', { name: 'Roll Age' });
      fireEvent.click(rollBtn);

      expect(update).toHaveBeenCalledWith('age', '65');
    });
  });

  // ─── Requirement 4.9, 5.1: Height roll for Human with bonus rule ───

  describe('Height roll with Human bonus rule (Req 4.9, 5.1)', () => {
    it('click height roll button for Human without bonus → formatted as X\'Y"', () => {
      // Human height = 4'9" + 2d10 inches. Dice: 3, 4 → +7 → 57 + 7 = 64" = 5'4"
      // Math.floor(0.2 * 10) + 1 = 3, Math.floor(0.3 * 10) + 1 = 4
      randomSpy = mockRandomSequence([0.2, 0.3]);

      const { update } = renderCharPage({ character: { species: 'Human / Reiklander' } });

      const rollBtn = screen.getByRole('button', { name: 'Roll Height' });
      fireEvent.click(rollBtn);

      expect(update).toHaveBeenCalledWith('height', '5\'4"');
    });

    it('click height roll button for Human with bonus applied when die is 10', () => {
      // Human height: dice 10, 3, bonus die 5
      // Math.floor(0.9 * 10) + 1 = 10, Math.floor(0.2 * 10) + 1 = 3
      // humanHeightNeedsBonus([10, 3]) → true → bonus die: Math.floor(0.4 * 10) + 1 = 5
      // Total: 57 + 10 + 3 + 5 = 75" = 6'3"
      randomSpy = mockRandomSequence([0.9, 0.2, 0.4]);

      const { update } = renderCharPage({ character: { species: 'Human / Reiklander' } });

      const rollBtn = screen.getByRole('button', { name: 'Roll Height' });
      fireEvent.click(rollBtn);

      expect(update).toHaveBeenCalledWith('height', '6\'3"');
    });
  });

  // ─── Requirement 6.9: Eye colour roll stores value from table ───

  describe('Eye colour roll (Req 6.9)', () => {
    it('click eye colour roll button stores a value from the species colour table', () => {
      // Human eyes: 2d10. Dice: 5, 6 → sum = 11 → "Pale Grey" from Human table
      // Math.floor(0.4 * 10) + 1 = 5, Math.floor(0.5 * 10) + 1 = 6
      randomSpy = mockRandomSequence([0.4, 0.5]);

      const { update } = renderCharPage({ character: { species: 'Human / Reiklander' } });

      const rollBtn = screen.getByRole('button', { name: 'Roll Eyes' });
      fireEvent.click(rollBtn);

      expect(update).toHaveBeenCalledWith('eyes', 'Pale Grey');
    });
  });

  // ─── Requirement 7.1, 7.2: Elf variegated eye flow ───

  describe('Elf variegated eye colour flow (Req 7.1, 7.2)', () => {
    it('roll first eye colour → shows Roll Second Colour → combined format stored', () => {
      // Wood Elf eyes: first roll 2d10 → dice 4, 4 → sum 8 → "Chestnut"
      // Math.floor(0.3 * 10) + 1 = 4, Math.floor(0.3 * 10) + 1 = 4
      // Then second roll: dice 2, 2 → sum 4 → "Ivy Green"
      // Math.floor(0.1 * 10) + 1 = 2, Math.floor(0.1 * 10) + 1 = 2
      randomSpy = mockRandomSequence([0.3, 0.3, 0.1, 0.1]);

      const { update } = renderCharPage({ character: { species: 'Wood Elf' } });

      // Roll first colour
      const rollBtn = screen.getByRole('button', { name: 'Roll Eyes' });
      fireEvent.click(rollBtn);

      expect(update).toHaveBeenCalledWith('eyes', 'Chestnut');

      // "Roll Second Colour" button should appear
      const secondBtn = screen.getByRole('button', { name: 'Roll Second Colour' });
      expect(secondBtn).toBeInTheDocument();

      // Roll second colour
      fireEvent.click(secondBtn);

      expect(update).toHaveBeenCalledWith('eyes', 'Chestnut flecked with Ivy Green');
    });

    it('variegated flow for High Elf produces combined format', () => {
      // High Elf eyes: first roll 2d10 → dice 5, 5 → sum 10 → "Turquoise"
      // Math.floor(0.4 * 10) + 1 = 5, Math.floor(0.4 * 10) + 1 = 5
      // Second roll: dice 8, 8 → sum 16 → "Amber"
      // Math.floor(0.7 * 10) + 1 = 8, Math.floor(0.7 * 10) + 1 = 8
      randomSpy = mockRandomSequence([0.4, 0.4, 0.7, 0.7]);

      const { update } = renderCharPage({ character: { species: 'High Elf' } });

      const rollBtn = screen.getByRole('button', { name: 'Roll Eyes' });
      fireEvent.click(rollBtn);

      expect(update).toHaveBeenCalledWith('eyes', 'Turquoise');

      const secondBtn = screen.getByRole('button', { name: 'Roll Second Colour' });
      fireEvent.click(secondBtn);

      expect(update).toHaveBeenCalledWith('eyes', 'Turquoise flecked with Amber');
    });
  });

  // ─── Requirement 8.8: Hair colour roll ───

  describe('Hair colour roll (Req 8.8)', () => {
    it('click hair roll button stores value from species hair table', () => {
      // Dwarf hair: 2d10. Dice: 6, 6 → sum = 12 → "Bronze" (range 12–14)
      // Math.floor(0.5 * 10) + 1 = 6
      randomSpy = mockRandomSequence([0.5, 0.5]);

      const { update } = renderCharPage({ character: { species: 'Dwarf' } });

      const rollBtn = screen.getByRole('button', { name: 'Roll Hair' });
      fireEvent.click(rollBtn);

      expect(update).toHaveBeenCalledWith('hair', 'Bronze');
    });
  });

  // ─── Requirement 10.5: Dwarf alternate table roll ───

  describe('Dwarf alternate table roll (Req 10.5)', () => {
    it('alternate roll updates hair and eyes, offers feature for confirmation', () => {
      // d100: Math.floor(0.5 * 100) + 1 = 51 → row 51-55: hair "Bronze", eyes "Hazel", feature "Charming Smile"
      randomSpy = mockRandomSequence([0.5]);

      const { update } = renderCharPage({ character: { species: 'Dwarf' } });

      const altBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
      fireEvent.click(altBtn);

      expect(update).toHaveBeenCalledWith('hair', 'Bronze');
      expect(update).toHaveBeenCalledWith('eyes', 'Hazel');

      // Feature confirmation should appear
      const confirmBtn = screen.getByRole('button', { name: 'Confirm feature' });
      expect(confirmBtn).toBeInTheDocument();
      // The feature text may appear in multiple places (label + dropdown); just verify at least one
      expect(screen.getAllByText(/Charming Smile/).length).toBeGreaterThanOrEqual(1);

      // Confirm the feature
      fireEvent.click(confirmBtn);
      expect(update).toHaveBeenCalledWith('distinguishingFeature', 'Charming Smile');
    });

    it('dismissing feature does not call update for distinguishingFeature', () => {
      // d100: Math.floor(0.3 * 100) + 1 = 31 → row 31-35: hair "Copper", eyes "Steel", feature "Attractive Eyes"
      randomSpy = mockRandomSequence([0.3]);

      const { update } = renderCharPage({ character: { species: 'Dwarf' } });

      const altBtn = screen.getByRole('button', { name: 'Alternate Table Roll' });
      fireEvent.click(altBtn);

      // Dismiss the feature
      const dismissBtn = screen.getByRole('button', { name: 'Dismiss feature' });
      fireEvent.click(dismissBtn);

      const featureCalls = update.mock.calls.filter(c => c[0] === 'distinguishingFeature');
      expect(featureCalls).toHaveLength(0);
    });
  });
});

describe('PersonalDetails integration — Dropdown selection workflows', () => {
  // ─── Requirement 9.3, 9.5, 13.2, 13.3: Dropdown and free-text editing ───

  describe('Dropdown selection (Req 9.3, 9.5, 13.2, 13.3)', () => {
    it('selecting from hair dropdown calls update with the selected value', () => {
      const { update } = renderCharPage({ character: { species: 'Human / Reiklander' } });

      const dropdown = screen.getByRole('combobox', { name: 'Select Hair' });
      fireEvent.change(dropdown, { target: { value: 'Auburn' } });

      expect(update).toHaveBeenCalledWith('hair', 'Auburn');
    });

    it('selecting from eyes dropdown calls update with the selected value', () => {
      const { update } = renderCharPage({ character: { species: 'Human / Reiklander' } });

      const dropdown = screen.getByRole('combobox', { name: 'Select Eyes' });
      fireEvent.change(dropdown, { target: { value: 'Brown' } });

      expect(update).toHaveBeenCalledWith('eyes', 'Brown');
    });

    it('free-text typing overrides a previously selected dropdown value', async () => {
      const { update } = renderCharPage({
        character: { species: 'Human / Reiklander', hair: 'Auburn' },
      });

      // The hair value should be displayed — click it to enter edit mode
      const hairDisplay = screen.getByRole('button', { name: 'Auburn' });
      await userEvent.click(hairDisplay);

      // Type a custom value
      const input = screen.getByDisplayValue('Auburn');
      await userEvent.clear(input);
      await userEvent.type(input, 'Platinum');
      fireEvent.blur(input);

      expect(update).toHaveBeenCalledWith('hair', 'Platinum');
    });
  });
});

describe('PersonalDetails integration — Disabled state', () => {
  // ─── Requirement 12.1, 12.3: Controls disabled/enabled based on species ───

  describe('Controls disabled when species is empty (Req 12.1)', () => {
    it('all roll buttons are aria-disabled when species is empty', () => {
      renderCharPage({ character: { species: '' } });

      const ageRoll = screen.getByRole('button', { name: 'Roll Age' });
      const heightRoll = screen.getByRole('button', { name: 'Roll Height' });
      const hairRoll = screen.getByRole('button', { name: 'Roll Hair' });
      const eyesRoll = screen.getByRole('button', { name: 'Roll Eyes' });

      expect(ageRoll).toHaveAttribute('aria-disabled', 'true');
      expect(heightRoll).toHaveAttribute('aria-disabled', 'true');
      expect(hairRoll).toHaveAttribute('aria-disabled', 'true');
      expect(eyesRoll).toHaveAttribute('aria-disabled', 'true');
    });

    it('roll buttons do not trigger update when species is empty', () => {
      const { update } = renderCharPage({ character: { species: '' } });

      const ageRoll = screen.getByRole('button', { name: 'Roll Age' });
      fireEvent.click(ageRoll);

      // The update should not be called for age since disabled prevents onRoll from firing
      const ageCalls = update.mock.calls.filter(c => c[0] === 'age');
      expect(ageCalls).toHaveLength(0);
    });
  });

  describe('Controls enabled when species is set (Req 12.3)', () => {
    it('all roll buttons are enabled (no aria-disabled) when species is set', () => {
      renderCharPage({ character: { species: 'Human / Reiklander' } });

      const ageRoll = screen.getByRole('button', { name: 'Roll Age' });
      const heightRoll = screen.getByRole('button', { name: 'Roll Height' });
      const hairRoll = screen.getByRole('button', { name: 'Roll Hair' });
      const eyesRoll = screen.getByRole('button', { name: 'Roll Eyes' });

      expect(ageRoll).not.toHaveAttribute('aria-disabled');
      expect(heightRoll).not.toHaveAttribute('aria-disabled');
      expect(hairRoll).not.toHaveAttribute('aria-disabled');
      expect(eyesRoll).not.toHaveAttribute('aria-disabled');
    });

    it('hair dropdown is enabled when species is set', () => {
      renderCharPage({ character: { species: 'Human / Reiklander' } });

      const dropdown = screen.getByRole('combobox', { name: 'Select Hair' });
      expect(dropdown).not.toHaveAttribute('aria-disabled');
    });
  });
});

describe('PersonalDetails integration — Species change (Req 9.6, 12.4)', () => {
  it('species change resets dropdown selections but retains field values', () => {
    // Start with a character that has hair and eyes values already set
    const { rerender, update } = renderCharPage({
      character: { species: 'Human / Reiklander', hair: 'Auburn', eyes: 'Blue' },
    });

    // Verify existing values are shown
    expect(screen.getByRole('button', { name: 'Auburn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blue' })).toBeInTheDocument();

    // Re-render with a different species but same hair/eyes values
    // (simulating species change without clearing fields)
    const newChar = makeCharacter({ species: 'Dwarf', hair: 'Auburn', eyes: 'Blue' });
    rerender(
      <CharacterPage
        character={newChar}
        characterId="test-integration"
        update={update}
        updateCharacter={vi.fn()}
        totalWounds={12}
        armourPoints={defaultAP}
        maxEncumbrance={30}
        coinWeight={0}
        rollHistory={[]}
        addRoll={vi.fn()}
        clearHistory={vi.fn()}
        subTab="identity"
        onSubTabChange={vi.fn()}
      />
    );

    // Field values should be retained
    expect(screen.getByRole('button', { name: 'Auburn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Blue' })).toBeInTheDocument();

    // Dropdown options should now reflect Dwarf options
    const hairDropdown = screen.getByRole('combobox', { name: 'Select Hair' });
    expect(hairDropdown).toBeInTheDocument();

    // Dwarf hair options should be available (e.g. "Bronze" is Dwarf-specific)
    const hairOptions = Array.from(hairDropdown.querySelectorAll('option')).map(o => o.textContent);
    expect(hairOptions).toContain('Bronze');
    // Human-specific "Auburn" should not be in Dwarf dropdown options
    expect(hairOptions).not.toContain('Auburn');
  });
});
