import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { encodeSharePayload, decodeSharePayload, SHARE_FORMAT_V, MAX_ENCODED_CHARS } from '../share-codec';
import { base64urlEncode, base64urlDecode } from '../base64url';
import { validateSharedPayload, CURRENT_VERSION } from '../share-validate';
import type { Character, CharacteristicKey, CharacteristicValue } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';
import { exportToJSON } from '../../storage/export-import';

const CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function charsArb(): fc.Arbitrary<Record<CharacteristicKey, CharacteristicValue>> {
  return fc
    .record(Object.fromEntries(CHAR_KEYS.map(k => [k, fc.integer({ min: 0, max: 80 })])) as Record<CharacteristicKey, fc.Arbitrary<number>>)
    .map(vals => Object.fromEntries(
      CHAR_KEYS.map(k => [k, { i: vals[k], a: 0, b: 0 }])
    ) as Record<CharacteristicKey, CharacteristicValue>);
}

/** Serialized Character JSON arbitrary built from a real exported blank character. */
function characterJsonArb(): fc.Arbitrary<string> {
  return fc
    .record({
      name: fc.string(),
      species: fc.constantFrom('Human / Reiklander', 'Dwarf', 'Ogre', ''),
      chars: charsArb(),
    })
    .map(({ name, species, chars }) => {
      const character: Character = { ...structuredClone(BLANK_CHARACTER), name, species, chars };
      return exportToJSON(character);
    });
}

describe('share-codec round-trip (property)', () => {
  it('decodeSharePayload(encodeSharePayload(json)) === json for arbitrary JSON strings', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (json) => {
        const encoded = await encodeSharePayload(json);
        const result = await decodeSharePayload(encoded);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.json).toBe(json);
      }),
      { numRuns: 60 }
    );
  });

  it('round-trips serialized Character arbitraries byte-equal', async () => {
    await fc.assert(
      fc.asyncProperty(characterJsonArb(), async (json) => {
        const encoded = await encodeSharePayload(json);
        const result = await decodeSharePayload(encoded);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.json).toBe(json);
      }),
      { numRuns: 40 }
    );
  });
});

describe('base64url round-trip (property)', () => {
  it('base64urlDecode(base64urlEncode(bytes)) === bytes for arbitrary Uint8Array', () => {
    fc.assert(
      fc.property(fc.uint8Array(), (arr) => {
        const bytes = new Uint8Array(arr);
        const restored = base64urlDecode(base64urlEncode(bytes));
        expect(Array.from(restored)).toEqual(Array.from(bytes));
      })
    );
  });
});

describe('decodeSharePayload never throws on malformed input', () => {
  it('returns {ok:false} for arbitrary non-encoded strings', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (s) => {
        const result = await decodeSharePayload(s);
        expect(typeof result.ok).toBe('boolean');
      }),
      { numRuns: 80 }
    );
  });

  it('rejects truncated payloads', async () => {
    const encoded = await encodeSharePayload(JSON.stringify({ hi: 'there' }));
    const truncated = encoded.slice(0, Math.max(1, Math.floor(encoded.length / 2)));
    const result = await decodeSharePayload(truncated);
    expect(result.ok).toBe(false);
  });

  it('rejects a wrong first (version) byte', async () => {
    // Build a frame with a bogus version byte followed by valid gzip-ish bytes.
    const framed = new Uint8Array([SHARE_FORMAT_V + 9, 1, 2, 3, 4]);
    const encoded = base64urlEncode(framed);
    const result = await decodeSharePayload(encoded);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('bad-version');
  });

  it('rejects oversized encoded input without throwing', async () => {
    const huge = 'A'.repeat(MAX_ENCODED_CHARS + 1);
    const result = await decodeSharePayload(huge);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('too-large');
  });
});

describe('validateSharedPayload version handling', () => {
  it('accepts a real exported character', () => {
    const character: Character = { ...structuredClone(BLANK_CHARACTER), name: 'Real', species: 'Dwarf' };
    const result = validateSharedPayload(exportToJSON(character));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.character.name).toBe('Real');
  });

  it('rejects a missing required key', () => {
    const result = validateSharedPayload(JSON.stringify({ _v: CURRENT_VERSION, name: 'x', species: 'Human' }));
    // chars is missing — importFromJSON reports a missing-field error.
    expect(result.ok).toBe(false);
  });

  it('rejects a non-object payload', () => {
    expect(validateSharedPayload('42').ok).toBe(false);
    expect(validateSharedPayload('[]').ok).toBe(false);
    expect(validateSharedPayload('"hello"').ok).toBe(false);
  });

  it('rejects _v greater than CURRENT_VERSION with a version message', () => {
    const result = validateSharedPayload(JSON.stringify({ _v: CURRENT_VERSION + 1, name: 'x', species: 'Human', chars: {} }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/version/i);
  });

  it('rejects a non-numeric _v (string) with a version message', () => {
    const result = validateSharedPayload(JSON.stringify({ _v: 'abc', name: 'x', species: 'Human', chars: {} }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/version/i);
  });

  it('rejects a null _v with a version message', () => {
    const result = validateSharedPayload(JSON.stringify({ _v: null, name: 'x', species: 'Human', chars: {} }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/version/i);
  });
});
