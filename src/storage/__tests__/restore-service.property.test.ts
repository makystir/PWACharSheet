/**
 * Feature: bulk-character-backup
 * Property-based tests for RestoreService
 *
 * Properties tested:
 *   2: Validation rejects invalid backup files
 *   4: Import correctness with partial failures
 *   5: Import non-destruction of existing data
 */

// Patch structuredClone before importing fake-indexeddb so that Blob
// objects survive the structured clone algorithm in jsdom.
const _origStructuredClone = globalThis.structuredClone;
globalThis.structuredClone = (<T>(value: T): T => {
  if (value instanceof Blob) return value as T;
  return _origStructuredClone(value);
}) as typeof structuredClone;

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { validateBackupFile, restoreCharacters } from '../restore-service';
import { BLANK_CHARACTER } from '../../types/character';

// --- Mocks ---
vi.mock('../character-manager');
vi.mock('../portrait-store');
vi.mock('../portrait-codec');

import { createCharacter, saveCharacter, listCharacters } from '../character-manager';
import { getPortraitStore } from '../portrait-store';
import { base64ToBlob, isValidPortraitDataUrl } from '../portrait-codec';

// --- Generators ---

const arbCharacterName = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const arbSpecies = fc.constantFrom('Human', 'Dwarf', 'High Elf', 'Wood Elf', 'Halfling');
const arbCharValue = fc.record({ i: fc.nat(99), a: fc.nat(99), b: fc.nat(10) });
const arbChars = fc.record({
  WS: arbCharValue, BS: arbCharValue, S: arbCharValue, T: arbCharValue, I: arbCharValue,
  Ag: arbCharValue, Dex: arbCharValue, Int: arbCharValue, WP: arbCharValue, Fel: arbCharValue,
});

const arbValidBackupEntry = fc.tuple(arbCharacterName, arbSpecies, arbChars).map(([name, species, chars]) => ({
  id: crypto.randomUUID(),
  character: { ...structuredClone(BLANK_CHARACTER), name, species, chars } as Record<string, unknown>,
  portrait: '',
}));

const arbInvalidBackupEntry = fc.constantFrom(
  { id: 'x', character: { species: 'Human', chars: {} }, portrait: '' },   // missing name
  { id: 'x', character: { name: 'Bob', chars: {} }, portrait: '' },        // missing species
  { id: 'x', character: { name: 'Bob', species: 'Human' }, portrait: '' }, // missing chars
  { id: 'x', character: {}, portrait: '' },                                 // missing all
);

// ============================================================================
// Property 2: Validation rejects invalid backup files
// Validates: Requirements 2.1, 2.2, 2.3, 3.5
// ============================================================================

