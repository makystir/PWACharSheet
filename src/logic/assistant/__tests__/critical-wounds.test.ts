import { describe, it, expect } from 'vitest';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, CriticalWound } from '../../../types/character';
import { criticalWoundSuggestions } from '../rules/critical-wounds';
import { getActiveCriticalWounds } from '../../critical-wounds';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...structuredClone(BLANK_CHARACTER), ...overrides };
}

function wound(partial: Partial<CriticalWound> & { id: number }): CriticalWound {
  return {
    timestamp: 0,
    location: 'Body',
    description: '',
    effects: '',
    duration: '',
    severity: 1,
    healed: false,
    ...partial,
  };
}

function assertNoFunctions(value: unknown): void {
  if (typeof value === 'function') throw new Error('Found a function value');
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) assertNoFunctions(v);
  }
}

describe('critical-wounds rule (Core p.180-181 / p.172)', () => {
  it('emits nothing when there are no active wounds (empty or all healed)', () => {
    expect(criticalWoundSuggestions(makeCharacter({ criticalWounds: [] }))).toEqual([]);
    expect(
      criticalWoundSuggestions(makeCharacter({ criticalWounds: [wound({ id: 1, healed: true })] })),
    ).toEqual([]);
  });

  it('emits a single recommended summary navigating to combat, count matching the helper', () => {
    const character = makeCharacter({
      criticalWounds: [wound({ id: 1 }), wound({ id: 2 }), wound({ id: 3, healed: true })],
    });
    const out = criticalWoundSuggestions(character);
    expect(out).toHaveLength(1);
    const s = out[0];
    expect(s.id).toBe('health:critical-wounds');
    expect(s.category).toBe('health');
    expect(s.urgency).toBe('recommended');
    expect(s.action).toEqual({ kind: 'navigate', page: 'combat' });
    const n = getActiveCriticalWounds(character.criticalWounds).length;
    expect(n).toBe(2);
    expect(s.title).toBe('2 unhealed Critical Wounds');
    expect(s.citation).toBe('Core p.180-181: Healing Critical Wounds');
  });

  it('singular title when exactly one active wound', () => {
    const out = criticalWoundSuggestions(makeCharacter({ criticalWounds: [wound({ id: 1 })] }));
    expect(out[0].title).toBe('1 unhealed Critical Wound');
  });

  it('escalates to critical ONLY under the full RAW Death check: Unconscious AND wCur <= 0 AND count > TB (Core p.172 Death)', () => {
    // BLANK_CHARACTER has Toughness 0 (TB 0), so a single active wound already exceeds TB.
    const base = { criticalWounds: [wound({ id: 1 })] };

    // Unconscious AND at/below 0 AND count (1) > TB (0) → critical.
    const dead = criticalWoundSuggestions(
      makeCharacter({ ...base, conditions: [{ name: 'Unconscious', level: 1 }], wCur: 0 }),
    );
    expect(dead[0].urgency).toBe('critical');
    expect(dead[0].citation).toBe('Core p.172: Death');

    // Unconscious but still above 0 → not critical.
    const conscious0 = criticalWoundSuggestions(
      makeCharacter({ ...base, conditions: [{ name: 'Unconscious', level: 1 }], wCur: 3 }),
    );
    expect(conscious0[0].urgency).toBe('recommended');

    // At 0 Wounds but NOT Unconscious → not critical.
    const noCond = criticalWoundSuggestions(makeCharacter({ ...base, conditions: [], wCur: 0 }));
    expect(noCond[0].urgency).toBe('recommended');

    // Unconscious at 0 Wounds but count (2) <= TB (2) → RAW: survives, NOT critical.
    const tough = makeCharacter({
      criticalWounds: [wound({ id: 1 }), wound({ id: 2 })],
      conditions: [{ name: 'Unconscious', level: 1 }],
      wCur: 0,
    });
    tough.chars.T.i = 20; // TB = 2
    const survives = criticalWoundSuggestions(tough);
    expect(survives[0].urgency).toBe('recommended');
    expect(survives[0].citation).toBe('Core p.180-181: Healing Critical Wounds');

    // Same tough character but count (3) > TB (2) → critical.
    const exceeds = makeCharacter({
      criticalWounds: [wound({ id: 1 }), wound({ id: 2 }), wound({ id: 3 })],
      conditions: [{ name: 'Unconscious', level: 1 }],
      wCur: 0,
    });
    exceeds.chars.T.i = 20; // TB = 2
    const dies = criticalWoundSuggestions(exceeds);
    expect(dies[0].urgency).toBe('critical');
    expect(dies[0].citation).toBe('Core p.172: Death');

    // Many wounds but conscious and healthy → still only recommended (death check not met).
    const many = criticalWoundSuggestions(
      makeCharacter({
        criticalWounds: [wound({ id: 1 }), wound({ id: 2 }), wound({ id: 3 }), wound({ id: 4 })],
        conditions: [],
        wCur: 10,
      }),
    );
    expect(many[0].urgency).toBe('recommended');
  });

  it('is deterministic on a frozen clone and emits serializable output', () => {
    const character = makeCharacter({ criticalWounds: [wound({ id: 1 })] });
    const frozen = Object.freeze(structuredClone(character));
    const out = criticalWoundSuggestions(frozen);
    expect(criticalWoundSuggestions(structuredClone(frozen))).toEqual(out);
    for (const s of out) {
      assertNoFunctions(s);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    }
  });
});
