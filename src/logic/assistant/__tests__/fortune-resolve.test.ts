import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import { fortuneResolveSuggestions } from '../rules/fortune-resolve';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...structuredClone(BLANK_CHARACTER), ...overrides };
}

function assertNoFunctions(value: unknown): void {
  if (typeof value === 'function') throw new Error('Found a function value');
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) assertNoFunctions(v);
  }
}

describe('fortune-resolve rule (Core p.169 / p.170)', () => {
  it('emits nothing when both pools are empty', () => {
    expect(fortuneResolveSuggestions(makeCharacter({ fortune: 0, resolve: 0 }))).toEqual([]);
  });

  it('emits a Fortune info suggestion iff fortune > 0, navigating to combat', () => {
    const out = fortuneResolveSuggestions(makeCharacter({ fortune: 2, resolve: 0 }));
    expect(out).toHaveLength(1);
    const s = out[0];
    expect(s.id).toBe('resource:fortune-available');
    expect(s.title).toBe('You have 2 Fortune available');
    expect(s.category).toBe('resource');
    expect(s.urgency).toBe('info');
    expect(s.action).toEqual({ kind: 'navigate', page: 'combat' });
    expect(s.citation).toBe('Core p.169: Spending Fortune');
  });

  it('emits a Resolve info suggestion iff resolve > 0', () => {
    const out = fortuneResolveSuggestions(makeCharacter({ fortune: 0, resolve: 1 }));
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('resource:resolve-available');
    expect(out[0].citation).toBe('Core p.170: Spending Resolve');
  });

  it('emits both when both pools are non-empty', () => {
    const out = fortuneResolveSuggestions(makeCharacter({ fortune: 1, resolve: 1 }));
    expect(out.map(s => s.id).sort()).toEqual([
      'resource:fortune-available',
      'resource:resolve-available',
    ]);
  });

  it('property: a pool item appears iff that pool > 0; output is deterministic & serializable', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), fc.integer({ min: 0, max: 10 }), (fortune, resolve) => {
        const character = makeCharacter({ fortune, resolve });
        const frozen = Object.freeze(structuredClone(character));
        const out = fortuneResolveSuggestions(frozen);

        const ids = out.map(s => s.id);
        expect(ids.includes('resource:fortune-available')).toBe(fortune > 0);
        expect(ids.includes('resource:resolve-available')).toBe(resolve > 0);

        // Determinism on a frozen clone.
        expect(fortuneResolveSuggestions(structuredClone(frozen))).toEqual(out);
        // Serializable.
        for (const s of out) {
          assertNoFunctions(s);
          expect(JSON.parse(JSON.stringify(s))).toEqual(s);
        }
      }),
      { numRuns: 100 },
    );
  });
});
