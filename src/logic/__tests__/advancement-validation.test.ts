import { describe, it, expect } from 'vitest';
import { getFutureCareerLevel, hasSpellcastingTalent, hasRuneMagicTalent } from '../advancement';
import type { Character } from '../../types/character';

// ─── getFutureCareerLevel ────────────────────────────────────────────────────
// Validates: Requirements 4.1, 4.2, 4.3, 4.4
//
// Uses real CAREER_SCHEMES data. Career reference: Soldier
//   Level 1 (Recruit):  chars [WS, T, WP]
//   Level 2 (Soldier):  chars [WS, BS, T, WP]          — adds BS
//   Level 3 (Sergeant): chars [WS, BS, T, I, WP]       — adds I
//   Level 4 (Officer):  chars [WS, BS, T, I, WP, Fel]  — adds Fel
//
//   Level 1 skills: Athletics, Climb, Cool, Dodge, Endurance, Language (Battle), Melee (Basic), Play (Drum or Fife)
//   Level 2 skills: + Consume Alcohol, Gamble, Gossip, Melee (Any), Outdoor Survival, Ranged (Any)
//   Level 3 skills: + Heal, Intuition, Leadership, Perception
//   Level 4 skills: + Lore (Warfare), Navigation
//
//   Level 1 talents: Diceman, Marksman, Strong Back, Warrior Born
//   Level 2 talents: + Drilled, Etiquette (Soldiers), Rapid Reload, Shieldsman
//   Level 3 talents: + Combat Aware, Enclosed Fighter, Unshakeable, Warleader
//   Level 4 talents: + Inspiring, Public Speaking, Seasoned Traveller, Stout-hearted

describe('getFutureCareerLevel', () => {
  // ── Characteristics ──────────────────────────────────────────────────────

  describe('characteristics', () => {
    it('returns 3 for a characteristic that first appears at level 3 (I from level 1)', () => {
      // "I" is NOT in level 1 [WS, T, WP] or level 2 [WS, BS, T, WP],
      // but IS in level 3 [WS, BS, T, I, WP]
      const result = getFutureCareerLevel('Soldier', 1, { type: 'characteristic', key: 'I' });
      expect(result).toBe(3);
    });

    it('returns 2 for a characteristic that first appears at level 2 (BS from level 1)', () => {
      // "BS" is NOT in level 1 [WS, T, WP], but IS in level 2 [WS, BS, T, WP]
      const result = getFutureCareerLevel('Soldier', 1, { type: 'characteristic', key: 'BS' });
      expect(result).toBe(2);
    });

    it('returns null for a characteristic not in any future level (Dex)', () => {
      // "Dex" never appears in any Soldier level
      const result = getFutureCareerLevel('Soldier', 1, { type: 'characteristic', key: 'Dex' });
      expect(result).toBeNull();
    });

    it('returns null when current level is 4 (no future levels exist)', () => {
      // Even though WS is in every level, there is no level 5
      const result = getFutureCareerLevel('Soldier', 4, { type: 'characteristic', key: 'WS' });
      expect(result).toBeNull();
    });

    it('returns the earliest future level when target appears at multiple future levels (BS from level 1)', () => {
      // "BS" appears at levels 2, 3, and 4 — should return 2 (earliest)
      const result = getFutureCareerLevel('Soldier', 1, { type: 'characteristic', key: 'BS' });
      expect(result).toBe(2);
    });

    it('returns 4 for a characteristic that only appears at level 4 (Fel from level 1)', () => {
      // "Fel" only appears at level 4 [WS, BS, T, I, WP, Fel]
      const result = getFutureCareerLevel('Soldier', 1, { type: 'characteristic', key: 'Fel' });
      expect(result).toBe(4);
    });
  });

  // ── Skills ───────────────────────────────────────────────────────────────

  describe('skills', () => {
    it('returns correct level for a skill with grouped matching — Melee (Any) matches Melee (Sword)', () => {
      // Level 1 has "Melee (Basic)" but NOT "Melee (Any)".
      // Level 2 has "Melee (Any)" which matches "Melee (Sword)" via careerSkillMatches.
      const result = getFutureCareerLevel('Soldier', 1, { type: 'skill', name: 'Melee (Sword)' });
      expect(result).toBe(2);
    });

    it('returns correct level for a skill with exact match (Gossip from level 1)', () => {
      // "Gossip" is NOT in level 1 skills, but IS in level 2 skills
      const result = getFutureCareerLevel('Soldier', 1, { type: 'skill', name: 'Gossip' });
      expect(result).toBe(2);
    });

    it('returns null for a skill not in any future level (Lore (Magic))', () => {
      // "Lore (Magic)" never appears in any Soldier level
      const result = getFutureCareerLevel('Soldier', 1, { type: 'skill', name: 'Lore (Magic)' });
      expect(result).toBeNull();
    });

    it('returns correct level for a skill that first appears at level 3 (Leadership from level 1)', () => {
      // "Leadership" is NOT in level 1 or 2, but IS in level 3
      const result = getFutureCareerLevel('Soldier', 1, { type: 'skill', name: 'Leadership' });
      expect(result).toBe(3);
    });

    it('returns correct level for a skill that first appears at level 4 (Navigation from level 1)', () => {
      // "Navigation" only appears at level 4
      const result = getFutureCareerLevel('Soldier', 1, { type: 'skill', name: 'Navigation' });
      expect(result).toBe(4);
    });
  });

  // ── Talents ──────────────────────────────────────────────────────────────

  describe('talents', () => {
    it('returns correct level for a talent in a future level (Drilled from level 1)', () => {
      // "Drilled" is NOT in level 1 talents, but IS in level 2 talents
      const result = getFutureCareerLevel('Soldier', 1, { type: 'talent', name: 'Drilled' });
      expect(result).toBe(2);
    });

    it('returns null for a talent not in any future level (Hardy)', () => {
      // "Hardy" never appears in any Soldier level
      const result = getFutureCareerLevel('Soldier', 1, { type: 'talent', name: 'Hardy' });
      expect(result).toBeNull();
    });

    it('returns correct level for a talent that first appears at level 3 (Combat Aware from level 1)', () => {
      // "Combat Aware" is NOT in level 1 or 2, but IS in level 3
      const result = getFutureCareerLevel('Soldier', 1, { type: 'talent', name: 'Combat Aware' });
      expect(result).toBe(3);
    });

    it('returns correct level for a talent that first appears at level 4 (Inspiring from level 1)', () => {
      // "Inspiring" only appears at level 4
      const result = getFutureCareerLevel('Soldier', 1, { type: 'talent', name: 'Inspiring' });
      expect(result).toBe(4);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns null for an unknown career name', () => {
      const result = getFutureCareerLevel('NonexistentCareer', 1, { type: 'characteristic', key: 'WS' });
      expect(result).toBeNull();
    });

    it('returns null when current level is 4 for all target types', () => {
      expect(getFutureCareerLevel('Soldier', 4, { type: 'characteristic', key: 'BS' })).toBeNull();
      expect(getFutureCareerLevel('Soldier', 4, { type: 'skill', name: 'Gossip' })).toBeNull();
      expect(getFutureCareerLevel('Soldier', 4, { type: 'talent', name: 'Drilled' })).toBeNull();
    });

    it('returns earliest level when target appears at levels 2 and 4 (current level 1)', () => {
      // "BS" appears at levels 2, 3, and 4 for Soldier — returns 2 (earliest)
      const result = getFutureCareerLevel('Soldier', 1, { type: 'characteristic', key: 'BS' });
      expect(result).toBe(2);
    });

    it('searches only future levels, not the current level', () => {
      // "WS" is in level 1 — but from level 1, we only search levels 2+.
      // "WS" is also in level 2, so it should return 2.
      const result = getFutureCareerLevel('Soldier', 1, { type: 'characteristic', key: 'WS' });
      expect(result).toBe(2);
    });

    it('returns correct level when searching from level 2 (skips levels 1 and 2)', () => {
      // "I" is NOT in level 3 wait — it IS in level 3. From level 2, search levels 3+.
      // "I" first appears at level 3 for Soldier.
      const result = getFutureCareerLevel('Soldier', 2, { type: 'characteristic', key: 'I' });
      expect(result).toBe(3);
    });

    it('returns correct level when searching from level 3', () => {
      // "Fel" is NOT in level 4 wait — it IS in level 4. From level 3, search level 4 only.
      const result = getFutureCareerLevel('Soldier', 3, { type: 'characteristic', key: 'Fel' });
      expect(result).toBe(4);
    });

    it('returns null from level 3 for a characteristic already present but not at level 4', () => {
      // "S" (Strength) never appears in any Soldier level
      const result = getFutureCareerLevel('Soldier', 3, { type: 'characteristic', key: 'S' });
      expect(result).toBeNull();
    });
  });
});


