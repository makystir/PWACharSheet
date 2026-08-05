import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TakeDamagePanel } from '../TakeDamagePanel';
import type { TakeDamagePanelProps } from '../TakeDamagePanel';
import type { ArmourItem, WeaponItem } from '../../../types/character';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDefaultProps(overrides: Partial<TakeDamagePanelProps> = {}): TakeDamagePanelProps {
  return {
    toughnessBonus: 3,
    armourPoints: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 },
    armourList: [],
    weapons: [],
    useCriticalDeflection: false,
    onArmourUpdate: vi.fn(),
    wCur: 12,
    totalWounds: 12,
    onApplyWounds: vi.fn(),
    min1Wound: true,
    onDown: vi.fn(),
    ...overrides,
  };
}

function makeShieldWeapon(rating: number = 2): WeaponItem {
  return {
    name: 'Shield',
    group: 'Shield',
    enc: '2',
    damage: '+0',
    qualities: `Defensive, Shield Rating ${rating}`,
  };
}

function makeChainmailArmour(ap: number = 2): ArmourItem {
  return {
    name: 'Chainmail Coat',
    locations: 'Arms, Body',
    enc: '3',
    ap,
    qualities: '—',
    worn: true,
    armourType: 'Chainmail',
    currentAp: ap,
  };
}

function makeLeatherArmour(ap: number = 1): ArmourItem {
  return {
    name: 'Leather Jack',
    locations: 'Arms, Body',
    enc: '1',
    ap,
    qualities: '—',
    worn: true,
    armourType: 'BoiledLeather',
    currentAp: ap,
  };
}

function setDamage(value: number) {
  const input = screen.getByLabelText('Incoming damage');
  fireEvent.change(input, { target: { value: String(value) } });
}

function selectLocation(location: string) {
  const select = screen.getByLabelText('Hit location');
  fireEvent.change(select, { target: { value: location } });
}

function togglePenetrating() {
  const checkbox = screen.getByTestId('penetrating-toggle');
  fireEvent.click(checkbox);
}

function toggleShield() {
  const checkbox = screen.getByTestId('defended-with-shield-toggle');
  fireEvent.click(checkbox);
}

function getNetWounds(): number {
  return Number(screen.getByTestId('net-wounds').textContent);
}

function getDisplayedAP(): number {
  return Number(screen.getByTestId('ap-at-location').textContent);
}

// ─── Integration Tests: Penetrating + Shield toggle composition ──────────────

