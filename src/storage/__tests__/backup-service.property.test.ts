/**
 * Feature: bulk-character-backup
 * Property-based tests for BackupService verifying structural integrity,
 * portrait fault tolerance, and progress reporting completeness.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

vi.mock('../character-manager');
vi.mock('../portrait-store');
vi.mock('../portrait-codec');

import { listCharacters, loadCharacter } from '../character-manager';
import { getPortraitStore } from '../portrait-store';
import { blobToBase64 } from '../portrait-codec';
import { assembleBackup } from '../backup-service';
import { validateBackupFile } from '../restore-service';
import { BLANK_CHARACTER } from '../../types/character';

// --- Generators ---

const arbCharacterName = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);
const arbSpecies = fc.constantFrom('Human', 'Dwarf', 'High Elf', 'Wood Elf', 'Halfling');
const arbCharValue = fc.record({ i: fc.nat(99), a: fc.nat(99), b: fc.nat(10) });
const arbChars = fc.record({
  WS: arbCharValue, BS: arbCharValue, S: arbCharValue, T: arbCharValue, I: arbCharValue,
  Ag: arbCharValue, Dex: arbCharValue, Int: arbCharValue, WP: arbCharValue, Fel: arbCharValue,
});

const arbCharacter = fc.tuple(arbCharacterName, arbSpecies, arbChars).map(([name, species, chars]) => ({
  ...structuredClone(BLANK_CHARACTER),
  name,
  species,
  chars,
}));

const arbCharacterId = fc.uuid();

// --- Helper to run assembleBackup with fake timers ---

async function runAssembleBackup(onProgress?: (current: number, total: number) => void) {
  const promise = assembleBackup(onProgress);
  // Flush all pending setTimeout(r, 0) calls iteratively until the promise resolves
  let resolved = false;
  const result = promise.then(r => { resolved = true; return r; });
  while (!resolved) {
    await vi.advanceTimersByTimeAsync(1);
  }
  return result;
}

// --- Property 1: Backup structural integrity ---

describe('Feature: bulk-character-backup, Property 1: Backup structural integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * **Validates: Requirements 1.2, 1.3, 1.4, 3.1, 3.2**
   *
   * For any non-empty set of characters, the assembled BackupFile has correct version,
   * valid ISO-8601 exportedAt, characterCount matching array length, and each entry
   * has id, character, and valid portrait field.
   */
  it('assembled BackupFile has correct structure for any non-empty character set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(arbCharacterId, arbCharacter), { minLength: 1, maxLength: 10 }),
        async (charPairs) => {
          vi.clearAllMocks();

          const ids = charPairs.map(([id]) => id);
          const characters = charPairs.map(([, c]) => c);

          const summaries = ids.map((id, i) => ({
            id,
            name: characters[i].name,
            species: characters[i].species,
            career: '',
            careerLevel: '',
            lastModified: Date.now(),
          }));

          vi.mocked(listCharacters).mockReturnValue(summaries);
          vi.mocked(loadCharacter).mockImplementation((id: string) => {
            const idx = ids.indexOf(id);
            return idx >= 0 ? characters[idx] : null;
          });

          const mockStore = {
            getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          };
          vi.mocked(getPortraitStore).mockReturnValue(mockStore as any);

          const result = await runAssembleBackup();

          expect(result.ok).toBe(true);
          if (!result.ok) return;

          const payload = result.payload;

          // version must be 1
          expect(payload.version).toBe(1);

          // exportedAt must be a valid ISO-8601 string
          const parsedDate = new Date(payload.exportedAt);
          expect(parsedDate.toISOString()).toBe(payload.exportedAt);
          expect(Number.isNaN(parsedDate.getTime())).toBe(false);

          // characterCount must match characters array length
          expect(payload.characterCount).toBe(payload.characters.length);
          expect(payload.characterCount).toBe(characters.length);

          // Each entry has id, character, and valid portrait field
          for (const entry of payload.characters) {
            expect(typeof entry.id).toBe('string');
            expect(entry.id.length).toBeGreaterThan(0);
            expect(entry.character).toBeDefined();
            expect(typeof entry.character).toBe('object');
            expect(entry.character).not.toBeNull();
            // portrait must be string (empty or data-URL)
            expect(typeof entry.portrait).toBe('string');
            if (entry.portrait !== '') {
              expect(entry.portrait).toMatch(/^data:image\/(jpeg|png|webp);base64,.+$/);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 6: Backup fault tolerance on portrait failure ---

describe('Feature: bulk-character-backup, Property 6: Backup fault tolerance on portrait failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * **Validates: Requirements 1.6, 6.6**
   *
   * When some portraits fail to load, those characters still appear in output
   * with `portrait === ""`, while successful portraits are correctly encoded.
   */
  it('characters with failed portraits appear with empty portrait, successful ones are encoded', async () => {
    const expectedPortraitUrl = 'data:image/png;base64,ZmFrZQ==';

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(arbCharacterId, arbCharacter), { minLength: 1, maxLength: 8 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }),
        async (charPairs, failFlags) => {
          vi.clearAllMocks();

          const ids = charPairs.map(([id]) => id);
          const characters = charPairs.map(([, c]) => c);

          // Align failFlags to the number of characters (cycle if needed)
          const flags = ids.map((_, i) => failFlags[i % failFlags.length]);

          const summaries = ids.map((id, i) => ({
            id,
            name: characters[i].name,
            species: characters[i].species,
            career: '',
            careerLevel: '',
            lastModified: Date.now(),
          }));

          vi.mocked(listCharacters).mockReturnValue(summaries);
          vi.mocked(loadCharacter).mockImplementation((id: string) => {
            const idx = ids.indexOf(id);
            return idx >= 0 ? characters[idx] : null;
          });

          const mockStore = {
            getPortraitBlob: vi.fn().mockImplementation(async (id: string) => {
              const idx = ids.indexOf(id);
              if (idx >= 0 && flags[idx]) {
                // Simulate failure: throw an error (the backup-service catches it)
                throw new Error('Portrait load failed');
              }
              // Success: return a blob
              return { ok: true, value: new Blob(['portrait-data'], { type: 'image/png' }) };
            }),
          };
          vi.mocked(getPortraitStore).mockReturnValue(mockStore as any);
          vi.mocked(blobToBase64).mockResolvedValue(expectedPortraitUrl);

          const result = await runAssembleBackup();

          expect(result.ok).toBe(true);
          if (!result.ok) return;

          const payload = result.payload;

          // All characters should appear in output
          expect(payload.characters.length).toBe(ids.length);

          // Verify portrait values match expectations
          for (let i = 0; i < ids.length; i++) {
            const entry = payload.characters[i];
            if (flags[i]) {
              // Portrait failed — should be empty string
              expect(entry.portrait).toBe('');
            } else {
              // Portrait succeeded — should have the encoded value
              expect(entry.portrait).toBe(expectedPortraitUrl);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 7: Progress reporting completeness ---

describe('Feature: bulk-character-backup, Property 7: Progress reporting completeness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * **Validates: Requirements 6.3, 6.4**
   *
   * For N characters, progress callback is invoked exactly N times with
   * arguments (1,N), (2,N), ..., (N,N) in strictly increasing order.
   */
  it('progress callback is invoked exactly N times with (1,N)...(N,N) in order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(arbCharacterId, arbCharacter), { minLength: 1, maxLength: 10 }),
        async (charPairs) => {
          vi.clearAllMocks();

          const ids = charPairs.map(([id]) => id);
          const characters = charPairs.map(([, c]) => c);
          const N = ids.length;

          const summaries = ids.map((id, i) => ({
            id,
            name: characters[i].name,
            species: characters[i].species,
            career: '',
            careerLevel: '',
            lastModified: Date.now(),
          }));

          vi.mocked(listCharacters).mockReturnValue(summaries);
          vi.mocked(loadCharacter).mockImplementation((id: string) => {
            const idx = ids.indexOf(id);
            return idx >= 0 ? characters[idx] : null;
          });

          const mockStore = {
            getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: null }),
          };
          vi.mocked(getPortraitStore).mockReturnValue(mockStore as any);

          const progressCalls: Array<[number, number]> = [];
          const onProgress = (current: number, total: number) => {
            progressCalls.push([current, total]);
          };

          const result = await runAssembleBackup(onProgress);

          // Ensure backup succeeded
          expect(result.ok).toBe(true);

          // Exactly N calls
          expect(progressCalls.length).toBe(N);

          // Each call should be (i+1, N) in order
          for (let i = 0; i < N; i++) {
            expect(progressCalls[i]).toEqual([i + 1, N]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// --- Property 3: Export-Import round-trip preservation ---

describe('Feature: bulk-character-backup, Property 3: Export-Import round-trip preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * **Validates: Requirements 3.3**
   *
   * For any set of valid characters with portraits, export then import into empty app
   * produces characters field-by-field equal to originals for user-authored fields,
   * excluding system-generated IDs.
   */
  it('exported characters match originals field-by-field after round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(arbCharacterId, arbCharacter), { minLength: 1, maxLength: 5 }),
        async (charPairs) => {
          vi.clearAllMocks();

          const ids = charPairs.map(([id]) => id);
          const characters = charPairs.map(([, c]) => c);

          const summaries = ids.map((id, i) => ({
            id,
            name: characters[i].name,
            species: characters[i].species,
            career: '',
            careerLevel: '',
            lastModified: Date.now(),
          }));

          vi.mocked(listCharacters).mockReturnValue(summaries);
          vi.mocked(loadCharacter).mockImplementation((id: string) => {
            const idx = ids.indexOf(id);
            return idx >= 0 ? characters[idx] : null;
          });

          // Mock portrait store - return a valid portrait for each character
          const fakePortraitUrl = 'data:image/png;base64,ZmFrZQ==';
          const mockStore = {
            getPortraitBlob: vi.fn().mockResolvedValue({ ok: true, value: new Blob(['img'], { type: 'image/png' }) }),
          };
          vi.mocked(getPortraitStore).mockReturnValue(mockStore as any);
          vi.mocked(blobToBase64).mockResolvedValue(fakePortraitUrl);

          // Step 1: Export via assembleBackup
          const result = await runAssembleBackup();

          expect(result.ok).toBe(true);
          if (!result.ok) return;

          const payload = result.payload;

          // Step 2: Validate the exported payload via validateBackupFile (real function)
          const serialized = JSON.stringify(payload);
          const validation = validateBackupFile(serialized);

          expect(validation.ok).toBe(true);
          if (!validation.ok) return;

          // Step 3: Verify round-trip character equality
          // assembleBackup does JSON.parse(JSON.stringify(character)), so the expected
          // value is the JSON round-trip of the original character.
          expect(validation.characters.length).toBe(characters.length);

          for (let i = 0; i < characters.length; i++) {
            const entry = validation.characters[i];
            const expected = JSON.parse(JSON.stringify(characters[i]));

            // User-authored fields must be preserved through the round-trip
            expect(entry.character).toEqual(expected);

            // Portrait should be preserved
            expect(entry.portrait).toBe(fakePortraitUrl);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
