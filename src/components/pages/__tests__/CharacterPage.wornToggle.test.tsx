import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Render tests for the trapping Worn toggle.
 * Validates: Requirements 2.4, 2.5, 3.1, 3.2, 6.1, 6.2, 8.1, 8.2, 8.3
 *
 * Feature: worn-trappings-encumbrance
 *
 * Tests verify:
 * - Wearable trapping (Cloak) → worn checkbox present; non-wearable (Backpack) → absent (Req 2.4, 2.5)
 * - Clicking the worn toggle sets `worn` via the update path; checking worn clears
 *   storedOnHorse and vice-versa (Req 3.1, 3.2, 6.1, 6.2)
 * - The control is a checkbox with an aria-label referencing the trapping name and a
 *   `checked` state reflecting `worn` (Req 8.1, 8.2, 8.3)
 */

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({
    ...BLANK_CHARACTER,
    trappings: [
      { name: 'Cloak', enc: '1', quantity: 1 }, // wearable
      { name: 'Backpack', enc: '2', quantity: 1 }, // non-wearable
    ],
    ...overrides,
  });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCharPage(overrides: Partial<Character> = {}) {
  const updateCharacter = vi.fn();
  const update = vi.fn();
  const char = makeCharacter(overrides);

  const result = render(
    <CharacterPage
      character={char}
      characterId="test-worn-toggle"
      update={update}
      updateCharacter={updateCharacter}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={30}
      coinWeight={0}
      rollHistory={[]}
      addRoll={vi.fn()}
      clearHistory={vi.fn()}
      subTab="gear"
      onSubTabChange={vi.fn()}
    />
  );

  return { ...result, updateCharacter, update, char };
}

