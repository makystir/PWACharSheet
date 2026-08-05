import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Contextual visibility tests for CharacterPage.
 * Validates: Requirements 8.5, 8.6, 14.2, 14.4
 *
 * Strategy: Render CharacterPage with specific character state and assert
 * that species-specific panels and sub-tab-specific sections are conditionally
 * rendered (zero DOM output when not applicable).
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCharPage(overrides: Partial<Character> = {}, subTab?: string) {
  const char = makeCharacter(overrides);
  return render(
    <CharacterPage
      character={char}
      characterId="test-char-1"
      update={vi.fn()}
      updateCharacter={vi.fn()}
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
}

describe('CharacterPage contextual visibility', () => {
  // ─── Requirement 8.5: GrudgePanel renders nothing when species ≠ Dwarf ───

  describe('GrudgePanel conditional rendering (Req 8.5)', () => {
    it('renders GrudgePanel when species is Dwarf', () => {
      renderCharPage({ species: 'Dwarf', houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: true } });
      expect(screen.getByText('Grudge Book')).toBeInTheDocument();
    });

    it('renders nothing for GrudgePanel when species is Human', () => {
      renderCharPage({ species: 'Human', houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: true } });
      expect(screen.queryByText('Grudge Book')).not.toBeInTheDocument();
    });

    it('renders nothing for GrudgePanel when species is Elf', () => {
      renderCharPage({ species: 'High Elf', houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: true } });
      expect(screen.queryByText('Grudge Book')).not.toBeInTheDocument();
    });

    it('renders nothing for GrudgePanel when species is Halfling', () => {
      renderCharPage({ species: 'Halfling', houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: true } });
      expect(screen.queryByText('Grudge Book')).not.toBeInTheDocument();
    });

    it('renders GrudgePanel for species variants containing "Dwarf"', () => {
      renderCharPage({ species: 'Norse Dwarf', houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: true } });
      expect(screen.getByText('Grudge Book')).toBeInTheDocument();
    });
  });

  // ─── Requirement 8.6: YenluiPanel renders nothing when species ≠ Elf or house rule disabled ───

  describe('YenluiPanel conditional rendering (Req 8.6)', () => {
    it('renders YenluiPanel when species is Elf and useYenlui enabled', () => {
      renderCharPage({ species: 'High Elf', houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true } });
      // Both CollapsibleSection title and panel label render "Yenlui Balance"
      expect(screen.getAllByText('Yenlui Balance').length).toBeGreaterThanOrEqual(1);
    });

    it('renders YenluiPanel for Wood Elf with useYenlui enabled', () => {
      renderCharPage({ species: 'Wood Elf', houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true } });
      expect(screen.getAllByText('Yenlui Balance').length).toBeGreaterThanOrEqual(1);
    });

    it('renders nothing for YenluiPanel when species is Human (even with useYenlui enabled)', () => {
      renderCharPage({ species: 'Human', houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true } });
      expect(screen.queryAllByText('Yenlui Balance')).toHaveLength(0);
    });

    it('renders nothing for YenluiPanel when species is Dwarf (even with useYenlui enabled)', () => {
      renderCharPage({ species: 'Dwarf', houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true } });
      expect(screen.queryAllByText('Yenlui Balance')).toHaveLength(0);
    });

    it('renders nothing for YenluiPanel when species is Elf but useYenlui is disabled', () => {
      renderCharPage({ species: 'High Elf', houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: false } });
      expect(screen.queryAllByText('Yenlui Balance')).toHaveLength(0);
    });

    it('renders nothing for YenluiPanel when both conditions fail (non-Elf + disabled)', () => {
      renderCharPage({ species: 'Human', houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: false } });
      expect(screen.queryAllByText('Yenlui Balance')).toHaveLength(0);
    });
  });

  // ─── Requirement 14.2: RollHistoryPanel hidden on non-Abilities sub-tabs ───

  describe('RollHistoryPanel sub-tab visibility (Req 14.2)', () => {
    it('renders RollHistoryPanel on the Abilities sub-tab', () => {
      renderCharPage({ species: 'Human' }, 'abilities');
      expect(screen.getByText(/Roll History/)).toBeInTheDocument();
    });

    it('does not render RollHistoryPanel on the Identity sub-tab', () => {
      renderCharPage({ species: 'Human' }, 'identity');
      expect(screen.queryByText(/Roll History/)).not.toBeInTheDocument();
    });

    it('does not render RollHistoryPanel on the Gear sub-tab', () => {
      renderCharPage({ species: 'Human' }, 'gear');
      expect(screen.queryByText(/Roll History/)).not.toBeInTheDocument();
    });

    it('does not render RollHistoryPanel on the Notes sub-tab', () => {
      renderCharPage({ species: 'Human' }, 'notes');
      expect(screen.queryByText(/Roll History/)).not.toBeInTheDocument();
    });

    it('shows RollHistoryPanel when switching from Identity to Abilities tab', () => {
      renderCharPage({ species: 'Human' }, 'identity');
      expect(screen.queryByText(/Roll History/)).not.toBeInTheDocument();

      // Click the Abilities tab
      const abilitiesTab = screen.getByRole('tab', { name: /abilities/i });
      fireEvent.click(abilitiesTab);

      expect(screen.getByText(/Roll History/)).toBeInTheDocument();
    });
  });

  // ─── Requirement 14.4: Wound Maximum Card only on Identity tab ───
  // With the desktop two-column layout (Req 22.1–22.5), the left column
  // (Identity content including Wound Maximum) is always rendered in the DOM
  // but hidden via CSS (mobileHidden class) on viewports below 1025px.
  // On desktop, both columns are always visible.

  describe('Wound Maximum Card sub-tab visibility (Req 14.4)', () => {
    it('renders Wound Maximum section on the Identity sub-tab', () => {
      renderCharPage({ species: 'Human' }, 'identity');
      // Both CollapsibleSection title and SectionHeader render "Wound Maximum"
      expect(screen.getAllByText('Wound Maximum').length).toBeGreaterThanOrEqual(1);
    });

    it('left column is hidden via CSS on the Abilities sub-tab (mobile)', () => {
      renderCharPage({ species: 'Human' }, 'abilities');
      // Wound Maximum is in the DOM (for desktop two-column layout) but its parent column has mobileHidden class
      const woundMaxElements = screen.queryAllByText('Wound Maximum');
      expect(woundMaxElements.length).toBeGreaterThanOrEqual(1);
      // The left column container has the mobileHidden class applied
      const leftColumn = woundMaxElements[0].closest('[class*="desktopGridLeft"]');
      expect(leftColumn?.className).toMatch(/mobileHidden/);
    });

    it('left column is hidden via CSS on the Gear sub-tab (mobile)', () => {
      renderCharPage({ species: 'Human' }, 'gear');
      const woundMaxElements = screen.queryAllByText('Wound Maximum');
      expect(woundMaxElements.length).toBeGreaterThanOrEqual(1);
      const leftColumn = woundMaxElements[0].closest('[class*="desktopGridLeft"]');
      expect(leftColumn?.className).toMatch(/mobileHidden/);
    });

    it('left column is hidden via CSS on the Notes sub-tab (mobile)', () => {
      renderCharPage({ species: 'Human' }, 'notes');
      const woundMaxElements = screen.queryAllByText('Wound Maximum');
      expect(woundMaxElements.length).toBeGreaterThanOrEqual(1);
      const leftColumn = woundMaxElements[0].closest('[class*="desktopGridLeft"]');
      expect(leftColumn?.className).toMatch(/mobileHidden/);
    });
  });
});
