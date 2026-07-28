import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPage } from '../../pages/SettingsPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

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

      render(
        <SettingsPage
          character={char}
          characterId="test-char-1"
          update={vi.fn()}
          updateCharacter={updateCharacter}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
        />
      );

      // Expand Danger Zone to access Clear Sheet
      fireEvent.click(screen.getByRole('button', { name: /danger zone/i }));

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

  describe('Export/Import rendering', () => {
    it('renders export dropdown button and import button', () => {
      render(
        <SettingsPage
          character={makeCharacter({ name: 'Test' })}
          characterId="test-char-2"
          update={vi.fn()}
          updateCharacter={vi.fn()}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
        />
      );

      // Export dropdown button visible
      const exportBtn = screen.getByRole('button', { name: /export/i });
      expect(exportBtn).toBeTruthy();
      expect(screen.getByText('Import from File')).toBeTruthy();

      // Options hidden until dropdown opened
      expect(screen.queryByText('Copy to Clipboard')).toBeNull();
      expect(screen.queryByText('Download File')).toBeNull();

      // Open dropdown
      fireEvent.click(exportBtn);

      // Now options are visible
      expect(screen.getByText('Copy to Clipboard')).toBeTruthy();
      expect(screen.getByText('Download File')).toBeTruthy();
    });
  });

  describe('Utilities rendering', () => {
    it('renders Print button and Clear Sheet inside collapsed Danger Zone', () => {
      // Ensure no persisted state interferes with defaultExpanded
      localStorage.removeItem('collapsible-danger-zone');

      render(
        <SettingsPage
          character={makeCharacter({ name: 'Test' })}
          characterId="test-char-3"
          update={vi.fn()}
          updateCharacter={vi.fn()}
          totalWounds={10}
          armourPoints={defaultAP}
          maxEncumbrance={5}
          coinWeight={0}
        />
      );

      expect(screen.getByText('Print')).toBeTruthy();

      // Clear Sheet is inside collapsed Danger Zone
      const dangerHeader = screen.getByRole('button', { name: /danger zone/i });
      expect(dangerHeader).toBeTruthy();
      expect(dangerHeader).toHaveAttribute('aria-expanded', 'false');

      // Expand Danger Zone to access Clear Sheet
      fireEvent.click(dangerHeader);
      expect(screen.getByText('Clear Sheet')).toBeTruthy();
    });
  });
});
