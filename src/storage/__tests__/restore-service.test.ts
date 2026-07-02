/**
 * Unit tests for RestoreService edge cases.
 *
 * Tests:
 *   - Duplicate detection returns correct names (Requirement 4.2)
 *   - Quota error mid-import stops and reports correctly (Requirement 2.8)
 *   - Confirmation data extraction — character count and names (Requirement 2.4)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateBackupFile, detectDuplicates, restoreCharacters } from '../restore-service';

vi.mock('../character-manager');
vi.mock('../portrait-store');
vi.mock('../portrait-codec');

import { createCharacter, saveCharacter, listCharacters } from '../character-manager';
import { getPortraitStore } from '../portrait-store';
import { base64ToBlob, isValidPortraitDataUrl } from '../portrait-codec';

// --- Helpers ---

const makeValidEntry = (name: string) => ({
  id: crypto.randomUUID(),
  character: {
    _v: 7,
    name,
    species: 'Human',
    chars: {
      WS: { i: 30, a: 5, b: 0 },
      BS: { i: 25, a: 0, b: 0 },
      S: { i: 35, a: 10, b: 0 },
      T: { i: 40, a: 5, b: 0 },
      I: { i: 30, a: 0, b: 0 },
      Ag: { i: 28, a: 3, b: 0 },
      Dex: { i: 32, a: 0, b: 0 },
      Int: { i: 35, a: 5, b: 0 },
      WP: { i: 30, a: 0, b: 0 },
      Fel: { i: 25, a: 0, b: 0 },
    },
  } as Record<string, unknown>,
  portrait: '',
});

// ============================================================================
// Duplicate detection (Requirement 4.2)
// ============================================================================

describe('detectDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns names that match existing characters', () => {
    vi.mocked(listCharacters).mockReturnValue([
      { id: '1', name: 'Aldric', species: 'Human', career: '', careerLevel: '', lastModified: 0 },
      { id: '2', name: 'Brunhild', species: 'Dwarf', career: '', careerLevel: '', lastModified: 0 },
    ]);

    const backupCharacters = [
      makeValidEntry('Aldric'),
      makeValidEntry('Cassius'),
      makeValidEntry('Brunhild'),
      makeValidEntry('Daria'),
    ];

    const result = detectDuplicates(backupCharacters);

    expect(result).toContain('Aldric');
    expect(result).toContain('Brunhild');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no duplicates exist', () => {
    vi.mocked(listCharacters).mockReturnValue([
      { id: '1', name: 'Aldric', species: 'Human', career: '', careerLevel: '', lastModified: 0 },
    ]);

    const backupCharacters = [
      makeValidEntry('Cassius'),
      makeValidEntry('Daria'),
    ];

    const result = detectDuplicates(backupCharacters);

    expect(result).toHaveLength(0);
  });

  it('returns empty array when there are no existing characters', () => {
    vi.mocked(listCharacters).mockReturnValue([]);

    const backupCharacters = [
      makeValidEntry('Aldric'),
      makeValidEntry('Brunhild'),
    ];

    const result = detectDuplicates(backupCharacters);

    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// Quota error mid-import (Requirement 2.8)
// ============================================================================

describe('restoreCharacters — quota error mid-import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(listCharacters).mockReturnValue([]);
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

  it('stops importing when saveCharacter returns { ok: false } and reports quota error', async () => {
    // createCharacter returns a new UUID each time
    vi.mocked(createCharacter).mockImplementation(() => crypto.randomUUID());

    // saveCharacter succeeds for first 2, then fails on 3rd
    let saveCallCount = 0;
    vi.mocked(saveCharacter).mockImplementation(() => {
      saveCallCount++;
      if (saveCallCount <= 2) {
        return { ok: true };
      }
      return { ok: false, error: 'QuotaExceededError' };
    });

    const characters = [
      makeValidEntry('Char1'),
      makeValidEntry('Char2'),
      makeValidEntry('Char3'),
      makeValidEntry('Char4'),
      makeValidEntry('Char5'),
    ];

    const promise = restoreCharacters(characters);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.imported).toBe(2);
    expect(result.stoppedByQuota).toBe(true);
    // Characters 4 and 5 should not have been processed at all
    expect(saveCallCount).toBe(3); // Only called 3 times (2 success + 1 failure)
  });
});

// ============================================================================
// Confirmation data extraction (Requirement 2.4)
// ============================================================================

describe('validateBackupFile — confirmation data extraction', () => {
  it('reports correct characterCount for a backup with 60 characters', () => {
    const characters = Array.from({ length: 60 }, (_, i) =>
      makeValidEntry(`Character ${i + 1}`)
    );

    const backupFile = {
      version: 1,
      exportedAt: '2025-01-15T14:30:00.000Z',
      characterCount: 60,
      characters,
    };

    const result = validateBackupFile(JSON.stringify(backupFile));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.characterCount).toBe(60);
      expect(result.characters).toHaveLength(60);
    }
  });

  it('provides character names in the characters array for UI display', () => {
    const characters = Array.from({ length: 60 }, (_, i) =>
      makeValidEntry(`Hero ${i + 1}`)
    );

    const backupFile = {
      version: 1,
      exportedAt: '2025-01-15T14:30:00.000Z',
      characterCount: 60,
      characters,
    };

    const result = validateBackupFile(JSON.stringify(backupFile));

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Service returns all characters — UI handles truncation at 50
      expect(result.characters.length).toBe(60);
      // Verify names are accessible from the entries
      const names = result.characters.map(c => (c.character as any).name);
      expect(names[0]).toBe('Hero 1');
      expect(names[49]).toBe('Hero 50');
      expect(names[59]).toBe('Hero 60');
    }
  });
});
