import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CharacterPage } from '../../pages/CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

describe('CharacterPage', () => {
  // Property 4: CRUD operations on list-based fields
  // Validates: Requirements 3.5, 3.6, 3.7

  describe('Property 4: CRUD on advanced skills', () => {
    it('adding an advanced skill increases list length by 1', () => {
      const char = makeCharacter({ aSkills: [{ n: 'Lore (Magic)', c: 'Int', a: 5 }] });
      let captured: Character = char;
      const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
        captured = mutator(structuredClone(captured));
      });

      render(
        <CharacterPage
          character={captured}
          update={vi.fn()}
          updateCharacter={updateCharacter}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
        />
      );

      // Click the "Add from Rulebook" button in the Advanced Skills section to open picker
      const addFromRulebookButtons = screen.getAllByText('Add from Rulebook');
      fireEvent.click(addFromRulebookButtons[0]);

      // Select the first skill from the picker (Animal Care)
      fireEvent.click(screen.getByText('Animal Care (Int)'));

      expect(updateCharacter).toHaveBeenCalled();
      expect(captured.aSkills).toHaveLength(2);
      expect(captured.aSkills[1].n).toBe('Animal Care');
      expect(captured.aSkills[1].c).toBe('Int');
    });

    it('removing an advanced skill decreases list length by 1', () => {
      const char = makeCharacter({
        aSkills: [
          { n: 'Lore (Magic)', c: 'Int', a: 5 },
          { n: 'Ride (Horse)', c: 'Ag', a: 3 },
        ],
      });
      let captured: Character = char;
      const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
        captured = mutator(structuredClone(captured));
      });

      render(
        <CharacterPage
          character={char}
          update={vi.fn()}
          updateCharacter={updateCharacter}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
        />
      );

      // Click the first delete button (✕) in the advanced skills table
      const deleteButtons = screen.getAllByText('✕');
      fireEvent.click(deleteButtons[0]);

      // Confirm the deletion
      const confirmBtn = screen.getByText('Remove');
      fireEvent.click(confirmBtn);

      expect(captured.aSkills).toHaveLength(1);
    });
  });

  describe('Property 4: CRUD on talents', () => {
    it('adding a talent increases list length by 1', () => {
      const char = makeCharacter({ talents: [] });
      let captured: Character = char;
      const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
        captured = mutator(structuredClone(captured));
      });

      render(
        <CharacterPage
          character={char}
          update={vi.fn()}
          updateCharacter={updateCharacter}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
        />
      );

      // Click "Add Custom" for talents (second Add Custom button — first is advanced skills)
      const addCustomButtons = screen.getAllByText('Add Custom');
      fireEvent.click(addCustomButtons[1]);

      expect(captured.talents).toHaveLength(1);
      expect(captured.talents[0].n).toBe('');
    });
  });

  describe('Property 4: CRUD on spells', () => {
    it('removing a spell decreases list length by 1', () => {
      const char = makeCharacter({
        spells: [
          { name: 'Dart', cn: '0', range: 'WP yards', target: '1', duration: 'Instant', effect: 'Magic missile' },
          { name: 'Bolt', cn: '4', range: 'WP yards', target: '1', duration: 'Instant', effect: 'Magic missile Dmg +4' },
        ],
      });
      let captured: Character = char;
      const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
        captured = mutator(structuredClone(captured));
      });

      render(
        <CharacterPage
          character={char}
          update={vi.fn()}
          updateCharacter={updateCharacter}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
        />
      );

      // Click the last ✕ button (for spells section)
      const deleteButtons = screen.getAllByText('✕');
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      const confirmBtn = screen.getByText('Remove');
      fireEvent.click(confirmBtn);

      expect(captured.spells).toHaveLength(1);
    });
  });

  describe('Personal details rendering', () => {
    it('renders character name and species', () => {
      const char = makeCharacter({ name: 'Sigmar', species: 'Human / Reiklander' });

      render(
        <CharacterPage
          character={char}
          update={vi.fn()}
          updateCharacter={vi.fn()}
          totalWounds={12}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
        />
      );

      expect(screen.getByText('Sigmar')).toBeTruthy();
      expect(screen.getByText('Human / Reiklander')).toBeTruthy();
    });
  });

  describe('Characteristics table', () => {
    it('renders all 10 characteristics', () => {
      const char = makeCharacter();
      char.chars.WS = { i: 30, a: 5, b: 0 };
      char.chars.BS = { i: 25, a: 0, b: 0 };

      render(
        <CharacterPage
          character={char}
          update={vi.fn()}
          updateCharacter={vi.fn()}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
        />
      );

      // All 10 characteristic labels should be present
      for (const key of ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel']) {
        expect(screen.getAllByText(key).length).toBeGreaterThanOrEqual(1);
      }

      // WS current = 30 + 5 = 35
      expect(screen.getAllByText('35').length).toBeGreaterThanOrEqual(1);
      // Bonus column shows talent bonus (0 = "—" for no talent)
    });

  });
});
