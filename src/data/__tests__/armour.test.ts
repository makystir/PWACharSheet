import { describe, it, expect } from 'vitest';
import { ARMOURS } from '../armour';

describe('Ogre armour', () => {
  describe('Ogre Gutplate', () => {
    const armour = ARMOURS.find(a => a.name === 'Ogre Gutplate');

    it('exists in ARMOURS', () => {
      expect(armour).toBeDefined();
    });

    it('has locations Body', () => {
      expect(armour!.locations).toBe('Body');
    });

    it('has enc —', () => {
      expect(armour!.enc).toBe('—');
    });

    it('has ap 3', () => {
      expect(armour!.ap).toBe(3);
    });

    it('has quality Impenetrable', () => {
      expect(armour!.qualities).toBe('Impenetrable');
    });
  });
});