/** The worn toggle aria-label is `Worn — reduces {name}'s encumbrance by 1 per item (min 0)`. */
const wornLabelFor = (name: string) =>
  `Worn — reduces ${name}'s encumbrance by 1 per item (min 0)`;

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('CharacterPage Worn toggle', () => {
  // ─── Req 2.4, 2.5: Toggle visibility ────────────────────────────────────────

  describe('Toggle visibility (Req 2.4, 2.5)', () => {
    it('renders a worn checkbox for a wearable trapping (Cloak)', () => {
      renderCharPage();

      // The card action row renders a worn checkbox for the wearable "Cloak".
      const wornControls = screen.getAllByLabelText(wornLabelFor('Cloak'));
      expect(wornControls.length).toBeGreaterThan(0);

      // Each worn control wraps/points at a checkbox input.
      const checkbox = screen.getAllByRole('checkbox', { name: wornLabelFor('Cloak') });
      expect(checkbox.length).toBeGreaterThan(0);
      checkbox.forEach((cb) => {
        expect(cb).toHaveAttribute('type', 'checkbox');
      });
    });

    it('does not render a worn checkbox for a non-wearable trapping (Backpack)', () => {
      renderCharPage();

      // No worn toggle should exist for the non-wearable "Backpack".
      expect(screen.queryByLabelText(wornLabelFor('Backpack'))).toBeNull();
      expect(
        screen.queryByRole('checkbox', { name: wornLabelFor('Backpack') })
      ).toBeNull();
    });

    it('renders exactly one worn toggle (Cloak) and no toggle for Backpack', () => {
      renderCharPage();

      // Cloak is wearable → present; Backpack is not → absent.
      expect(screen.getByLabelText(wornLabelFor('Cloak'))).toBeInTheDocument();
      expect(screen.queryByLabelText(wornLabelFor('Backpack'))).toBeNull();
    });
  });

  // ─── Req 8.1, 8.2, 8.3: Accessibility & presentation ───────────────────────

  describe('Accessibility and presentation (Req 8.1, 8.2, 8.3)', () => {
    it('the worn control is a checkbox (same control type as the horse toggle) (Req 8.1)', () => {
      renderCharPage();

      const label = screen.getByLabelText(wornLabelFor('Cloak'));
      const checkbox = label.querySelector('input[type="checkbox"]');
      expect(checkbox).not.toBeNull();
    });

    it('the worn control has an aria-label referencing the trapping name (Req 8.2)', () => {
      renderCharPage();

      // Label references the specific trapping name ("Cloak").
      const label = screen.getByLabelText(wornLabelFor('Cloak'));
      expect(label).toHaveAttribute('aria-label', wornLabelFor('Cloak'));
    });

    it('the worn checkbox is unchecked when worn is falsy (Req 8.3)', () => {
      renderCharPage();

      const checkbox = screen.getByRole('checkbox', {
        name: wornLabelFor('Cloak'),
      }) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('the worn checkbox is checked when worn is true (Req 8.3)', () => {
      renderCharPage({
        trappings: [
          { name: 'Cloak', enc: '1', quantity: 1, worn: true },
          { name: 'Backpack', enc: '2', quantity: 1 },
        ],
      });

      const checkbox = screen.getByRole('checkbox', {
        name: wornLabelFor('Cloak'),
      }) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  // ─── Req 3.1, 3.2: Toggle behaviour ────────────────────────────────────────

  describe('Toggle behaviour (Req 3.1, 3.2)', () => {
    it('clicking the worn toggle on an unworn trapping sets worn=true via the update path (Req 3.1)', () => {
      const { updateCharacter, char } = renderCharPage();

      const checkbox = screen.getByRole('checkbox', { name: wornLabelFor('Cloak') });
      fireEvent.click(checkbox);

      expect(updateCharacter).toHaveBeenCalled();
      // The handler passes a mutator function to updateCharacter.
      const mutator = updateCharacter.mock.calls.at(-1)![0] as (c: Character) => Character;
      expect(typeof mutator).toBe('function');

      const result = mutator(char);
      expect(result.trappings[0].worn).toBe(true);
    });

    it('clicking the worn toggle on a worn trapping sets worn=false via the update path (Req 3.2)', () => {
      const { updateCharacter, char } = renderCharPage({
        trappings: [
          { name: 'Cloak', enc: '1', quantity: 1, worn: true },
          { name: 'Backpack', enc: '2', quantity: 1 },
        ],
      });

      const checkbox = screen.getByRole('checkbox', { name: wornLabelFor('Cloak') });
      fireEvent.click(checkbox);

      expect(updateCharacter).toHaveBeenCalled();
      const mutator = updateCharacter.mock.calls.at(-1)![0] as (c: Character) => Character;
      const result = mutator(char);
      expect(result.trappings[0].worn).toBe(false);
    });
  });

  // ─── Req 6.1, 6.2: Mutual exclusivity via UI ───────────────────────────────

  describe('Worn and stored-on-horse mutual exclusivity via UI (Req 6.1, 6.2)', () => {
    it('checking worn clears storedOnHorse (Req 6.1)', () => {
      const { updateCharacter, char } = renderCharPage({
        trappings: [
          { name: 'Cloak', enc: '1', quantity: 1, storedOnHorse: true },
          { name: 'Backpack', enc: '2', quantity: 1 },
        ],
      });

      const wornCheckbox = screen.getByRole('checkbox', { name: wornLabelFor('Cloak') });
      fireEvent.click(wornCheckbox);

      const mutator = updateCharacter.mock.calls.at(-1)![0] as (c: Character) => Character;
      const result = mutator(char);
      expect(result.trappings[0].worn).toBe(true);
      expect(result.trappings[0].storedOnHorse).toBe(false);
    });

    it('checking stored-on-horse clears worn (Req 6.2)', () => {
      const { updateCharacter, char } = renderCharPage({
        trappings: [
          { name: 'Cloak', enc: '1', quantity: 1, worn: true },
          { name: 'Backpack', enc: '2', quantity: 1 },
        ],
      });

      // The Cloak's horse checkbox is one of the "Stored on horse" checkboxes.
      const horseCheckboxes = screen.getAllByRole('checkbox', {
        name: /stored on horse/i,
      });
      // The first trapping card is the Cloak.
      fireEvent.click(horseCheckboxes[0]);

      const mutator = updateCharacter.mock.calls.at(-1)![0] as (c: Character) => Character;
      const result = mutator(char);
      expect(result.trappings[0].storedOnHorse).toBe(true);
      expect(result.trappings[0].worn).toBe(false);
    });
  });
});
