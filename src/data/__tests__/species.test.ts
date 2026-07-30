import { describe, it, expect } from 'vitest';
import { SPECIES_DATA } from '../species';

describe('Ogre species data', () => {
  const ogre = SPECIES_DATA['Ogre'];

  it('Ogre entry exists in SPECIES_DATA', () => {
    expect(ogre).toBeDefined();
  });

  describe('base characteristics', () => {
    it('WS is 20', () => expect(ogre.chars.WS).toBe(20));
    it('BS is 10', () => expect(ogre.chars.BS).toBe(10));
    it('S is 35', () => expect(ogre.chars.S).toBe(35));
    it('T is 35', () => expect(ogre.chars.T).toBe(35));
    it('I is 0', () => expect(ogre.chars.I).toBe(0));
    it('Ag is 15', () => expect(ogre.chars.Ag).toBe(15));
    it('Dex is 10', () => expect(ogre.chars.Dex).toBe(10));
    it('Int is 10', () => expect(ogre.chars.Int).toBe(10));
    it('WP is 20', () => expect(ogre.chars.WP).toBe(20));
    it('Fel is 10', () => expect(ogre.chars.Fel).toBe(10));
  });

  describe('movement, fate, resilience, extra points', () => {
    it('movement is 6', () => expect(ogre.move).toBe(6));
    it('fate is 0', () => expect(ogre.fate).toBe(0));
    it('resilience is 3', () => expect(ogre.resilience).toBe(3));
    it('extraPoints is 1', () => expect(ogre.extraPoints).toBe(1));
    it('woundsUseSB is true', () => expect(ogre.woundsUseSB).toBe(true));
    it('woundMultiplier is 2', () => expect(ogre.woundMultiplier).toBe(2));
  });

  describe('species skills', () => {
    const expectedSkills = [
      'Athletics',
      'Consume Alcohol',
      'Endurance',
      'Entertain (Storytelling)',
      'Intimidate',
      'Language (Grumbarth)',
      'Lore (Ogres)',
      'Melee (Basic)',
      'Melee (Brawling)',
      'Navigation',
      'Outdoor Survival',
      'Track',
    ];

    it('contains exactly 12 skills', () => {
      expect(ogre.skills).toHaveLength(12);
    });

    it('contains all expected skills', () => {
      expect(ogre.skills).toEqual(expectedSkills);
    });
  });

  describe('species talents', () => {
    const expectedTalents = [
      'Dirty Fighting',
      'Large',
      'Resistance (Chaos)',
      'Resistance (Poison (Ingested))',
      'Very Resilient or Very Strong',
      'Vice (Food)',
    ];

    it('contains exactly 6 talents', () => {
      expect(ogre.talents).toHaveLength(6);
    });

    it('contains all expected talents', () => {
      expect(ogre.talents).toEqual(expectedTalents);
    });
  });
});
