import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPage } from '../../pages/SettingsPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints, CharacterSummary } from '../../../types/character';
import type { UseCharacterManagerResult } from '../../../hooks/useCharacterManager';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function makeManager(chars: CharacterSummary[] = [], activeId = 'id-1'): UseCharacterManagerResult {
  return {
    characters: chars,
    activeId,
    activeCharacter: makeCharacter({ name: 'Test' }),
    createCharacter: vi.fn(() => 'new-id'),
    switchCharacter: vi.fn(),
    renameCharacter: vi.fn(),
    duplicateCharacter: vi.fn(() => 'dup-id'),
    deleteCharacter: vi.fn(() => true),
    refresh: vi.fn(),
  };
}

describe('SettingsPage', () => {
  // Property 20: Clear sheet resets to defaults
  // Validates: Requirements 7.8

  describe('Property 20: Clear sheet resets to defaults', () => {
    it('clearing the sheet resets character data to BLANK_CHARACTER defaults while preserving name', () => {
      const char = makeCharacter({
        name: 'Sigmar',
        species: 'Dwarf',
        career: 'Warrior',
        xpCur: 500,
        fate: 3,
        resilience: 2,
        talents: [{ n: 'Hardy', lvl: 1, desc: 'test' }],
        weapons: [{ name: 'Sword', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '—' }],
      });
      let captured: Character = char;
      const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
        captured = mutator(structuredClone(captured));
      });

      const manager = makeManager([
        { id: 'id-1', name: 'Sigmar', species: 'Dwarf', career: 'Warrior', careerLevel: 'Level 1', lastModified: Date.now() },
      ]);

      render(
        <SettingsPage
          character={char}
          update={vi.fn()}
          updateCharacter={updateCharacter}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
          manager={manager}
        />
      );

      // Click Clear Sheet
      fireEvent.click(screen.getByText('Clear Sheet'));

      // Confirm
      fireEvent.click(screen.getByText('Clear'));

      expect(updateCharacter).toHaveBeenCalled();
      // Name should be preserved
      expect(captured.name).toBe('Sigmar');
      // Everything else should be defaults
      expect(captured.species).toBe('');
      expect(captured.career).toBe('');
      expect(captured.xpCur).toBe(0);
      expect(captured.fate).toBe(0);
      expect(captured.resilience).toBe(0);
      expect(captured.talents).toHaveLength(0);
      expect(captured.weapons).toHaveLength(0);
    });
  });

  describe('Character list rendering', () => {
    it('renders all characters in the list', () => {
      const chars: CharacterSummary[] = [
        { id: 'id-1', name: 'Sigmar', species: 'Human', career: 'Warrior', careerLevel: 'Soldier', lastModified: Date.now() },
        { id: 'id-2', name: 'Gotrek', species: 'Dwarf', career: 'Slayer', careerLevel: 'Troll Slayer', lastModified: Date.now() },
      ];
      const manager = makeManager(chars, 'id-1');

      render(
        <SettingsPage
          character={makeCharacter({ name: 'Sigmar' })}
          update={vi.fn()}
          updateCharacter={vi.fn()}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
          manager={manager}
        />
      );

      expect(screen.getByText('Sigmar')).toBeTruthy();
      expect(screen.getByText('Gotrek')).toBeTruthy();
    });
  });

  describe('Create/Rename/Delete flows', () => {
    it('create flow calls manager.createCharacter', () => {
      const manager = makeManager([
        { id: 'id-1', name: 'Test', species: '', career: '', careerLevel: '', lastModified: Date.now() },
      ]);

      render(
        <SettingsPage
          character={makeCharacter({ name: 'Test' })}
          update={vi.fn()}
          updateCharacter={vi.fn()}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
          manager={manager}
        />
      );

      // Click New button — should open the Character Creation Wizard
      fireEvent.click(screen.getByText('New'));

      // Wizard should be visible with its title
      expect(screen.getByText('⚔ Character Creation Wizard')).toBeTruthy();
    });

    it('delete flow calls manager.deleteCharacter after confirmation', () => {
      const chars: CharacterSummary[] = [
        { id: 'id-1', name: 'Sigmar', species: '', career: '', careerLevel: '', lastModified: Date.now() },
        { id: 'id-2', name: 'Gotrek', species: '', career: '', careerLevel: '', lastModified: Date.now() },
      ];
      const manager = makeManager(chars, 'id-1');

      render(
        <SettingsPage
          character={makeCharacter({ name: 'Sigmar' })}
          update={vi.fn()}
          updateCharacter={vi.fn()}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
          manager={manager}
        />
      );

      // Click Del on second character
      const delButtons = screen.getAllByText('Del');
      fireEvent.click(delButtons[1]);

      // Confirm
      fireEvent.click(screen.getByText('Delete'));

      expect(manager.deleteCharacter).toHaveBeenCalledWith('id-2');
    });

    it('rename flow calls manager.renameCharacter', () => {
      const chars: CharacterSummary[] = [
        { id: 'id-1', name: 'Sigmar', species: '', career: '', careerLevel: '', lastModified: Date.now() },
      ];
      const manager = makeManager(chars, 'id-1');

      render(
        <SettingsPage
          character={makeCharacter({ name: 'Sigmar' })}
          update={vi.fn()}
          updateCharacter={vi.fn()}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
          manager={manager}
        />
      );

      // Click Rename
      fireEvent.click(screen.getByText('Rename'));

      // Type new name and save
      const input = screen.getByDisplayValue('Sigmar');
      fireEvent.change(input, { target: { value: 'Karl Franz' } });
      fireEvent.click(screen.getByText('Save'));

      expect(manager.renameCharacter).toHaveBeenCalledWith('id-1', 'Karl Franz');
    });
  });
});