describe('Feature: bulk-character-backup, Property 2: Validation rejects invalid backup files', () => {

  // Category A: Not valid JSON
  const arbNotJSON = fc.string().filter(s => {
    try { JSON.parse(s); return false; } catch { return true; }
  });

  // Category B: Valid JSON but not an object (numbers, strings, arrays, booleans, null)
  const arbNotObject = fc.oneof(
    fc.double().map(n => JSON.stringify(n)),
    fc.string().map(s => JSON.stringify(s)),
    fc.array(fc.integer()).map(a => JSON.stringify(a)),
    fc.boolean().map(b => JSON.stringify(b)),
    fc.constant('null'),
  );

  // Category C: Object without version field but with characters array
  const arbMissingVersion = fc.array(fc.string(), { minLength: 1, maxLength: 3 }).map(names => JSON.stringify({
    characters: names.map(n => ({ id: 'x', character: { name: n }, portrait: '' })),
    characterCount: names.length,
  }));

  // Category D: Object with version > 1
  const arbBadVersion = fc.integer({ min: 2, max: 1000 }).map(ver => JSON.stringify({
    version: ver,
    characters: [{ id: 'x', character: { name: 'Test' }, portrait: '' }],
    characterCount: 1,
  }));

  // Category E: Object with version but without characters array
  const arbMissingCharacters = fc.constant(JSON.stringify({
    version: 1,
    exportedAt: '2025-01-01T00:00:00.000Z',
    characterCount: 1,
  }));

  // Category F: Valid structure but characterCount doesn't match characters.length
  const arbCountMismatch = fc.tuple(
    fc.integer({ min: 1, max: 10 }),
    fc.integer({ min: 1, max: 10 }),
  ).filter(([actual, declared]) => actual !== declared).map(([actual, declared]) => {
    const characters = Array.from({ length: actual }, (_, i) => ({
      id: `id-${i}`,
      character: { name: `Char ${i}`, species: 'Human', chars: {} },
      portrait: '',
    }));
    return JSON.stringify({ version: 1, characters, characterCount: declared });
  });

  /**
   * Validates: Requirements 2.1, 2.2, 2.3, 3.5
   */
  it('rejects strings that are not valid JSON', async () => {
    await fc.assert(
      fc.property(arbNotJSON, (input) => {
        const result = validateBackupFile(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('rejects valid JSON that is not an object', async () => {
    await fc.assert(
      fc.property(arbNotObject, (input) => {
        const result = validateBackupFile(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('rejects objects missing the version field', async () => {
    await fc.assert(
      fc.property(arbMissingVersion, (input) => {
        const result = validateBackupFile(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('rejects objects with version > 1', async () => {
    await fc.assert(
      fc.property(arbBadVersion, (input) => {
        const result = validateBackupFile(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('rejects objects missing the characters array', async () => {
    await fc.assert(
      fc.property(arbMissingCharacters, (input) => {
        const result = validateBackupFile(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('rejects objects with characterCount mismatch', async () => {
    await fc.assert(
      fc.property(arbCountMismatch, (input) => {
        const result = validateBackupFile(input);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 4: Import correctness with partial failures
// Validates: Requirements 2.5, 2.6, 2.7
// ============================================================================

describe('Feature: bulk-character-backup, Property 4: Import correctness with partial failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock listCharacters to return empty (no pre-existing characters)
    vi.mocked(listCharacters).mockReturnValue([]);

    // Mock createCharacter to return a new UUID each time
    vi.mocked(createCharacter).mockImplementation(() => crypto.randomUUID());

    // Mock saveCharacter to succeed
    vi.mocked(saveCharacter).mockReturnValue({ ok: true });

    // Mock portrait-related functions
    vi.mocked(isValidPortraitDataUrl).mockReturnValue(false);
    vi.mocked(base64ToBlob).mockReturnValue(null);
    vi.mocked(getPortraitStore).mockReturnValue({
      init: vi.fn().mockResolvedValue(undefined),
      isDegraded: vi.fn().mockReturnValue(false),
      savePortrait: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      getPortraitURL: vi.fn().mockResolvedValue({ ok: true, value: null }),
      getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
      deletePortrait: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      revokeURL: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Validates: Requirements 2.5, 2.6, 2.7
   *
   * For any BackupFile with a mix of valid and invalid characters,
   * imported + skipped equals total characters in file.
   */
  it('imported + skipped equals total characters for mixed valid/invalid entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbValidBackupEntry, { minLength: 0, maxLength: 5 }),
        fc.array(arbInvalidBackupEntry, { minLength: 0, maxLength: 5 }),
        async (validEntries, invalidEntries) => {
          // Require at least one entry total
          fc.pre(validEntries.length + invalidEntries.length > 0);

          // Reset mocks between iterations
          vi.mocked(createCharacter).mockImplementation(() => crypto.randomUUID());
          vi.mocked(saveCharacter).mockReturnValue({ ok: true });
          vi.mocked(listCharacters).mockReturnValue([]);

          // Simple deterministic interleave: alternate valid/invalid
          const shuffled = [];
          let vi2 = 0, ii = 0;
          while (vi2 < validEntries.length || ii < invalidEntries.length) {
            if (vi2 < validEntries.length) shuffled.push(validEntries[vi2++]);
            if (ii < invalidEntries.length) shuffled.push(invalidEntries[ii++]);
          }

          const promise = restoreCharacters(shuffled);
          // Advance all pending timers from setTimeout(r, 0) calls
          await vi.runAllTimersAsync();
          const result = await promise;

          expect(result.imported + result.skipped).toBe(shuffled.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 5: Import non-destruction of existing data
// Validates: Requirements 4.1, 4.3, 4.4
// ============================================================================

describe('Feature: bulk-character-backup, Property 5: Import non-destruction of existing data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock portrait-related functions
    vi.mocked(isValidPortraitDataUrl).mockReturnValue(false);
    vi.mocked(base64ToBlob).mockReturnValue(null);
    vi.mocked(getPortraitStore).mockReturnValue({
      init: vi.fn().mockResolvedValue(undefined),
      isDegraded: vi.fn().mockReturnValue(false),
      savePortrait: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      getPortraitURL: vi.fn().mockResolvedValue({ ok: true, value: null }),
      getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
      deletePortrait: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
      revokeURL: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Validates: Requirements 4.1, 4.3, 4.4
   *
   * After restore, all pre-existing characters are unchanged,
   * and every imported character has a unique new ID distinct from all existing IDs.
   */
  it('existing characters are untouched and new IDs are unique', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbValidBackupEntry, { minLength: 1, maxLength: 5 }),
        fc.array(arbCharacterName, { minLength: 1, maxLength: 3 }),
        async (importEntries, existingNames) => {
          // Set up pre-existing character summaries
          const existingIds = existingNames.map(() => crypto.randomUUID());
          const existingSummaries = existingNames.map((name, i) => ({
            id: existingIds[i],
            name,
            species: 'Human',
            career: '',
            careerLevel: '',
            lastModified: Date.now(),
          }));

          vi.mocked(listCharacters).mockReturnValue(existingSummaries);

          // Track all new IDs generated by createCharacter
          const newIds: string[] = [];
          vi.mocked(createCharacter).mockImplementation(() => {
            const id = crypto.randomUUID();
            newIds.push(id);
            return id;
          });

          // Track all saveCharacter calls
          const savedIds: string[] = [];
          vi.mocked(saveCharacter).mockImplementation((id: string) => {
            savedIds.push(id);
            return { ok: true };
          });

          const promise = restoreCharacters(importEntries);
          await vi.runAllTimersAsync();
          const result = await promise;

          // createCharacter is called for each valid import entry
          expect(newIds.length).toBe(importEntries.length);

          // Every new ID is distinct from all existing IDs
          const existingIdSet = new Set(existingIds);
          for (const newId of newIds) {
            expect(existingIdSet.has(newId)).toBe(false);
          }

          // All new IDs are unique among themselves
          const newIdSet = new Set(newIds);
          expect(newIdSet.size).toBe(newIds.length);

          // saveCharacter is never called with an existing ID
          for (const savedId of savedIds) {
            expect(existingIdSet.has(savedId)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
