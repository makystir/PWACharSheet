import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCharPage(char: Character, props: { maxEncumbrance?: number; coinWeight?: number } = {}) {
  return render(
    <CharacterPage
      character={char}
      characterId="test-id"
      update={vi.fn()}
      updateCharacter={vi.fn()}
      totalWounds={10}
      armourPoints={defaultAP}
      maxEncumbrance={props.maxEncumbrance ?? 5}
      coinWeight={props.coinWeight ?? 0}
    />
  );
}

describe('CalculatedTooltips integration', () => {
  // Requirements: 1.1, 1.3, 2.1, 2.3, 3.1, 3.4, 4.1, 4.4, 6.3, 6.4

  describe('Skill Total Tooltip (Req 1.1, 1.3)', () => {
    const charWithSkills = makeCharacter({
      chars: {
        WS: { i: 30, a: 5, b: 0 },
        BS: { i: 25, a: 0, b: 0 },
        S: { i: 40, a: 0, b: 0 },
        T: { i: 35, a: 0, b: 0 },
        I: { i: 30, a: 0, b: 0 },
        Ag: { i: 30, a: 0, b: 0 },
        Dex: { i: 30, a: 0, b: 0 },
        Int: { i: 30, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
        Fel: { i: 30, a: 0, b: 0 },
      },
      bSkills: [
        { n: 'Athletics', c: 'Ag', a: 10 },
        { n: 'Cool', c: 'WP', a: 5 },
      ],
    });

    it('click skill total → tooltip shows breakdown → press Escape → closes', () => {
      renderCharPage(charWithSkills);

      // Switch to Abilities tab where skills are shown
      const abilitiesTab = screen.getByRole('tab', { name: /abilities/i });
      fireEvent.click(abilitiesTab);

      // Find the Athletics skill total cell by its aria-label
      const athleticsCell = screen.getByLabelText('Skill total breakdown for Athletics');
      expect(athleticsCell).toBeInTheDocument();

      // Click opens tooltip
      fireEvent.click(athleticsCell);

      // Tooltip should show breakdown: Agility 30 + Advances 10 = 40
      const tooltip = document.getElementById('tooltip-breakdown-skill-0');
      expect(tooltip).not.toBeNull();
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      expect(tooltip!.textContent).toContain('Agility');
      expect(tooltip!.textContent).toContain('30');
      expect(tooltip!.textContent).toContain('10');
      expect(tooltip!.textContent).toContain('40');

      // Press Escape closes tooltip
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(document.getElementById('tooltip-breakdown-skill-0')).toBeNull();
    });
  });

  describe('CB Cell Tooltip (Req 2.1, 2.3)', () => {
    const charWithCB = makeCharacter({
      chars: {
        WS: { i: 30, a: 13, b: 0 },
        BS: { i: 25, a: 0, b: 0 },
        S: { i: 40, a: 0, b: 0 },
        T: { i: 35, a: 0, b: 0 },
        I: { i: 30, a: 0, b: 0 },
        Ag: { i: 30, a: 0, b: 0 },
        Dex: { i: 30, a: 0, b: 0 },
        Int: { i: 30, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
        Fel: { i: 30, a: 0, b: 0 },
      },
    });

    it('click CB cell → tooltip shows current value and bonus', () => {
      renderCharPage(charWithCB);

      // CB cells are in the Identity tab — switch to it explicitly
      const identityTab = screen.getByRole('tab', { name: /identity/i });
      fireEvent.click(identityTab);

      const cbCell = screen.getByLabelText('CB breakdown for Weapon Skill');
      expect(cbCell).toBeInTheDocument();
      // WS current = 30 + 13 + 0 = 43, CB = floor(43/10) = 4
      expect(cbCell.textContent).toBe('4');

      // Click opens tooltip
      fireEvent.click(cbCell);

      const tooltip = document.getElementById('tooltip-breakdown-cb-WS');
      expect(tooltip).not.toBeNull();
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      // Should show Current: 43 and CB: 4
      expect(tooltip!.textContent).toContain('43');
      expect(tooltip!.textContent).toContain('4');

      // Press Escape closes tooltip
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(document.getElementById('tooltip-breakdown-cb-WS')).toBeNull();
    });
  });

  describe('Encumbrance Tooltip (Req 3.1, 3.4)', () => {
    const charWithTalents = makeCharacter({
      chars: {
        WS: { i: 30, a: 0, b: 0 },
        BS: { i: 25, a: 0, b: 0 },
        S: { i: 40, a: 0, b: 0 },
        T: { i: 35, a: 0, b: 0 },
        I: { i: 30, a: 0, b: 0 },
        Ag: { i: 30, a: 0, b: 0 },
        Dex: { i: 30, a: 0, b: 0 },
        Int: { i: 30, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
        Fel: { i: 30, a: 0, b: 0 },
      },
      talents: [{ n: 'Strong Back', lvl: 2, desc: '' }],
    });

    it('click encumbrance → shows SB + TB + talent contributions', () => {
      renderCharPage(charWithTalents);

      // Switch to Gear & Wealth tab
      const gearTab = screen.getByRole('tab', { name: /gear/i });
      fireEvent.click(gearTab);

      const encCell = screen.getByLabelText('Max encumbrance breakdown');
      expect(encCell).toBeInTheDocument();

      // Click opens tooltip
      fireEvent.click(encCell);

      const tooltip = document.getElementById('tooltip-breakdown-encumbrance');
      expect(tooltip).not.toBeNull();
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      // SB = floor(40/10) = 4, TB = floor(35/10) = 3, Strong Back +2
      expect(tooltip!.textContent).toContain('SB');
      expect(tooltip!.textContent).toContain('4');
      expect(tooltip!.textContent).toContain('TB');
      expect(tooltip!.textContent).toContain('3');
      expect(tooltip!.textContent).toContain('Strong Back');
      expect(tooltip!.textContent).toContain('+2');

      // Press Escape closes tooltip
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(document.getElementById('tooltip-breakdown-encumbrance')).toBeNull();
    });
  });

  describe('Coin Weight Tooltip (Req 4.1, 4.4)', () => {
    it('click coin weight → shows coin formula', () => {
      const charWithCoins = makeCharacter({
        chars: {
          WS: { i: 30, a: 0, b: 0 },
          BS: { i: 25, a: 0, b: 0 },
          S: { i: 40, a: 0, b: 0 },
          T: { i: 35, a: 0, b: 0 },
          I: { i: 30, a: 0, b: 0 },
          Ag: { i: 30, a: 0, b: 0 },
          Dex: { i: 30, a: 0, b: 0 },
          Int: { i: 30, a: 0, b: 0 },
          WP: { i: 30, a: 0, b: 0 },
          Fel: { i: 30, a: 0, b: 0 },
        },
        wGC: 100,
        wSS: 50,
        wD: 50,
      });

      renderCharPage(charWithCoins, { coinWeight: 1 });

      // Switch to Gear & Wealth tab
      const gearTab = screen.getByRole('tab', { name: /gear/i });
      fireEvent.click(gearTab);

      const coinCell = screen.getByLabelText('Coin weight breakdown');
      expect(coinCell).toBeInTheDocument();

      // Click opens tooltip
      fireEvent.click(coinCell);

      const tooltip = document.getElementById('tooltip-breakdown-coinWeight');
      expect(tooltip).not.toBeNull();
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      // Should show formula: GC 100, SS 50, D 50, Sum 200, ÷ 200, Weight 1
      expect(tooltip!.textContent).toContain('GC');
      expect(tooltip!.textContent).toContain('100');
      expect(tooltip!.textContent).toContain('SS');
      expect(tooltip!.textContent).toContain('50');
      expect(tooltip!.textContent).toContain('200');

      // Press Escape closes tooltip
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(document.getElementById('tooltip-breakdown-coinWeight')).toBeNull();
    });

    it('click coin weight with no coins → shows "No coins carried"', () => {
      const charNoCoins = makeCharacter({
        chars: {
          WS: { i: 30, a: 0, b: 0 },
          BS: { i: 25, a: 0, b: 0 },
          S: { i: 40, a: 0, b: 0 },
          T: { i: 35, a: 0, b: 0 },
          I: { i: 30, a: 0, b: 0 },
          Ag: { i: 30, a: 0, b: 0 },
          Dex: { i: 30, a: 0, b: 0 },
          Int: { i: 30, a: 0, b: 0 },
          WP: { i: 30, a: 0, b: 0 },
          Fel: { i: 30, a: 0, b: 0 },
        },
        wGC: 0,
        wSS: 0,
        wD: 0,
      });

      renderCharPage(charNoCoins);

      // Switch to Gear & Wealth tab
      const gearTab = screen.getByRole('tab', { name: /gear/i });
      fireEvent.click(gearTab);

      const coinCell = screen.getByLabelText('Coin weight breakdown');
      fireEvent.click(coinCell);

      const tooltip = document.getElementById('tooltip-breakdown-coinWeight');
      expect(tooltip).not.toBeNull();
      expect(tooltip!.textContent).toContain('No coins carried');

      // Press Escape closes tooltip
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(document.getElementById('tooltip-breakdown-coinWeight')).toBeNull();
    });
  });

  describe('Single-Tooltip Constraint (Req 6.3)', () => {
    const charForSingle = makeCharacter({
      chars: {
        WS: { i: 30, a: 5, b: 0 },
        BS: { i: 25, a: 0, b: 0 },
        S: { i: 40, a: 0, b: 0 },
        T: { i: 35, a: 0, b: 0 },
        I: { i: 30, a: 0, b: 0 },
        Ag: { i: 30, a: 0, b: 0 },
        Dex: { i: 30, a: 0, b: 0 },
        Int: { i: 30, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
        Fel: { i: 30, a: 0, b: 0 },
      },
      bSkills: [
        { n: 'Athletics', c: 'Ag', a: 10 },
      ],
    });

    it('opening skill tooltip then clicking CB cell dismisses skill tooltip', () => {
      renderCharPage(charForSingle);

      // First open a skill tooltip (Abilities tab)
      const abilitiesTab = screen.getByRole('tab', { name: /abilities/i });
      fireEvent.click(abilitiesTab);

      const athleticsCell = screen.getByLabelText('Skill total breakdown for Athletics');
      fireEvent.click(athleticsCell);

      // Skill tooltip should be open
      expect(document.getElementById('tooltip-breakdown-skill-0')).not.toBeNull();

      // Now switch to identity tab and click a CB cell
      const identityTab = screen.getByRole('tab', { name: /identity/i });
      fireEvent.click(identityTab);

      const cbCell = screen.getByLabelText('CB breakdown for Weapon Skill');
      fireEvent.click(cbCell);

      // Skill tooltip should be dismissed, CB tooltip should be open
      expect(document.getElementById('tooltip-breakdown-skill-0')).toBeNull();
      expect(document.getElementById('tooltip-breakdown-cb-WS')).not.toBeNull();
    });
  });

  describe('Keyboard Navigation (Req 6.4)', () => {
    const charForKeyboard = makeCharacter({
      chars: {
        WS: { i: 30, a: 13, b: 0 },
        BS: { i: 25, a: 0, b: 0 },
        S: { i: 40, a: 0, b: 0 },
        T: { i: 35, a: 0, b: 0 },
        I: { i: 30, a: 0, b: 0 },
        Ag: { i: 30, a: 0, b: 0 },
        Dex: { i: 30, a: 0, b: 0 },
        Int: { i: 30, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
        Fel: { i: 30, a: 0, b: 0 },
      },
      bSkills: [
        { n: 'Athletics', c: 'Ag', a: 5 },
      ],
    });

    it('Enter key activates CB tooltip', () => {
      renderCharPage(charForKeyboard);

      // Switch to Identity tab where CB cells are
      const identityTab = screen.getByRole('tab', { name: /identity/i });
      fireEvent.click(identityTab);

      const cbCell = screen.getByLabelText('CB breakdown for Weapon Skill');

      // Press Enter to open
      fireEvent.keyDown(cbCell, { key: 'Enter' });

      const tooltip = document.getElementById('tooltip-breakdown-cb-WS');
      expect(tooltip).not.toBeNull();
      expect(tooltip).toHaveAttribute('role', 'tooltip');
    });

    it('Space key activates skill tooltip', () => {
      renderCharPage(charForKeyboard);

      // Switch to Abilities tab
      const abilitiesTab = screen.getByRole('tab', { name: /abilities/i });
      fireEvent.click(abilitiesTab);

      const athleticsCell = screen.getByLabelText('Skill total breakdown for Athletics');

      // Press Space to open
      fireEvent.keyDown(athleticsCell, { key: ' ' });

      const tooltip = document.getElementById('tooltip-breakdown-skill-0');
      expect(tooltip).not.toBeNull();
      expect(tooltip).toHaveAttribute('role', 'tooltip');
    });
  });
});
