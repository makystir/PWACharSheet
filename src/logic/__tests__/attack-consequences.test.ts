import { describe, it, expect } from 'vitest';
import {
  deriveWeaponQualitySuggestions,
  deriveCriticalWoundSuggestions,
  buildDefendHandoff,
} from '../attack-consequences';
import type { WeaponItem } from '../../types/character';
import type { HitLocation } from '../../components/combat/hitLocationTable';

function weapon(qualities: string, overrides: Partial<WeaponItem> = {}): WeaponItem {
  return {
    name: 'Test Weapon',
    group: 'Basic',
    enc: '1',
    damage: '+SB+4',
    qualities,
    ...overrides,
  };
}

// ─── Weapon-quality suggestions (outright) ───────────────────────────────────

describe('deriveWeaponQualitySuggestions — outright qualities', () => {
  it('Pummel + Head → one test-gated Stunned suggestion', () => {
    const { conditions, advisories } = deriveWeaponQualitySuggestions(
      weapon('Pummel'),
      'Head',
    );
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toMatchObject({
      name: 'Stunned',
      count: 1,
      testGated: true,
      source: 'weapon-quality',
    });
    expect(conditions[0].note).toMatch(/Opposed Str\/End test/);
    expect(conditions[0].note).not.toMatch(/if chosen/);
    expect(advisories).toHaveLength(0);
  });

  it('Pummel + non-Head → no condition', () => {
    const { conditions } = deriveWeaponQualitySuggestions(weapon('Pummel'), 'Body');
    expect(conditions).toHaveLength(0);
  });

  it('Hack (sole token) → advisory, no condition', () => {
    const { conditions, advisories } = deriveWeaponQualitySuggestions(
      weapon('Hack'),
      'Body',
    );
    expect(conditions).toHaveLength(0);
    expect(advisories).toHaveLength(1);
    expect(advisories[0].text).toMatch(/Damaged by 1/);
    expect(advisories[0].text).not.toMatch(/If Hack chosen/);
  });

  it('Sword with no inflicting quality (—) → empty', () => {
    const { conditions, advisories } = deriveWeaponQualitySuggestions(
      weapon('—'),
      'Head',
    );
    expect(conditions).toHaveLength(0);
    expect(advisories).toHaveLength(0);
  });

  it('Mace "Pummel, Unbalanced" + Head → Stunned (outright, not choice)', () => {
    const { conditions } = deriveWeaponQualitySuggestions(
      weapon('Pummel, Unbalanced'),
      'Head',
    );
    expect(conditions).toHaveLength(1);
    expect(conditions[0].note).not.toMatch(/if chosen/);
  });
});

// ─── Weapon-quality suggestions ("X or Y" choice groups) ─────────────────────

describe('deriveWeaponQualitySuggestions — "X or Y" choice groups', () => {
  it('Warhammer "Unbalanced, Pummel or Penetrating" + Head → Stunned "if chosen"', () => {
    const { conditions } = deriveWeaponQualitySuggestions(
      weapon('Unbalanced, Pummel or Penetrating'),
      'Head',
    );
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toMatchObject({ name: 'Stunned', testGated: true });
    expect(conditions[0].note).toMatch(/if chosen/);
  });

  it('Warhammer "Unbalanced, Pummel or Penetrating" + non-Head → none', () => {
    const { conditions } = deriveWeaponQualitySuggestions(
      weapon('Unbalanced, Pummel or Penetrating'),
      'Left Arm',
    );
    expect(conditions).toHaveLength(0);
  });

  it('Pollaxe "Defensive, Hack or Impale or Pummel" + Head → Stunned (if chosen) AND Hack advisory (if chosen)', () => {
    const { conditions, advisories } = deriveWeaponQualitySuggestions(
      weapon('Defensive, Hack or Impale or Pummel'),
      'Head',
    );
    expect(conditions).toHaveLength(1);
    expect(conditions[0].name).toBe('Stunned');
    expect(conditions[0].note).toMatch(/if chosen/);
    expect(advisories).toHaveLength(1);
    expect(advisories[0].text).toMatch(/If Hack chosen/);
  });

  it('Bill "Defensive, Hack or Trip" → Hack advisory (if chosen), no Stunned', () => {
    const { conditions, advisories } = deriveWeaponQualitySuggestions(
      weapon('Defensive, Hack or Trip'),
      'Head',
    );
    expect(conditions).toHaveLength(0);
    expect(advisories).toHaveLength(1);
    expect(advisories[0].text).toMatch(/If Hack chosen/);
  });
});

