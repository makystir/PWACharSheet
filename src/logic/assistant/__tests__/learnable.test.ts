import { describe, it, expect } from 'vitest';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { SuggestionContext } from '../types';
import { learnableSuggestions } from '../rules/learnable';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...structuredClone(BLANK_CHARACTER), ...overrides };
}

const CTX_PEACE: SuggestionContext = { inCombat: false };
const CTX_COMBAT: SuggestionContext = { inCombat: true };

function assertNoFunctions(value: unknown): void {
  if (typeof value === 'function') throw new Error('Found a function value');
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) assertNoFunctions(v);
  }
}

describe('learnable rule (Core p.44-45 / p.47)', () => {
  it('returns [] in combat regardless of state', () => {
    const caster = makeCharacter({
      xpCur: 500,
      talents: [{ n: 'Petty Magic', lvl: 1, desc: '' }],
    });
    expect(learnableSuggestions(caster, CTX_COMBAT)).toEqual([]);
  });

  it('returns [] when xpCur is 0', () => {
    const caster = makeCharacter({
      xpCur: 0,
      talents: [{ n: 'Petty Magic', lvl: 1, desc: '' }],
    });
    expect(learnableSuggestions(caster, CTX_PEACE)).toEqual([]);
  });

  it('a caster with XP gets one info advancement:learnable listing the affordable kind', () => {
    const caster = makeCharacter({
      xpCur: 500,
      talents: [{ n: 'Petty Magic', lvl: 1, desc: '' }],
    });
    const out = learnableSuggestions(caster, CTX_PEACE);
    expect(out).toHaveLength(1);
    const s = out[0];
    expect(s.id).toBe('advancement:learnable');
    expect(s.category).toBe('advancement');
    expect(s.urgency).toBe('info');
    expect(s.action).toEqual({ kind: 'navigate', page: 'advancement' });
    expect(s.rationale).toContain('Petty spell');
  });

  it('returns [] for a character with XP but nothing eligible', () => {
    // BLANK_CHARACTER has no spellcasting/ritual talent and an unset career.
    const plain = makeCharacter({ xpCur: 1000, talents: [], career: '', careerLevel: '' });
    expect(learnableSuggestions(plain, CTX_PEACE)).toEqual([]);
  });

  it('omits the talent portion when the career/level cannot be resolved', () => {
    // Unknown career → scheme miss → talent portion omitted; no caster/ritual → [].
    const unresolved = makeCharacter({ xpCur: 1000, talents: [], career: 'Not A Real Career' });
    expect(learnableSuggestions(unresolved, CTX_PEACE)).toEqual([]);
  });

  it('is deterministic on a frozen clone and emits serializable output', () => {
    const caster = makeCharacter({
      xpCur: 500,
      talents: [{ n: 'Petty Magic', lvl: 1, desc: '' }],
    });
    const frozen = Object.freeze(structuredClone(caster));
    const out = learnableSuggestions(frozen, CTX_PEACE);
    expect(learnableSuggestions(structuredClone(frozen), CTX_PEACE)).toEqual(out);
    for (const s of out) {
      assertNoFunctions(s);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    }
  });
});