// ─── Helper ──────────────────────────────────────────────────────────────────

/** Build a minimal Character with the given talent names. */
function charWithTalents(...talentNames: string[]): Character {
  return {
    talents: talentNames.map(n => ({ n, lvl: 1, desc: '' })),
  } as unknown as Character;
}

// ─── hasSpellcastingTalent ───────────────────────────────────────────────────
// Validates: Requirements 5.1, 5.2

describe('hasSpellcastingTalent', () => {
  it('returns true for a character with "Arcane Magic (Fire)"', () => {
    expect(hasSpellcastingTalent(charWithTalents('Arcane Magic (Fire)'))).toBe(true);
  });

  it('returns true for a character with "Petty Magic"', () => {
    expect(hasSpellcastingTalent(charWithTalents('Petty Magic'))).toBe(true);
  });

  it('returns true for a character with "Bless (Sigmar)"', () => {
    expect(hasSpellcastingTalent(charWithTalents('Bless (Sigmar)'))).toBe(true);
  });

  it('returns true for a character with "Invoke (Shallya)"', () => {
    expect(hasSpellcastingTalent(charWithTalents('Invoke (Shallya)'))).toBe(true);
  });

  it('returns false for a character with no talents', () => {
    expect(hasSpellcastingTalent(charWithTalents())).toBe(false);
  });

  it('returns false for a character with unrelated talents', () => {
    expect(hasSpellcastingTalent(charWithTalents('Hardy', 'Warrior Born'))).toBe(false);
  });
});

// ─── hasRuneMagicTalent ─────────────────────────────────────────────────────
// Validates: Requirements 6.1, 6.2

describe('hasRuneMagicTalent', () => {
  it('returns true for a character with "Rune Magic"', () => {
    expect(hasRuneMagicTalent(charWithTalents('Rune Magic'))).toBe(true);
  });

  it('returns true for a character with "Master Rune Magic"', () => {
    expect(hasRuneMagicTalent(charWithTalents('Master Rune Magic'))).toBe(true);
  });

  it('returns false for a character with no rune talents', () => {
    expect(hasRuneMagicTalent(charWithTalents('Hardy', 'Warrior Born'))).toBe(false);
  });
});
