import { describe, it, expect } from 'vitest';
import { validateSharedPayload, ARRAY_FIELDS, CURRENT_VERSION } from '../share-validate';
import { deriveSheetTotals } from '../sheet-totals';
import type { Character } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

/**
 * Build an exported-character JSON with specific fields overwritten by
 * (deliberately wrong-typed) raw values. Starts from a valid blank export so
 * the required keys and a valid numeric _v are present.
 */
function payloadWith(overrides: Record<string, unknown>): string {
  const base: Record<string, unknown> = {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Hardened',
    species: 'Human / Reiklander',
    _v: CURRENT_VERSION,
  };
  return JSON.stringify({ ...base, ...overrides });
}

describe('validateSharedPayload hardening', () => {
  it('coerces every wrong-typed ARRAY_FIELD to []', () => {
    const wrongTyped: Record<string, unknown> = {};
    const sentinels = [42, 'str', { nope: true }, null, true];
    ARRAY_FIELDS.forEach((field, i) => {
      wrongTyped[field] = sentinels[i % sentinels.length];
    });

    const result = validateSharedPayload(payloadWith(wrongTyped));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const c = result.character as unknown as Record<string, unknown>;
    for (const field of ARRAY_FIELDS) {
      expect(Array.isArray(c[field])).toBe(true);
      expect(c[field]).toEqual([]);
    }
  });

  it('coerces non-finite chars triples, movement, scalars, and bad objects', () => {
    const result = validateSharedPayload(payloadWith({
      chars: {
        ...BLANK_CHARACTER.chars,
        S: { i: 'bad', a: null, b: NaN },
        T: { i: 30, a: 0, b: 0 },
      },
      move: { m: 'x', w: null, r: undefined },
      houseRules: 'not-an-object',
      species: 12345,
      wCur: 'oops',
      corr: null,
      sin: NaN,
      fate: 'f',
      fortune: {},
      wGC: 'g',
      wSS: null,
      wD: NaN,
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const c = result.character;

    expect(c.chars.S).toEqual({ i: 0, a: 0, b: 0 });
    expect(c.move).toEqual({ m: 0, w: 0, r: 0 });
    // Non-object houseRules replaced with the BLANK default (valid rangedDamageSBMode).
    expect(c.houseRules.rangedDamageSBMode).toBe(BLANK_CHARACTER.houseRules.rangedDamageSBMode);
    expect(typeof c.houseRules.ignoreBackpackEnc).toBe('boolean');
    expect(c.species).toBe('');
    for (const field of ['wCur', 'corr', 'sin', 'fate', 'fortune', 'wGC', 'wSS', 'wD'] as const) {
      expect(c[field]).toBe(0);
    }
  });

  it('validates houseRules rangedDamageSBMode and ignoreBackpackEnc when object-shaped but wrong-valued', () => {
    const result = validateSharedPayload(payloadWith({
      houseRules: { ...BLANK_CHARACTER.houseRules, rangedDamageSBMode: 'bogus', ignoreBackpackEnc: 'yes' },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(['none', 'halfSB', 'fullSB']).toContain(result.character.houseRules.rangedDamageSBMode);
    expect(result.character.houseRules.ignoreBackpackEnc).toBe(false);
  });

  it('defaults armour worn flag to true unless explicitly false and drops invalid portrait', () => {
    const result = validateSharedPayload(payloadWith({
      armour: [
        { name: 'A', locations: 'Body', enc: '0', ap: 1, qualities: '' },
        { name: 'B', locations: 'Head', enc: '0', ap: 1, qualities: '', worn: false },
      ],
      portrait: 'not-a-data-url',
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.armour[0].worn).toBe(true);
    expect(result.character.armour[1].worn).toBe(false);
    expect(result.character.portrait).toBe('');
  });

  it('produces a Character that deriveSheetTotals can process without throwing', () => {
    const wrongTyped: Record<string, unknown> = {
      chars: { S: { i: 'bad' }, T: {}, WP: null },
      move: null,
      houseRules: 7,
      species: [],
      armour: 'nope',
      weapons: 123,
    };
    const result = validateSharedPayload(payloadWith(wrongTyped));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => deriveSheetTotals(result.character as Character)).not.toThrow();
  });
});
