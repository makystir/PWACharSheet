import { describe, it, expect } from 'vitest';
import { findSkillForWeapon, calcWeaponDamage, RANGED_GROUPS } from '../weapons';
import { WEAPONS } from '../../data/weapons';
import type { WeaponItem, Talent } from '../../types/character';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function meleeWeapon(overrides: Partial<WeaponItem> = {}): WeaponItem {
  return {
    name: 'Hand Weapon',
    group: 'Basic',
    enc: '1',
    damage: '+SB+4',
    qualities: '—',
    ...overrides,
  };
}

function rangedWeapon(overrides: Partial<WeaponItem> = {}): WeaponItem {
  return {
    name: 'Longbow',
    group: 'Bow',
    enc: '2',
    damage: '+SB+4',
    qualities: '—',
    ...overrides,
  };
}

// ─── RANGED_GROUPS ───────────────────────────────────────────────────────────

describe('RANGED_GROUPS', () => {
  it('contains all expected ranged weapon groups', () => {
    expect(RANGED_GROUPS).toEqual([
      'Bow', 'Blackpowder', 'Crossbow', 'Sling', 'Throwing', 'Entangling', 'Explosives',
    ]);
  });

  it('does not contain melee groups', () => {
    expect(RANGED_GROUPS).not.toContain('Basic');
    expect(RANGED_GROUPS).not.toContain('Fencing');
    expect(RANGED_GROUPS).not.toContain('Brawling');
    expect(RANGED_GROUPS).not.toContain('Engineering');
  });
});

// ─── findSkillForWeapon ──────────────────────────────────────────────────────

