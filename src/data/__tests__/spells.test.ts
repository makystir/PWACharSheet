import { describe, it, expect } from 'vitest';
import { SPELL_LIST } from '../spells';

describe('Lore of the Great Maw spells', () => {
  const greatMawSpells = SPELL_LIST.filter(s => s.lore === 'Lore of the Great Maw');

  it('contains exactly 7 spells', () => {
    expect(greatMawSpells).toHaveLength(7);
  });

  describe('Bonecrusher', () => {
    const spell = SPELL_LIST.find(s => s.name === 'Bonecrusher');

    it('exists in SPELL_LIST', () => {
      expect(spell).toBeDefined();
    });

    it('has CN "5"', () => expect(spell!.cn).toBe('5'));
    it('has range "WP yards"', () => expect(spell!.range).toBe('WP yards'));
    it('has target "1"', () => expect(spell!.target).toBe('1'));
    it('has duration "Instant"', () => expect(spell!.duration).toBe('Instant'));
    it('has effect containing "magic missile"', () => expect(spell!.effect.toLowerCase()).toContain('magic missile'));
    it('has effect containing "+4"', () => expect(spell!.effect).toContain('+4'));
    it('has effect containing "ignores armour"', () => expect(spell!.effect.toLowerCase()).toContain('ignores armour'));
    it('has lore "Lore of the Great Maw"', () => expect(spell!.lore).toBe('Lore of the Great Maw'));
  });

  describe('Bullgorger', () => {
    const spell = SPELL_LIST.find(s => s.name === 'Bullgorger');

    it('exists in SPELL_LIST', () => {
      expect(spell).toBeDefined();
    });

    it('has CN "5"', () => expect(spell!.cn).toBe('5'));
    it('has range "WPB yards"', () => expect(spell!.range).toBe('WPB yards'));
    it('has target "1"', () => expect(spell!.target).toBe('1'));
    it('has duration "WPB Rounds"', () => expect(spell!.duration).toBe('WPB Rounds'));
    it('has effect containing "+2 SB"', () => expect(spell!.effect).toContain('+2 SB'));
    it('has lore "Lore of the Great Maw"', () => expect(spell!.lore).toBe('Lore of the Great Maw'));
  });

  describe('Braingobbler', () => {
    const spell = SPELL_LIST.find(s => s.name === 'Braingobbler');

    it('exists in SPELL_LIST', () => {
      expect(spell).toBeDefined();
    });

    it('has CN "5"', () => expect(spell!.cn).toBe('5'));
    it('has range "You"', () => expect(spell!.range).toBe('You'));
    it('has target "You"', () => expect(spell!.target).toBe('You'));
    it('has duration "WPB Rounds"', () => expect(spell!.duration).toBe('WPB Rounds'));
    it('has effect containing "Fear 2"', () => expect(spell!.effect).toContain('Fear 2'));
    it('has lore "Lore of the Great Maw"', () => expect(spell!.lore).toBe('Lore of the Great Maw'));
  });

  describe('Taste Death', () => {
    const spell = SPELL_LIST.find(s => s.name === 'Taste Death');

    it('exists in SPELL_LIST', () => {
      expect(spell).toBeDefined();
    });

    it('has CN "2"', () => expect(spell!.cn).toBe('2'));
    it('has range "You"', () => expect(spell!.range).toBe('You'));
    it('has target "You"', () => expect(spell!.target).toBe('You'));
    it('has duration "Instant"', () => expect(spell!.duration).toBe('Instant'));
    it('has effect containing "cause of death"', () => expect(spell!.effect.toLowerCase()).toContain('cause of death'));
    it('has lore "Lore of the Great Maw"', () => expect(spell!.lore).toBe('Lore of the Great Maw'));
  });

  describe('Trollguts', () => {
    const spell = SPELL_LIST.find(s => s.name === 'Trollguts');

    it('exists in SPELL_LIST', () => {
      expect(spell).toBeDefined();
    });

    it('has CN "7"', () => expect(spell!.cn).toBe('7'));
    it('has range "TB yards"', () => expect(spell!.range).toBe('TB yards'));
    it('has target "1"', () => expect(spell!.target).toBe('1'));
    it('has duration "TB Rounds"', () => expect(spell!.duration).toBe('TB Rounds'));
    it('has effect containing "Regenerate"', () => expect(spell!.effect).toContain('Regenerate'));
    it('has lore "Lore of the Great Maw"', () => expect(spell!.lore).toBe('Lore of the Great Maw'));
  });

  describe('The Maw', () => {
    const spell = SPELL_LIST.find(s => s.name === 'The Maw');

    it('exists in SPELL_LIST', () => {
      expect(spell).toBeDefined();
    });

    it('has CN "11"', () => expect(spell!.cn).toBe('11'));
    it('has range "WP yards"', () => expect(spell!.range).toBe('WP yards'));
    it('has target "AoE (WPB yards)"', () => expect(spell!.target).toBe('AoE (WPB yards)'));
    it('has duration "WPB Rounds"', () => expect(spell!.duration).toBe('WPB Rounds'));
    it('has effect containing "pit"', () => expect(spell!.effect.toLowerCase()).toContain('pit'));
    it('has effect containing "Damage +10"', () => expect(spell!.effect).toContain('Damage +10'));
    it('has effect containing "Entangle"', () => expect(spell!.effect).toContain('Entangle'));
    it('has lore "Lore of the Great Maw"', () => expect(spell!.lore).toBe('Lore of the Great Maw'));
  });

  describe('Feast of the Fallen', () => {
    const spell = SPELL_LIST.find(s => s.name === 'Feast of the Fallen');

    it('exists in SPELL_LIST', () => {
      expect(spell).toBeDefined();
    });

    it('has CN "9"', () => expect(spell!.cn).toBe('9'));
    it('has range "You"', () => expect(spell!.range).toBe('You'));
    it('has target "Special"', () => expect(spell!.target).toBe('Special'));
    it('has duration "WPB Rounds"', () => expect(spell!.duration).toBe('WPB Rounds'));
    it('has effect containing "Vampiric"', () => expect(spell!.effect).toContain('Vampiric'));
    it('has lore "Lore of the Great Maw"', () => expect(spell!.lore).toBe('Lore of the Great Maw'));
  });
});
