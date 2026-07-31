import { describe, it, expect } from 'vitest';
import {
  ARMOUR_NAME_MAP,
  migrateArmourItem,
  migrateCharacterArmour,
} from '../armourMigration';
import type { ArmourItem } from '../../types/character';

describe('armourMigration', () => {
  describe('ARMOUR_NAME_MAP', () => {
    it('maps Mail Coat to Chainmail Coat', () => {
      expect(ARMOUR_NAME_MAP['Mail Coat']).toBe('Chainmail Coat');
    });

    it('maps Mail Chausses to Chainmail Chausses', () => {
      expect(ARMOUR_NAME_MAP['Mail Chausses']).toBe('Chainmail Chausses');
    });

    it('maps Mail Coif to Chainmail Coif', () => {
      expect(ARMOUR_NAME_MAP['Mail Coif']).toBe('Chainmail Coif');
    });

    it('maps Mail Shirt to Chainmail Shirt', () => {
      expect(ARMOUR_NAME_MAP['Mail Shirt']).toBe('Chainmail Shirt');
    });

    it('maps Plate Breastplate to Breastplate', () => {
      expect(ARMOUR_NAME_MAP['Plate Breastplate']).toBe('Breastplate');
    });

    it('maps Plate Bracers to Bracers', () => {
      expect(ARMOUR_NAME_MAP['Plate Bracers']).toBe('Bracers');
    });

    it('maps Helm to Great Helm', () => {
      expect(ARMOUR_NAME_MAP['Helm']).toBe('Great Helm');
    });

    it('maps Boiled Leather Breastplate to Leather Jerkin', () => {
      expect(ARMOUR_NAME_MAP['Boiled Leather Breastplate']).toBe('Leather Jerkin');
    });
  });

  describe('migrateArmourItem', () => {
    it('renames old core-rulebook armour names', () => {
      const item: ArmourItem = {
        name: 'Mail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
      };
      const result = migrateArmourItem(item);
      expect(result.name).toBe('Chainmail Coat');
    });

    it('does not rename items not in the map', () => {
      const item: ArmourItem = {
        name: 'Leather Jack',
        locations: 'Arms, Body',
        enc: '1',
        ap: 1,
        qualities: '—',
      };
      const result = migrateArmourItem(item);
      expect(result.name).toBe('Leather Jack');
    });

    it('defaults currentAp to ap when undefined', () => {
      const item: ArmourItem = {
        name: 'Chainmail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
      };
      const result = migrateArmourItem(item);
      expect(result.currentAp).toBe(2);
    });

    it('preserves valid currentAp', () => {
      const item: ArmourItem = {
        name: 'Chainmail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
        currentAp: 1,
      };
      const result = migrateArmourItem(item);
      expect(result.currentAp).toBe(1);
    });

    it('clamps negative currentAp to 0', () => {
      const item: ArmourItem = {
        name: 'Chainmail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
        currentAp: -3,
      };
      const result = migrateArmourItem(item);
      expect(result.currentAp).toBe(0);
    });

    it('clamps currentAp greater than ap to ap', () => {
      const item: ArmourItem = {
        name: 'Chainmail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
        currentAp: 5,
      };
      const result = migrateArmourItem(item);
      expect(result.currentAp).toBe(2);
    });

    it('sets visorOpen to false for Visor items when missing', () => {
      const item: ArmourItem = {
        name: 'Bascinet',
        locations: 'Head',
        enc: '2',
        ap: 3,
        qualities: 'Impenetrable, Visor, Weakpoints',
      };
      const result = migrateArmourItem(item);
      expect(result.visorOpen).toBe(false);
    });

    it('preserves existing visorOpen state', () => {
      const item: ArmourItem = {
        name: 'Bascinet',
        locations: 'Head',
        enc: '2',
        ap: 3,
        qualities: 'Impenetrable, Visor, Weakpoints',
        visorOpen: true,
      };
      const result = migrateArmourItem(item);
      expect(result.visorOpen).toBe(true);
    });

    it('does not set visorOpen for items without Visor quality', () => {
      const item: ArmourItem = {
        name: 'Great Helm',
        locations: 'Head',
        enc: '2',
        ap: 3,
        qualities: 'Impenetrable, Weakpoints',
      };
      const result = migrateArmourItem(item);
      expect(result.visorOpen).toBeUndefined();
    });

    it('infers armourType from ARMOURS database', () => {
      const item: ArmourItem = {
        name: 'Chainmail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
      };
      const result = migrateArmourItem(item);
      expect(result.armourType).toBe('Chainmail');
    });

    it('preserves existing armourType', () => {
      const item: ArmourItem = {
        name: 'Chainmail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
        armourType: 'Chainmail',
      };
      const result = migrateArmourItem(item);
      expect(result.armourType).toBe('Chainmail');
    });

    it('leaves armourType undefined for unknown items', () => {
      const item: ArmourItem = {
        name: 'Custom Homebrew Armour',
        locations: 'Body',
        enc: '1',
        ap: 2,
        qualities: '—',
      };
      const result = migrateArmourItem(item);
      expect(result.armourType).toBeUndefined();
    });

    it('preserves all existing fields', () => {
      const item: ArmourItem = {
        name: 'Chainmail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
        worn: true,
        runes: ['Protection'],
      };
      const result = migrateArmourItem(item);
      expect(result.locations).toBe('Arms, Body');
      expect(result.enc).toBe('3');
      expect(result.ap).toBe(2);
      expect(result.qualities).toBe('—');
      expect(result.worn).toBe(true);
      expect(result.runes).toEqual(['Protection']);
    });

    it('is idempotent — running twice produces the same result', () => {
      const item: ArmourItem = {
        name: 'Mail Coat',
        locations: 'Arms, Body',
        enc: '3',
        ap: 2,
        qualities: '—',
        worn: true,
      };
      const first = migrateArmourItem(item);
      const second = migrateArmourItem(first);
      expect(second).toEqual(first);
    });
  });

  describe('migrateCharacterArmour', () => {
    it('migrates all items in the array', () => {
      const armour: ArmourItem[] = [
        { name: 'Mail Coat', locations: 'Arms, Body', enc: '3', ap: 2, qualities: '—' },
        { name: 'Helm', locations: 'Head', enc: '2', ap: 3, qualities: 'Impenetrable, Weakpoints' },
      ];
      const result = migrateCharacterArmour(armour);
      expect(result[0].name).toBe('Chainmail Coat');
      expect(result[1].name).toBe('Great Helm');
      expect(result[0].currentAp).toBe(2);
      expect(result[1].currentAp).toBe(3);
    });

    it('handles empty array', () => {
      expect(migrateCharacterArmour([])).toEqual([]);
    });
  });
});