// ─── Critical-wound parsing ──────────────────────────────────────────────────

describe('deriveCriticalWoundSuggestions — parsing', () => {
  it('Head "Stunned" → Stunned ×1', () => {
    const result = deriveCriticalWoundSuggestions('Suffer 1 Stunned Condition');
    expect(result).toEqual([
      { name: 'Stunned', count: 1, testGated: false, source: 'critical-wound' },
    ]);
  });

  it('Arm "Deep Cut" → Bleeding ×2', () => {
    const result = deriveCriticalWoundSuggestions(
      'Suffer 2 Bleeding Conditions. Drop held item. –10 to all Tests using that arm until Bleeding is removed',
    );
    const bleeding = result.filter((s) => s.name === 'Bleeding');
    expect(bleeding).toHaveLength(1);
    expect(bleeding[0].count).toBe(2);
  });

  it('"Gain Unconscious Condition" → Unconscious ×1', () => {
    const result = deriveCriticalWoundSuggestions(
      'Suffer 3 Bleeding Conditions. Gain Unconscious Condition. Permanent –10 Toughness. Requires Surgery or death in d10 days',
    );
    const unconscious = result.filter((s) => s.name === 'Unconscious');
    expect(unconscious).toHaveLength(1);
    expect(unconscious[0].count).toBe(1);
  });

  it('"Gain the Unconscious Condition" (with article) → Unconscious ×1', () => {
    const result = deriveCriticalWoundSuggestions('Gain the Unconscious Condition for d10 rounds.');
    expect(result).toEqual([
      { name: 'Unconscious', count: 1, testGated: false, source: 'critical-wound' },
    ]);
  });

  it('Cracked Ribs comma chain → Stunned ×1 AND Bleeding ×1 (verb-less second clause kept)', () => {
    const result = deriveCriticalWoundSuggestions(
      'Suffer 1 Stunned Condition, 1 Bleeding Condition. –20 to Agility Tests for 2d10 days',
    );
    const names = result.map((s) => `${s.name}×${s.count}`);
    expect(names).toContain('Stunned×1');
    expect(names).toContain('Bleeding×1');
  });

  it('Broken Ribs comma chain → Bleeding ×2 AND Stunned ×2', () => {
    const result = deriveCriticalWoundSuggestions(
      'Suffer 2 Bleeding Conditions, 2 Stunned Conditions. –30 to Agility Tests for 30 days.',
    );
    const names = result.map((s) => `${s.name}×${s.count}`);
    expect(names).toContain('Bleeding×2');
    expect(names).toContain('Stunned×2');
  });

  it('Shattered Kneecap comma chain → Bleeding ×2 AND Stunned ×2', () => {
    const result = deriveCriticalWoundSuggestions(
      'Suffer 2 Bleeding Conditions, 2 Stunned Conditions. –2 Movement for 30 days. Permanent –5 Agility',
    );
    const names = result.map((s) => `${s.name}×${s.count}`);
    expect(names).toContain('Bleeding×2');
    expect(names).toContain('Stunned×2');
  });

  it('"Decapitation" (permanent/death only) → []', () => {
    expect(deriveCriticalWoundSuggestions('Death. Head is severed from the body')).toEqual([]);
  });

  it('empty string → []', () => {
    expect(deriveCriticalWoundSuggestions('')).toEqual([]);
  });
});

// ─── buildDefendHandoff ──────────────────────────────────────────────────────

describe('buildDefendHandoff', () => {
  it('keeps damage and SL separate and preserves location', () => {
    const loc: HitLocation = 'Body';
    const handoff = buildDefendHandoff(8, 3, loc);
    expect(handoff).toEqual({ damage: 8, sl: 3, location: 'Body' });
  });
});
