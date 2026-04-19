import { describe, it, expect } from 'vitest';
import { findSkillForWeapon, calcWeaponDamage, RANGED_GROUPS } from '../weapons';
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