describe('findSkillForWeapon', () => {
  const bSkills = [
    { n: 'Melee (Basic)', c: 'WS', a: 10 },
    { n: 'Melee (Fencing)', c: 'WS', a: 15 },
  ];
  const aSkills = [
    { n: 'Ranged (Bow)', c: 'BS', a: 20 },
    { n: 'Melee (Two-Handed)', c: 'WS', a: 5 },
  ];

  // ── Melee weapons ──

  it('returns exact melee group match from bSkills', () => {
    const result = findSkillForWeapon({ group: 'Fencing' }, bSkills, aSkills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Melee (Fencing)');
  });

  it('returns exact melee group match from aSkills', () => {
    const result = findSkillForWeapon({ group: 'Two-Handed' }, bSkills, aSkills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Melee (Two-Handed)');
  });

  it('falls back to Melee (Basic) when no exact melee group match', () => {
    const result = findSkillForWeapon({ group: 'Cavalry' }, bSkills, aSkills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Melee (Basic)');
  });

  it('returns null when no melee match and no Melee (Basic)', () => {
    const result = findSkillForWeapon({ group: 'Cavalry' }, [], []);
    expect(result).toBeNull();
  });

  it('returns Melee (Basic) for Basic group weapon', () => {
    const result = findSkillForWeapon({ group: 'Basic' }, bSkills, aSkills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Melee (Basic)');
  });

  // ── Ranged weapons ──

  it('returns matching Ranged skill for ranged weapon', () => {
    const result = findSkillForWeapon({ group: 'Bow' }, bSkills, aSkills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Ranged (Bow)');
  });

  it('returns null when no matching Ranged skill exists', () => {
    const result = findSkillForWeapon({ group: 'Crossbow' }, bSkills, aSkills);
    expect(result).toBeNull();
  });

  it('does not fall back to Melee (Basic) for ranged weapons', () => {
    const result = findSkillForWeapon({ group: 'Sling' }, bSkills, aSkills);
    expect(result).toBeNull();
  });

  // ── Edge cases ──

  it('searches both bSkills and aSkills', () => {
    const result = findSkillForWeapon({ group: 'Bow' }, [], aSkills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Ranged (Bow)');
  });

  it('returns null for empty skill lists', () => {
    expect(findSkillForWeapon({ group: 'Basic' }, [], [])).toBeNull();
    expect(findSkillForWeapon({ group: 'Bow' }, [], [])).toBeNull();
  });

  it('treats Engineering as melee (not in RANGED_GROUPS)', () => {
    const skills = [{ n: 'Melee (Engineering)', c: 'WS', a: 10 }];
    const result = findSkillForWeapon({ group: 'Engineering' }, skills, []);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Melee (Engineering)');
  });

  it('treats Explosives as ranged (in RANGED_GROUPS)', () => {
    const skills = [{ n: 'Ranged (Explosives)', c: 'BS', a: 10 }];
    const result = findSkillForWeapon({ group: 'Explosives' }, [], skills);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Ranged (Explosives)');
  });

  // ── Engineering weapon edge cases ──

  it('ranged Engineering weapon (with maxR) resolves to Ranged (Engineering)', () => {
    const skills = [{ n: 'Ranged (Engineering)', c: 'BS', a: 15 }];
    const result = findSkillForWeapon({ group: 'Engineering', maxR: '30' }, skills, []);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Ranged (Engineering)');
  });

  it('ranged Engineering weapon returns null when Ranged (Engineering) missing', () => {
    const skills = [
      { n: 'Melee (Basic)', c: 'WS', a: 10 },
      { n: 'Melee (Engineering)', c: 'WS', a: 10 },
      { n: 'Ranged (Bow)', c: 'BS', a: 15 },
    ];
    const result = findSkillForWeapon({ group: 'Engineering', maxR: '30' }, skills, []);
    expect(result).toBeNull();
  });

  it('melee Engineering weapon falls back to Melee (Basic) when Melee (Engineering) missing', () => {
    const skills = [{ n: 'Melee (Basic)', c: 'WS', a: 10 }];
    const result = findSkillForWeapon({ group: 'Engineering' }, skills, []);
    expect(result).not.toBeNull();
    expect(result!.n).toBe('Melee (Basic)');
  });
});

// ─── calcWeaponDamage ────────────────────────────────────────────────────────

describe('calcWeaponDamage', () => {
  const noTalents: Talent[] = [];
  const noRunes: string[] = [];

  // ── Basic damage formulas ──

  it('calculates SB+N damage correctly', () => {
    const result = calcWeaponDamage(meleeWeapon({ damage: '+SB+4' }), 4, noTalents, noRunes);
    expect(result.num).toBe(8); // SB(4) + 4
    expect(result.breakdown).toContain('SB(4)');
    expect(result.breakdown).toContain('+4');
  });

  it('calculates 1/2SB+N damage correctly', () => {
    const result = calcWeaponDamage(rangedWeapon({ damage: '+1/2SB+3' }), 4, noTalents, noRunes);
    expect(result.num).toBe(5); // halfSB(2) + 3
    expect(result.breakdown).toContain('½SB(2)');
    expect(result.breakdown).toContain('+3');
  });

  it('calculates flat +N damage correctly', () => {
    const result = calcWeaponDamage(meleeWeapon({ damage: '+3' }), 4, noTalents, noRunes);
    expect(result.num).toBe(3);
    expect(result.breakdown).toContain('+3');
  });

  it('returns null for "—" damage', () => {
    const result = calcWeaponDamage(meleeWeapon({ damage: '—' }), 4, noTalents, noRunes);
    expect(result.num).toBeNull();
    expect(result.breakdown).toBe('');
  });

  it('returns null for empty damage string', () => {
    const result = calcWeaponDamage(meleeWeapon({ damage: '' }), 4, noTalents, noRunes);
    expect(result.num).toBeNull();
    expect(result.breakdown).toBe('');
  });

  it('handles SB of 0', () => {
    const result = calcWeaponDamage(meleeWeapon({ damage: '+SB+4' }), 0, noTalents, noRunes);
    expect(result.num).toBe(4); // SB(0) + 4
  });

  it('handles odd SB for half SB (rounds down)', () => {
    const result = calcWeaponDamage(rangedWeapon({ damage: '+1/2SB+3' }), 5, noTalents, noRunes);
    expect(result.num).toBe(5); // halfSB(2) + 3
  });

  // ── Talent bonuses ──

  it('adds Strike Mighty Blow to melee weapons', () => {
    const talents: Talent[] = [{ n: 'Strike Mighty Blow', lvl: 2, desc: '' }];
    const result = calcWeaponDamage(meleeWeapon({ damage: '+SB+4' }), 4, talents, noRunes);
    expect(result.num).toBe(10); // SB(4) + 4 + SM(2)
    expect(result.breakdown).toContain('SM+2');
  });

  it('does NOT add Strike Mighty Blow to ranged weapons', () => {
    const talents: Talent[] = [{ n: 'Strike Mighty Blow', lvl: 2, desc: '' }];
    const result = calcWeaponDamage(rangedWeapon({ damage: '+SB+4' }), 4, talents, noRunes);
    expect(result.num).toBe(8); // SB(4) + 4, no SM
    expect(result.breakdown).not.toContain('SM');
  });

  it('adds Accurate Shot to ranged weapons', () => {
    const talents: Talent[] = [{ n: 'Accurate Shot', lvl: 1, desc: '' }];
    const result = calcWeaponDamage(rangedWeapon({ damage: '+SB+4' }), 4, talents, noRunes);
    expect(result.num).toBe(9); // SB(4) + 4 + AS(1)
    expect(result.breakdown).toContain('AS+1');
  });

  it('does NOT add Accurate Shot to melee weapons', () => {
    const talents: Talent[] = [{ n: 'Accurate Shot', lvl: 1, desc: '' }];
    const result = calcWeaponDamage(meleeWeapon({ damage: '+SB+4' }), 4, talents, noRunes);
    expect(result.num).toBe(8);
    expect(result.breakdown).not.toContain('AS');
  });

  it('adds Sure Shot to ranged weapons', () => {
    const talents: Talent[] = [{ n: 'Sure Shot', lvl: 3, desc: '' }];
    const result = calcWeaponDamage(rangedWeapon({ damage: '+SB+4' }), 4, talents, noRunes);
    expect(result.num).toBe(11); // SB(4) + 4 + SS(3)
    expect(result.breakdown).toContain('SS+3');
  });

  it('adds Dirty Fighting only to Brawling group', () => {
    const talents: Talent[] = [{ n: 'Dirty Fighting', lvl: 1, desc: '' }];
    const brawling = meleeWeapon({ group: 'Brawling', damage: '+SB+0' });
    const result = calcWeaponDamage(brawling, 4, talents, noRunes);
    expect(result.num).toBe(5); // SB(4) + 0 + DF(1)
    expect(result.breakdown).toContain('DF+1');
  });

  it('does NOT add Dirty Fighting to non-Brawling melee', () => {
    const talents: Talent[] = [{ n: 'Dirty Fighting', lvl: 1, desc: '' }];
    const result = calcWeaponDamage(meleeWeapon({ damage: '+SB+4' }), 4, talents, noRunes);
    expect(result.num).toBe(8);
    expect(result.breakdown).not.toContain('DF');
  });

  it('stacks multiple ranged talents', () => {
    const talents: Talent[] = [
      { n: 'Accurate Shot', lvl: 2, desc: '' },
      { n: 'Sure Shot', lvl: 1, desc: '' },
    ];
    const result = calcWeaponDamage(rangedWeapon({ damage: '+SB+4' }), 4, talents, noRunes);
    expect(result.num).toBe(11); // SB(4) + 4 + AS(2) + SS(1)
  });

  // ── Rune bonuses ──

  it('adds rune damage bonus when runes are present', () => {
    const runes = ['rune-of-might']; // +1 damage
    const result = calcWeaponDamage(meleeWeapon({ damage: '+SB+4' }), 4, noTalents, runes);
    expect(result.num).toBe(9); // SB(4) + 4 + Rune(1)
    expect(result.breakdown).toContain('Rune+1');
  });

  it('does not add rune bonus when runes array is empty', () => {
    const result = calcWeaponDamage(meleeWeapon({ damage: '+SB+4' }), 4, noTalents, []);
    expect(result.num).toBe(8);
    expect(result.breakdown).not.toContain('Rune');
  });

  it('combines talents and runes', () => {
    const talents: Talent[] = [{ n: 'Strike Mighty Blow', lvl: 1, desc: '' }];
    const runes = ['rune-of-might']; // +1 damage
    const result = calcWeaponDamage(meleeWeapon({ damage: '+SB+4' }), 4, talents, runes);
    expect(result.num).toBe(10); // SB(4) + 4 + SM(1) + Rune(1)
    expect(result.breakdown).toContain('SM+1');
    expect(result.breakdown).toContain('Rune+1');
  });
});


// ─── calcWeaponDamage with rangedDamageSBMode ────────────────────────────────

describe('calcWeaponDamage with rangedDamageSBMode', () => {
  const noTalents: Talent[] = [];
  const noRunes: string[] = [];

  // ── Ranged weapon with flat damage formula (+4) ──

  describe('ranged weapon with flat damage (+4)', () => {
    const flatRanged = (): WeaponItem => ({
      name: 'Pistol',
      group: 'Blackpowder',
      enc: '1',
      damage: '+4',
      qualities: '—',
    });

    it('mode "none" → damage=4, no SB in breakdown', () => {
      const result = calcWeaponDamage(flatRanged(), 6, noTalents, noRunes, 'none');
      expect(result.num).toBe(4);
      expect(result.breakdown).not.toContain('SB');
      expect(result.breakdown).not.toContain('½SB');
    });

    it('mode "halfSB" with SB=6 → damage=7, breakdown includes ½SB(3)', () => {
      const result = calcWeaponDamage(flatRanged(), 6, noTalents, noRunes, 'halfSB');
      expect(result.num).toBe(7); // 4 + Math.floor(6/2) = 4 + 3
      expect(result.breakdown).toContain('½SB(3)');
    });

    it('mode "fullSB" with SB=6 → damage=10, breakdown includes SB(6)', () => {
      const result = calcWeaponDamage(flatRanged(), 6, noTalents, noRunes, 'fullSB');
      expect(result.num).toBe(10); // 4 + 6
      expect(result.breakdown).toContain('SB(6)');
    });
  });

  // ── Ranged weapon with SB formula (SB+4) — no double-add ──

  describe('ranged weapon with SB+4 formula', () => {
    const sbRanged = (): WeaponItem => ({
      name: 'Longbow',
      group: 'Bow',
      enc: '2',
      damage: '+SB+4',
      qualities: '—',
    });

    it('mode "fullSB" → no double-add, damage = SB+4', () => {
      const result = calcWeaponDamage(sbRanged(), 6, noTalents, noRunes, 'fullSB');
      expect(result.num).toBe(10); // SB(6) + 4, not 6+4+6
      expect(result.breakdown).toBe('SB(6) +4');
    });

    it('mode "halfSB" → overrides SB to ½SB, damage = ½SB+4', () => {
      const result = calcWeaponDamage(sbRanged(), 6, noTalents, noRunes, 'halfSB');
      expect(result.num).toBe(7); // ½SB(3) + 4
      expect(result.breakdown).toBe('½SB(3) +4');
    });
  });

  // ── Ranged weapon with ½SB formula (1/2SB+3) — no override ──

  describe('ranged weapon with 1/2SB+3 formula', () => {
    const halfSBRanged = (): WeaponItem => ({
      name: 'Sling',
      group: 'Sling',
      enc: '0',
      damage: '+1/2SB+3',
      qualities: '—',
    });

    it('mode "fullSB" → overrides ½SB to full SB, damage = SB+3', () => {
      const result = calcWeaponDamage(halfSBRanged(), 6, noTalents, noRunes, 'fullSB');
      expect(result.num).toBe(9); // SB(6) + 3
      expect(result.breakdown).toContain('SB(6)');
      expect(result.breakdown).toContain('+3');
    });
  });

  // ── Melee weapon — unaffected by rangedDamageSBMode ──

  describe('melee weapon', () => {
    const melee = (): WeaponItem => ({
      name: 'Hand Weapon',
      group: 'Basic',
      enc: '1',
      damage: '+SB+4',
      qualities: '—',
    });

    it('mode "fullSB" → damage unchanged (melee ignores the setting)', () => {
      const withMode = calcWeaponDamage(melee(), 6, noTalents, noRunes, 'fullSB');
      const withoutMode = calcWeaponDamage(melee(), 6, noTalents, noRunes, 'none');
      expect(withMode.num).toBe(withoutMode.num);
      expect(withMode.num).toBe(10); // SB(6) + 4
      expect(withMode.breakdown).toBe(withoutMode.breakdown);
    });
  });

  // ── Edge cases ──

  describe('edge cases', () => {
    const flatRanged = (): WeaponItem => ({
      name: 'Pistol',
      group: 'Blackpowder',
      enc: '1',
      damage: '+4',
      qualities: '—',
    });

    it('SB=0 with "halfSB" → adds 0, breakdown shows ½SB(0)', () => {
      const result = calcWeaponDamage(flatRanged(), 0, noTalents, noRunes, 'halfSB');
      expect(result.num).toBe(4); // 4 + 0
      expect(result.breakdown).toContain('½SB(0)');
    });

    it('SB=1 with "halfSB" → adds Math.floor(0.5)=0', () => {
      const result = calcWeaponDamage(flatRanged(), 1, noTalents, noRunes, 'halfSB');
      expect(result.num).toBe(4); // 4 + Math.floor(1/2) = 4 + 0
      expect(result.breakdown).toContain('½SB(0)');
    });

    it('mode omitted (undefined) → behaves as "none"', () => {
      const withUndefined = calcWeaponDamage(flatRanged(), 6, noTalents, noRunes);
      const withNone = calcWeaponDamage(flatRanged(), 6, noTalents, noRunes, 'none');
      expect(withUndefined.num).toBe(withNone.num);
      expect(withUndefined.num).toBe(4);
      expect(withUndefined.breakdown).toBe(withNone.breakdown);
    });
  });
});


// ─── Dwarf Melee Weapon Catalogue Entries ────────────────────────────────────

describe('Dwarf melee weapon catalogue entries', () => {
  function findWeapon(name: string) {
    return WEAPONS.find(w => w.name === name);
  }

  it('Dwarf Axe has correct profile', () => {
    const w = findWeapon('Dwarf Axe');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Basic');
    expect(w!.enc).toBe('1');
    expect(w!.rangeReach).toBe('Average');
    expect(w!.damage).toBe('+SB+4');
    expect(w!.qualities).toBe('Hack');
  });

  it('Dwarf Warhammer has correct profile', () => {
    const w = findWeapon('Dwarf Warhammer');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Basic');
    expect(w!.enc).toBe('1');
    expect(w!.rangeReach).toBe('Average');
    expect(w!.damage).toBe('+SB+4');
    expect(w!.qualities).toBe('Pummel');
  });

  it('Whirling Blades of Death has correct profile', () => {
    const w = findWeapon('Whirling Blades of Death');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Flail');
    expect(w!.enc).toBe('3');
    expect(w!.rangeReach).toBe('Long');
    expect(w!.damage).toBe('+SB+5');
    expect(w!.qualities).toBe('Distract, Hack, Impact, Tiring, Wrap');
  });

  it('(2H) Dwarf Greataxe has correct profile', () => {
    const w = findWeapon('(2H) Dwarf Greataxe');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Two-Handed');
    expect(w!.enc).toBe('3');
    expect(w!.rangeReach).toBe('Long');
    expect(w!.damage).toBe('+SB+6');
    expect(w!.qualities).toBe('Hack, Impact, Tiring');
  });

  it('(2H) Dwarf Greathammer has correct profile', () => {
    const w = findWeapon('(2H) Dwarf Greathammer');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Two-Handed');
    expect(w!.enc).toBe('3');
    expect(w!.rangeReach).toBe('Long');
    expect(w!.damage).toBe('+SB+7');
    expect(w!.qualities).toBe('Damaging, Pummel');
  });

  it('(2H) Dwarf Pick has correct profile', () => {
    const w = findWeapon('(2H) Dwarf Pick');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Two-Handed');
    expect(w!.enc).toBe('2');
    expect(w!.rangeReach).toBe('Average');
    expect(w!.damage).toBe('+SB+6');
    expect(w!.qualities).toBe('Damaging, Impale');
  });

  it('(2H) Steam Drill has correct profile', () => {
    const w = findWeapon('(2H) Steam Drill');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Engineering');
    expect(w!.enc).toBe('3');
    expect(w!.rangeReach).toBe('Short');
    expect(w!.damage).toBe('+SB+6');
    expect(w!.qualities).toBe('Impact, Impale');
  });

  it('Cog Axe has correct profile', () => {
    const w = findWeapon('Cog Axe');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Engineering');
    expect(w!.enc).toBe('2');
    expect(w!.rangeReach).toBe('Average');
    expect(w!.damage).toBe('+SB+4');
    expect(w!.qualities).toBe('Hack, Penetrating, Trap Blade');
  });

  it('Steam Gauntlet has correct profile', () => {
    const w = findWeapon('Steam Gauntlet');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Engineering');
    expect(w!.enc).toBe('2');
    expect(w!.rangeReach).toBe('Very Short');
    expect(w!.damage).toBe('+SB+7');
    expect(w!.qualities).toBe('Pummel, Shield 1');
  });
});


// ─── Dwarf Ranged Weapon Catalogue Entries ───────────────────────────────────

describe('Dwarf ranged weapon catalogue entries', () => {
  function findWeapon(name: string) {
    return WEAPONS.find(w => w.name === name);
  }

  it('(2H) Dwarf Handgun has correct profile', () => {
    const w = findWeapon('(2H) Dwarf Handgun');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Blackpowder');
    expect(w!.enc).toBe('2');
    expect(w!.maxR).toBe('50');
    expect(w!.optR).toBe('16');
    expect(w!.rangeMod).toBe('10');
    expect(w!.damage).toBe('+10');
    expect(w!.qualities).toContain('Damaging');
    expect(w!.qualities).toContain('Impale');
    expect(w!.qualities).toContain('Penetrating');
    expect(w!.qualities).toContain('Reload 3');
    expect(w!.qualities).toContain('BP');
  });

  it('Dwarf Pistol has correct profile', () => {
    const w = findWeapon('Dwarf Pistol');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Blackpowder');
    expect(w!.enc).toBe('0');
    expect(w!.maxR).toBe('20');
    expect(w!.optR).toBe('6');
    expect(w!.rangeMod).toBe('4');
    expect(w!.damage).toBe('+10');
    expect(w!.qualities).toContain('Damaging');
    expect(w!.qualities).toContain('Impale');
    expect(w!.qualities).toContain('Penetrating');
    expect(w!.qualities).toContain('Pistol');
    expect(w!.qualities).toContain('Reload 1');
    expect(w!.qualities).toContain('BP');
  });

  it('(2H) Dwarf Crossbow has correct profile', () => {
    const w = findWeapon('(2H) Dwarf Crossbow');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Crossbow');
    expect(w!.enc).toBe('2');
    expect(w!.maxR).toBe('80');
    expect(w!.optR).toBe('26');
    expect(w!.rangeMod).toBe('16');
    expect(w!.damage).toBe('+10');
    expect(w!.qualities).toBe('Impale, Precise, Damaging, Reload 1');
  });

  it('Dwarf Throwing Axe has correct profile', () => {
    const w = findWeapon('Dwarf Throwing Axe');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Throwing');
    expect(w!.maxR).toBe('SBx2');
    expect(w!.damage).toBe('+SB+4');
    expect(w!.qualities).toBe('Hack');
    // Non-numeric maxR — no optR/rangeMod
    expect(w!.optR).toBeUndefined();
    expect(w!.rangeMod).toBeUndefined();
  });

  it('(2H) Drakegun has correct profile', () => {
    const w = findWeapon('(2H) Drakegun');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Engineering');
    expect(w!.enc).toBe('3');
    expect(w!.maxR).toBe('30');
    expect(w!.optR).toBe('10');
    expect(w!.rangeMod).toBe('6');
    expect(w!.damage).toBe('+12');
    expect(w!.qualities).toContain('Blast 6');
    expect(w!.qualities).toContain('Damaging');
    expect(w!.qualities).toContain('Dangerous');
    expect(w!.qualities).toContain('Penetrating');
    expect(w!.qualities).toContain('Reload 4');
    expect(w!.qualities).toContain('BP');
  });

  it('Drakefire Pistol has correct profile', () => {
    const w = findWeapon('Drakefire Pistol');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Engineering');
    expect(w!.enc).toBe('1');
    expect(w!.maxR).toBe('20');
    expect(w!.optR).toBe('6');
    expect(w!.rangeMod).toBe('4');
    expect(w!.damage).toBe('+11');
    expect(w!.qualities).toContain('Blast 3');
    expect(w!.qualities).toContain('Damaging');
    expect(w!.qualities).toContain('Dangerous');
    expect(w!.qualities).toContain('Penetrating');
    expect(w!.qualities).toContain('Pistol');
    expect(w!.qualities).toContain('Reload 4');
    expect(w!.qualities).toContain('BP');
  });

  it('Trollhammer Torpedo has correct profile', () => {
    const w = findWeapon('Trollhammer Torpedo');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Engineering');
    expect(w!.enc).toBe('3');
    expect(w!.maxR).toBe('40');
    expect(w!.optR).toBe('13');
    expect(w!.rangeMod).toBe('8');
    expect(w!.damage).toBe('+14');
    expect(w!.qualities).toBe('Dangerous, Impact, Reload 6');
  });

  it('(2H) Repeating Dwarf Handgun has correct profile', () => {
    const w = findWeapon('(2H) Repeating Dwarf Handgun');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Engineering');
    expect(w!.enc).toBe('3');
    expect(w!.maxR).toBe('50');
    expect(w!.optR).toBe('16');
    expect(w!.rangeMod).toBe('10');
    expect(w!.damage).toBe('+10');
    expect(w!.qualities).toBe('Damaging, Dangerous, Impale, Penetrating, Reload 4, Repeater 3');
  });

  it('(2H) Grudge-raker has correct profile', () => {
    const w = findWeapon('(2H) Grudge-raker');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Engineering');
    expect(w!.enc).toBe('2');
    expect(w!.maxR).toBe('30');
    expect(w!.optR).toBe('10');
    expect(w!.rangeMod).toBe('6');
    expect(w!.damage).toBe('+10');
    expect(w!.qualities).toBe('Damaging, Dangerous, Impale, Penetrating, Reload 3, Salvo 2, Spread 3');
  });

  it('Blasting Charge has correct profile', () => {
    const w = findWeapon('Blasting Charge');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Explosives');
    expect(w!.enc).toBe('0');
    expect(w!.maxR).toBe('SB');
    expect(w!.damage).toBe('+12');
    expect(w!.qualities).toBe('Blast 2, Dangerous, Impact, Penetrating');
    // Non-numeric maxR — no optR/rangeMod
    expect(w!.optR).toBeUndefined();
    expect(w!.rangeMod).toBeUndefined();
  });

  it('Cinderblast Bomb has correct profile', () => {
    const w = findWeapon('Cinderblast Bomb');
    expect(w).toBeDefined();
    expect(w!.group).toBe('Explosives');
    expect(w!.enc).toBe('0');
    expect(w!.maxR).toBe('SBx2');
    expect(w!.damage).toBe('+10');
    expect(w!.qualities).toBe('Blast 5, Dangerous, Impact, Penetrating');
    // Non-numeric maxR — no optR/rangeMod
    expect(w!.optR).toBeUndefined();
    expect(w!.rangeMod).toBeUndefined();
  });

  // ── Range derivation verification ──

  it('Dwarf ranged weapons with numeric maxR have correct optR and rangeMod derivations', () => {
    const dwarfRangedWeaponNames = [
      '(2H) Dwarf Handgun', 'Dwarf Pistol', '(2H) Dwarf Crossbow',
      '(2H) Drakegun', 'Drakefire Pistol', 'Trollhammer Torpedo',
      '(2H) Repeating Dwarf Handgun', '(2H) Grudge-raker',
    ];

    const dwarfNumericMaxR = WEAPONS.filter(
      w => dwarfRangedWeaponNames.includes(w.name) && w.maxR && /^\d+$/.test(w.maxR)
    );
    expect(dwarfNumericMaxR.length).toBe(8);

    for (const w of dwarfNumericMaxR) {
      const maxR = parseInt(w.maxR!, 10);
      const expectedOptR = Math.floor(maxR / 3).toString();
      const expectedRangeMod = Math.floor(maxR / 5).toString();
      expect(w.optR).toBe(expectedOptR);
      expect(w.rangeMod).toBe(expectedRangeMod);
    }
  });
});


// ─── Engineering Weapon Damage Calculation ───────────────────────────────────

describe('Engineering weapon damage calculation', () => {
  const noTalents: Talent[] = [];
  const noRunes: string[] = [];

  it('(2H) Drakegun applies Accurate Shot and Sure Shot', () => {
    const weapon: WeaponItem = {
      name: '(2H) Drakegun',
      group: 'Engineering',
      enc: '3',
      damage: '+12',
      qualities: 'Blast 6, Damaging, Dangerous, Penetrating, Reload 4, BP',
      maxR: '30',
    };
    const talents: Talent[] = [
      { n: 'Accurate Shot', lvl: 2, desc: '' },
      { n: 'Sure Shot', lvl: 1, desc: '' },
    ];
    const result = calcWeaponDamage(weapon, 4, talents, noRunes);
    // +12 flat + AS(2) + SS(1) = 15
    expect(result.num).toBe(15);
    expect(result.breakdown).toContain('AS+2');
    expect(result.breakdown).toContain('SS+1');
  });

  it('(2H) Steam Drill applies Strike Mighty Blow', () => {
    const weapon: WeaponItem = {
      name: '(2H) Steam Drill',
      group: 'Engineering',
      enc: '3',
      damage: '+SB+6',
      qualities: 'Impact, Impale',
      rangeReach: 'Short',
    };
    const talents: Talent[] = [
      { n: 'Strike Mighty Blow', lvl: 3, desc: '' },
    ];
    const result = calcWeaponDamage(weapon, 5, talents, noRunes);
    // SB(5) + 6 + SM(3) = 14
    expect(result.num).toBe(14);
    expect(result.breakdown).toContain('SB(5)');
    expect(result.breakdown).toContain('SM+3');
  });

  it('rangedDamageSBMode "halfSB" applies to Engineering ranged weapon', () => {
    const weapon: WeaponItem = {
      name: 'Drakefire Pistol',
      group: 'Engineering',
      enc: '1',
      damage: '+11',
      qualities: 'Blast 3, Damaging, Dangerous, Penetrating, Pistol, Reload 4, BP',
      maxR: '20',
    };
    const result = calcWeaponDamage(weapon, 6, noTalents, noRunes, 'halfSB');
    // 11 + ½SB(3) = 14
    expect(result.num).toBe(14);
    expect(result.breakdown).toContain('½SB(3)');
  });

  it('Engineering melee weapon is NOT affected by rangedDamageSBMode', () => {
    const weapon: WeaponItem = {
      name: 'Steam Gauntlet',
      group: 'Engineering',
      enc: '2',
      damage: '+SB+7',
      qualities: 'Pummel, Shield 1',
      rangeReach: 'Very Short',
    };
    const result = calcWeaponDamage(weapon, 4, noTalents, noRunes, 'fullSB');
    // SB(4) + 7 = 11, unchanged by mode since it's melee
    expect(result.num).toBe(11);
    expect(result.breakdown).toContain('SB(4)');
  });
});
