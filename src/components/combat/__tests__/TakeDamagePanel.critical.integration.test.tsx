import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TakeDamagePanel } from '../TakeDamagePanel';
import type { TakeDamagePanelProps } from '../TakeDamagePanel';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDefaultProps(overrides: Partial<TakeDamagePanelProps> = {}): TakeDamagePanelProps {
  return {
    toughnessBonus: 3,
    armourPoints: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 },
    armourList: [],
    weapons: [],
    useCriticalDeflection: false,
    onArmourUpdate: vi.fn(),
    wCur: 10,
    totalWounds: 12,
    onApplyWounds: vi.fn(),
    min1Wound: true,
    onDown: vi.fn(),
    ...overrides,
  };
}

function setDamage(value: number) {
  const input = screen.getByLabelText('Incoming damage');
  fireEvent.change(input, { target: { value: String(value) } });
}

function setSL(value: number) {
  const input = screen.getByLabelText('Success Levels');
  fireEvent.change(input, { target: { value: String(value) } });
}

function getNetWounds(): number {
  return Number(screen.getByTestId('net-wounds').textContent);
}

// ─── Integration Tests: Critical Wound Excess Damage Modifier Flow ───────────

describe('Integration: TakeDamagePanel Critical Wound flow', () => {
  describe('Critical wound triggered with excess < TB → modifier is -20', () => {
    it('shows -20 modifier when excess damage is less than toughness bonus', () => {
      // wCur = 10, TB = 3, AP = 0
      // Damage = 14, SL = 0 → netWounds = 14 - 3(TB) - 0(AP) = 11
      // netWounds (11) >= wCur (10) → critical triggered
      // excess = 11 - 10 = 1, TB = 3, 1 < 3 → modifier = -20
      const props = makeDefaultProps({
        toughnessBonus: 3,
        wCur: 10,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(14);

      expect(getNetWounds()).toBe(11);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Excess Damage: 1');
      expect(notification).toHaveTextContent('TB: 3');
      expect(notification).toHaveTextContent('Critical table roll modifier: -20');
    });

    it('shows -20 modifier when excess is 0 (character exactly at 0 wounds) and TB > 0', () => {
      // wCur = 10, TB = 4, AP = 0
      // Damage = 14, SL = 0 → netWounds = 14 - 4(TB) - 0(AP) = 10
      // netWounds (10) >= wCur (10) → critical triggered
      // excess = 10 - 10 = 0, TB = 4, 0 < 4 → modifier = -20
      const props = makeDefaultProps({
        toughnessBonus: 4,
        wCur: 10,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(14);

      expect(getNetWounds()).toBe(10);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Excess Damage: 0');
      expect(notification).toHaveTextContent('TB: 4');
      expect(notification).toHaveTextContent('Critical table roll modifier: -20');
    });

    it('shows -20 modifier with SL contributing to damage', () => {
      // wCur = 8, TB = 3, AP = 0
      // Damage = 5, SL = 7 → totalIncoming = 12 → netWounds = 12 - 3(TB) - 0(AP) = 9
      // netWounds (9) >= wCur (8) → critical triggered
      // excess = 9 - 8 = 1, TB = 3, 1 < 3 → modifier = -20
      const props = makeDefaultProps({
        toughnessBonus: 3,
        wCur: 8,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(5);
      setSL(7);

      expect(getNetWounds()).toBe(9);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Excess Damage: 1');
      expect(notification).toHaveTextContent('TB: 3');
      expect(notification).toHaveTextContent('Critical table roll modifier: -20');
    });
  });

  describe('Critical wound triggered with excess >= TB → no modifier', () => {
    it('shows no modifier when excess damage equals toughness bonus', () => {
      // wCur = 10, TB = 3, AP = 0
      // Damage = 16, SL = 0 → netWounds = 16 - 3(TB) - 0(AP) = 13
      // netWounds (13) >= wCur (10) → critical triggered
      // excess = 13 - 10 = 3, TB = 3, 3 >= 3 → modifier = 0
      const props = makeDefaultProps({
        toughnessBonus: 3,
        wCur: 10,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(16);

      expect(getNetWounds()).toBe(13);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Excess Damage: 3');
      expect(notification).toHaveTextContent('TB: 3');
      expect(notification).toHaveTextContent('No modifier to Critical table roll');
    });

    it('shows no modifier when excess damage exceeds toughness bonus', () => {
      // wCur = 5, TB = 2, AP = 0
      // Damage = 12, SL = 0 → netWounds = 12 - 2(TB) - 0(AP) = 10
      // netWounds (10) >= wCur (5) → critical triggered
      // excess = 10 - 5 = 5, TB = 2, 5 >= 2 → modifier = 0
      const props = makeDefaultProps({
        toughnessBonus: 2,
        wCur: 5,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(12);

      expect(getNetWounds()).toBe(10);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Excess Damage: 5');
      expect(notification).toHaveTextContent('TB: 2');
      expect(notification).toHaveTextContent('No modifier to Critical table roll');
    });

    it('shows no modifier when TB is 0 and excess is 0', () => {
      // wCur = 5, TB = 0, AP = 0
      // Damage = 5, SL = 0 → netWounds = 5 - 0(TB) - 0(AP) = 5
      // netWounds (5) >= wCur (5) → critical triggered
      // excess = 5 - 5 = 0, TB = 0, 0 >= 0 → modifier = 0
      const props = makeDefaultProps({
        toughnessBonus: 0,
        wCur: 5,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(5);

      expect(getNetWounds()).toBe(5);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Excess Damage: 0');
      expect(notification).toHaveTextContent('TB: 0');
      expect(notification).toHaveTextContent('No modifier to Critical table roll');
    });

    it('shows no modifier with large excess damage from SL', () => {
      // wCur = 6, TB = 3, AP = 0
      // Damage = 10, SL = 5 → totalIncoming = 15 → netWounds = 15 - 3(TB) - 0(AP) = 12
      // netWounds (12) >= wCur (6) → critical triggered
      // excess = 12 - 6 = 6, TB = 3, 6 >= 3 → modifier = 0
      const props = makeDefaultProps({
        toughnessBonus: 3,
        wCur: 6,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(10);
      setSL(5);

      expect(getNetWounds()).toBe(12);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Excess Damage: 6');
      expect(notification).toHaveTextContent('TB: 3');
      expect(notification).toHaveTextContent('No modifier to Critical table roll');
    });
  });

  describe('No critical wound (netWounds < wCur) → notification not shown', () => {
    it('does not display critical notification when character stays above 0 wounds', () => {
      // wCur = 10, TB = 3, AP = 0
      // Damage = 8, SL = 0 → netWounds = 8 - 3(TB) - 0(AP) = 5
      // netWounds (5) < wCur (10) → no critical
      const props = makeDefaultProps({
        toughnessBonus: 3,
        wCur: 10,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(8);

      expect(getNetWounds()).toBe(5);
      expect(screen.queryByTestId('critical-wound-notification')).not.toBeInTheDocument();
    });

    it('does not display critical notification when damage is fully absorbed', () => {
      // wCur = 10, TB = 3, AP = 0
      // Damage = 2, SL = 0 → netWounds = max(0, 2 - 3) = 0
      // netWounds (0) → no critical
      const props = makeDefaultProps({
        toughnessBonus: 3,
        wCur: 10,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(2);

      expect(getNetWounds()).toBe(0);
      expect(screen.queryByTestId('critical-wound-notification')).not.toBeInTheDocument();
    });

    it('does not display critical notification when no damage is entered', () => {
      const props = makeDefaultProps({
        toughnessBonus: 3,
        wCur: 10,
      });

      render(<TakeDamagePanel {...props} />);

      expect(getNetWounds()).toBe(0);
      expect(screen.queryByTestId('critical-wound-notification')).not.toBeInTheDocument();
    });

    it('does not display critical notification when netWounds is 1 less than wCur', () => {
      // wCur = 10, TB = 3, AP = 0
      // Damage = 12, SL = 0 → netWounds = 12 - 3(TB) - 0(AP) = 9
      // netWounds (9) < wCur (10) → no critical
      const props = makeDefaultProps({
        toughnessBonus: 3,
        wCur: 10,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(12);

      expect(getNetWounds()).toBe(9);
      expect(screen.queryByTestId('critical-wound-notification')).not.toBeInTheDocument();
    });
  });

  describe('Critical wound notification content verification', () => {
    it('displays the Critical Wound title', () => {
      // wCur = 5, TB = 3, AP = 0
      // Damage = 10 → netWounds = 10 - 3 = 7 >= wCur (5) → critical
      const props = makeDefaultProps({
        toughnessBonus: 3,
        wCur: 5,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(10);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toHaveTextContent('Critical Wound');
    });

    it('displays a descriptive explanation for -20 modifier', () => {
      // wCur = 10, TB = 4, AP = 0
      // Damage = 15 → netWounds = 15 - 4 = 11 >= wCur (10) → critical
      // excess = 11 - 10 = 1, TB = 4, 1 < 4 → modifier = -20
      const props = makeDefaultProps({
        toughnessBonus: 4,
        wCur: 10,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(15);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toHaveTextContent('less than TB');
    });

    it('displays a descriptive explanation for no modifier', () => {
      // wCur = 5, TB = 2, AP = 0
      // Damage = 10 → netWounds = 10 - 2 = 8 >= wCur (5) → critical
      // excess = 8 - 5 = 3, TB = 2, 3 >= 2 → modifier = 0
      const props = makeDefaultProps({
        toughnessBonus: 2,
        wCur: 5,
      });

      render(<TakeDamagePanel {...props} />);
      setDamage(10);

      const notification = screen.getByTestId('critical-wound-notification');
      expect(notification).toHaveTextContent('meets or exceeds TB');
    });
  });
});
