import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Compact mode unit tests for CharacterPage.
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 *
 * Tests the toggle control, compact mode summary rendering,
 * expanded mode full details rendering, and localStorage persistence.
 */

const STORAGE_KEY = 'wfrp-display-mode';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCharPage(overrides: Partial<Character> = {}) {
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
      subTab="identity"
      onSubTabChange={vi.fn()}
    />
  );
}

describe('CharacterPage compact mode (Req 9.1, 9.2, 9.3, 9.4)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ─── Requirement 9.1: Toggle switches between modes ───

  describe('toggle control (Req 9.1)', () => {
    it('renders a toggle button in expanded mode by default', () => {
      renderCharPage();
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute('aria-pressed', 'false');
    });

    it('switches to compact mode when toggle is clicked', () => {
      renderCharPage({ name: 'Brunhilde', species: 'Human', career: 'Soldier' });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });

      fireEvent.click(btn);

      // After clicking, the button should now indicate compact mode is active
      const compactBtn = screen.getByRole('button', { name: /switch to expanded view/i });
      expect(compactBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('switches back to expanded mode when toggle is clicked again', () => {
      renderCharPage({ name: 'Brunhilde' });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });

      // Click to compact
      fireEvent.click(btn);
      // Click to expand
      const compactBtn = screen.getByRole('button', { name: /switch to expanded view/i });
      fireEvent.click(compactBtn);

      // Should be back to expanded
      const expandedBtn = screen.getByRole('button', { name: /switch to compact view/i });
      expect(expandedBtn).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ─── Requirement 9.2: Compact mode renders only summary fields ───

  describe('compact mode renders summary (Req 9.2)', () => {
    it('displays character name in compact summary', () => {
      const { container } = renderCharPage({ name: 'Sigmar Heldenhammer' });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      const compactName = container.querySelector('[class*="compactName"]');
      expect(compactName).toBeInTheDocument();
      expect(compactName).toHaveTextContent('Sigmar Heldenhammer');
    });

    it('displays species and career in compact mode', () => {
      const { container } = renderCharPage({ name: 'Franz', species: 'Human', career: 'Witch Hunter' });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      const compactMeta = container.querySelector('[class*="compactMeta"]');
      expect(compactMeta).toHaveTextContent('Human · Witch Hunter');
    });

    it('displays wounds in compact mode', () => {
      const { container } = renderCharPage({ name: 'Franz', wCur: 8 });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      const compactWounds = container.querySelector('[class*="compactWounds"]');
      expect(compactWounds).toBeInTheDocument();
      expect(compactWounds).toHaveTextContent(/Wounds:.*8/);
    });

    it('displays characteristic values in compact mode', () => {
      const char: Partial<Character> = {
        name: 'Test',
        chars: {
          ...BLANK_CHARACTER.chars,
          WS: { i: 30, a: 5, b: 0 },
          BS: { i: 25, a: 0, b: 0 },
        },
      };
      const { container } = renderCharPage(char);
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      // Query within the compact chars row
      const compactChars = container.querySelector('[class*="compactChars"]');
      expect(compactChars).toBeInTheDocument();

      // Check cells contain the labels and values
      const cells = compactChars!.querySelectorAll('[class*="compactCharCell"]');
      expect(cells.length).toBe(10); // All 10 characteristics

      // First cell should be WS with value 35
      const wsLabel = cells[0].querySelector('[class*="compactCharLabel"]');
      const wsValue = cells[0].querySelector('[class*="compactCharValue"]');
      expect(wsLabel).toHaveTextContent('WS');
      expect(wsValue).toHaveTextContent('35');

      // Second cell should be BS with value 25
      const bsLabel = cells[1].querySelector('[class*="compactCharLabel"]');
      const bsValue = cells[1].querySelector('[class*="compactCharValue"]');
      expect(bsLabel).toHaveTextContent('BS');
      expect(bsValue).toHaveTextContent('25');
    });

    it('displays equipped weapons in compact mode', () => {
      const { container } = renderCharPage({
        name: 'Test',
        weapons: [
          { name: 'Sword', group: 'Basic', damage: '+SB+4', range: '', qualities: '', flaws: '', equipped: true, encumbrance: 1 },
          { name: 'Dagger', group: 'Basic', damage: '+SB+1', range: '', qualities: '', flaws: '', equipped: true, encumbrance: 0 },
          { name: 'Bow', group: 'Basic', damage: '+SB+3', range: '20/40', qualities: '', flaws: '', equipped: false, encumbrance: 1 },
        ],
      });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      // Should show equipped weapons (Sword, Dagger) but not unequipped (Bow)
      const compactWeapons = container.querySelector('[class*="compactWeapons"]');
      expect(compactWeapons).toBeInTheDocument();
      expect(compactWeapons).toHaveTextContent('Sword, Dagger');
    });

    it('shows "(Unnamed)" when character name is empty in compact mode', () => {
      const { container } = renderCharPage({ name: '' });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      const compactName = container.querySelector('[class*="compactName"]');
      expect(compactName).toHaveTextContent('(Unnamed)');
    });
  });

  // ─── Requirement 9.3: Expanded mode renders full details ───

  describe('expanded mode renders full details (Req 9.3)', () => {
    it('shows expanded content wrapper with data-expanded="true" by default', () => {
      const { container } = renderCharPage({ name: 'Brunhilde' });
      const expandedDiv = container.querySelector('[class*="expandedContent"][data-expanded="true"]');
      expect(expandedDiv).toBeInTheDocument();
    });

    it('hides expanded content when in compact mode (data-expanded="false")', () => {
      const { container } = renderCharPage({ name: 'Brunhilde' });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      const expandedDiv = container.querySelector('[class*="expandedContent"][data-expanded="false"]');
      expect(expandedDiv).toBeInTheDocument();
      // Confirm the expanded version of the content wrapper is no longer present
      expect(container.querySelector('[class*="expandedContent"][data-expanded="true"]')).not.toBeInTheDocument();
    });

    it('does not render compact summary when in expanded mode', () => {
      const { container } = renderCharPage({ name: 'Brunhilde' });
      // compactSummary should not be in the DOM when expanded
      const compactSummary = container.querySelector('[class*="compactSummary"]');
      expect(compactSummary).not.toBeInTheDocument();
    });

    it('renders compact summary when toggled to compact mode', () => {
      const { container } = renderCharPage({ name: 'Brunhilde' });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      const compactSummary = container.querySelector('[class*="compactSummary"]');
      expect(compactSummary).toBeInTheDocument();
    });
  });

  // ─── Requirement 9.4: localStorage persistence and restoration ───

  describe('localStorage persistence (Req 9.4)', () => {
    it('persists compact mode to localStorage when toggled', () => {
      renderCharPage({ name: 'Test' });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      expect(localStorage.getItem(STORAGE_KEY)).toBe('compact');
    });

    it('persists expanded mode to localStorage when toggled back', () => {
      renderCharPage({ name: 'Test' });
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      fireEvent.click(btn);

      const compactBtn = screen.getByRole('button', { name: /switch to expanded view/i });
      fireEvent.click(compactBtn);

      expect(localStorage.getItem(STORAGE_KEY)).toBe('expanded');
    });

    it('restores compact mode from localStorage on mount', () => {
      localStorage.setItem(STORAGE_KEY, 'compact');
      const { container } = renderCharPage({ name: 'Restored Character', species: 'Dwarf', career: 'Slayer' });

      // Should render in compact mode — toggle button shows "Expand"
      const btn = screen.getByRole('button', { name: /switch to expanded view/i });
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      // Compact summary should be visible with character details
      const compactName = container.querySelector('[class*="compactName"]');
      expect(compactName).toHaveTextContent('Restored Character');
      const compactMeta = container.querySelector('[class*="compactMeta"]');
      expect(compactMeta).toHaveTextContent('Dwarf · Slayer');
    });

    it('restores expanded mode from localStorage on mount', () => {
      localStorage.setItem(STORAGE_KEY, 'expanded');
      const { container } = renderCharPage({ name: 'Test' });

      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      expect(btn).toHaveAttribute('aria-pressed', 'false');
      expect(container.querySelector('[data-expanded="true"]')).toBeInTheDocument();
    });

    it('defaults to expanded mode when localStorage has no value', () => {
      // localStorage is already cleared in beforeEach
      const { container } = renderCharPage({ name: 'Test' });

      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      expect(btn).toHaveAttribute('aria-pressed', 'false');
      expect(container.querySelector('[data-expanded="true"]')).toBeInTheDocument();
    });

    it('defaults to expanded mode when localStorage has an invalid value', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-value');
      const { container } = renderCharPage({ name: 'Test' });

      // Should fall back to expanded
      const btn = screen.getByRole('button', { name: /switch to compact view/i });
      expect(btn).toHaveAttribute('aria-pressed', 'false');
      expect(container.querySelector('[data-expanded="true"]')).toBeInTheDocument();
    });
  });
});