describe('Integration: TakeDamagePanel Penetrating + Shield toggle composition', () => {
  describe('Both Penetrating and Shield toggles enabled', () => {
    it('applies Penetrating to metallic armour first, then adds shield rating on top', () => {
      // Chainmail AP 2 at Body → Penetrating reduces to 1
      // Shield Rating 2 → adds 2 on top
      // Effective AP = 1 (penetrating-modified) + 2 (shield) = 3
      const chainmail = makeChainmailArmour(2);
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [chainmail],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 2, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      togglePenetrating();
      toggleShield();

      // Effective AP should be 1 (chainmail 2 - 1) + 2 (shield) = 3
      expect(getDisplayedAP()).toBe(3);

      // With damage 10: net = 10 - 3(TB) - 3(AP) = 4
      setDamage(10);
      expect(getNetWounds()).toBe(4);
    });

    it('zeroes non-metallic armour via Penetrating, then adds shield rating', () => {
      // Leather AP 1 at Body → Penetrating reduces to 0 (non-metallic)
      // Shield Rating 3 → adds 3 on top
      // Effective AP = 0 + 3 = 3
      const leather = makeLeatherArmour(1);
      const shield = makeShieldWeapon(3);

      const props = makeDefaultProps({
        armourList: [leather],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 1, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      togglePenetrating();
      toggleShield();

      // Effective AP = 0 (leather zeroed) + 3 (shield) = 3
      expect(getDisplayedAP()).toBe(3);

      // With damage 12: net = 12 - 3(TB) - 3(AP) = 6
      setDamage(12);
      expect(getNetWounds()).toBe(6);
    });

    it('handles mixed metallic + non-metallic armour with shield', () => {
      // Chainmail AP 2 → Penetrating reduces to 1 (metallic -1)
      // Leather AP 1 → Penetrating reduces to 0 (non-metallic zeroed)
      // Shield Rating 2 → adds 2
      // Effective AP = 1 + 0 + 2 = 3
      const chainmail = makeChainmailArmour(2);
      const leather = makeLeatherArmour(1);
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [chainmail, leather],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 3, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      togglePenetrating();
      toggleShield();

      // Effective AP = 1 (chainmail) + 0 (leather) + 2 (shield) = 3
      expect(getDisplayedAP()).toBe(3);

      // With damage 15: net = 15 - 3(TB) - 3(AP) = 9
      setDamage(15);
      expect(getNetWounds()).toBe(9);
    });
  });

  describe('Only Penetrating enabled (no Shield)', () => {
    it('reduces metallic armour AP by 1 without shield contribution', () => {
      const chainmail = makeChainmailArmour(2);
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [chainmail],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 2, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      togglePenetrating();
      // Shield toggle NOT clicked

      // Effective AP = 1 (chainmail 2 - 1), no shield
      expect(getDisplayedAP()).toBe(1);

      // With damage 10: net = 10 - 3(TB) - 1(AP) = 6
      setDamage(10);
      expect(getNetWounds()).toBe(6);
    });

    it('zeroes non-metallic armour without shield contribution', () => {
      const leather = makeLeatherArmour(1);
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [leather],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 1, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      togglePenetrating();

      // Effective AP = 0 (leather zeroed by Penetrating)
      expect(getDisplayedAP()).toBe(0);

      // With damage 8: net = 8 - 3(TB) - 0(AP) = 5
      setDamage(8);
      expect(getNetWounds()).toBe(5);
    });
  });

  describe('Only Shield enabled (no Penetrating)', () => {
    it('adds shield rating on top of normal armour AP', () => {
      const chainmail = makeChainmailArmour(2);
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [chainmail],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 2, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      toggleShield();
      // Penetrating NOT clicked

      // Effective AP = 2 (chainmail, unmodified) + 2 (shield) = 4
      expect(getDisplayedAP()).toBe(4);

      // With damage 10: net = 10 - 3(TB) - 4(AP) = 3
      setDamage(10);
      expect(getNetWounds()).toBe(3);
    });

    it('adds shield rating on top of non-metallic armour AP', () => {
      const leather = makeLeatherArmour(1);
      const shield = makeShieldWeapon(3);

      const props = makeDefaultProps({
        armourList: [leather],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 1, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      toggleShield();

      // Effective AP = 1 (leather, unmodified) + 3 (shield) = 4
      expect(getDisplayedAP()).toBe(4);

      // With damage 10: net = 10 - 3(TB) - 4(AP) = 3
      setDamage(10);
      expect(getNetWounds()).toBe(3);
    });
  });

  describe('Neither toggle enabled (standard calculation)', () => {
    it('uses normal AP without Penetrating or Shield modifications', () => {
      const chainmail = makeChainmailArmour(2);
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [chainmail],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 2, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      // Neither toggle clicked

      // Effective AP = 2 (chainmail, standard)
      expect(getDisplayedAP()).toBe(2);

      // With damage 10: net = 10 - 3(TB) - 2(AP) = 5
      setDamage(10);
      expect(getNetWounds()).toBe(5);
    });

    it('shield toggle is hidden when no shield weapon is equipped', () => {
      const chainmail = makeChainmailArmour(2);

      const props = makeDefaultProps({
        armourList: [chainmail],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 2, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [], // No shield
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);

      // Shield toggle should not be rendered
      expect(screen.queryByTestId('defended-with-shield-toggle')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases for Penetrating + Shield interaction', () => {
    it('metallic armour at AP 1 reduced to 0 by Penetrating, shield still adds', () => {
      // Chainmail AP 1 → Penetrating reduces to 0 (1 - 1 = 0)
      // Shield Rating 2 → adds 2
      // Effective AP = 0 + 2 = 2
      const chainmail = makeChainmailArmour(1);
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [chainmail],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 1, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      togglePenetrating();
      toggleShield();

      // Effective AP = 0 (chainmail 1 → 0) + 2 (shield) = 2
      expect(getDisplayedAP()).toBe(2);
    });

    it('no armour at location: Penetrating has no effect, shield still adds', () => {
      // No armour at Head location, Penetrating does nothing
      // Shield Rating 2 → adds 2
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [], // No armour
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Head');
      togglePenetrating();
      toggleShield();

      // Effective AP = 0 (no armour) + 2 (shield) = 2
      expect(getDisplayedAP()).toBe(2);

      // With damage 10: net = 10 - 3(TB) - 2(AP) = 5
      setDamage(10);
      expect(getNetWounds()).toBe(5);
    });

    it('Penetrating notes are displayed when enabled with armour present', () => {
      const chainmail = makeChainmailArmour(2);
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [chainmail],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 2, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      togglePenetrating();

      // Penetrating notes should be displayed
      const notes = screen.getByTestId('penetrating-notes');
      expect(notes).toBeInTheDocument();
      expect(notes).toHaveTextContent(/Penetrating/);
      expect(notes).toHaveTextContent(/metallic/);
    });

    it('Shield AP note is displayed when shield toggle is enabled', () => {
      const chainmail = makeChainmailArmour(2);
      const shield = makeShieldWeapon(2);

      const props = makeDefaultProps({
        armourList: [chainmail],
        armourPoints: { head: 0, lArm: 0, rArm: 0, body: 2, lLeg: 0, rLeg: 0, shield: 0 },
        weapons: [shield],
        toughnessBonus: 3,
      });

      render(<TakeDamagePanel {...props} />);
      selectLocation('Body');
      toggleShield();

      // Shield AP note should be displayed
      const note = screen.getByTestId('shield-ap-note');
      expect(note).toBeInTheDocument();
      expect(note).toHaveTextContent(/Shield.*\+2 AP/);
    });
  });
});
