/**
 * Unit tests for BackupService edge cases.
 *
 * Validates:
 * - Filename format matches wfrp4e-backup_YYYYMMDD-HHmm.json (Requirement 1.5)
 * - Empty character list returns error without producing file (Requirement 1.7)
 * - Blob creation failure returns "too large" error message (Requirement 6.5)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../character-manager');
vi.mock('../portrait-store');
vi.mock('../portrait-codec');

import { listCharacters } from '../character-manager';
import { assembleBackup, downloadBackup } from '../backup-service';
import type { BackupFile } from '../backup-types';

// --- Helpers ---

function makeMinimalPayload(): BackupFile {
  return {
    version: 1,
    exportedAt: '2025-06-15T14:30:00.000Z',
    characterCount: 1,
    characters: [
      {
        id: 'test-id-1',
        character: { name: 'Test', species: 'Human', chars: {} },
        portrait: '',
      },
    ],
  };
}

// --- Test: Filename format ---

describe('downloadBackup filename format', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T14:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Validates: Requirement 1.5
   * The filename must be formatted as wfrp4e-backup_YYYYMMDD-HHmm.json
   * using the user's local date/time.
   */
  it('produces filename in wfrp4e-backup_YYYYMMDD-HHmm.json format', () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const payload = makeMinimalPayload();
    const result = downloadBackup(payload);

    expect(result.ok).toBe(true);
    expect(mockAnchor.download).toBe('wfrp4e-backup_20250615-1430.json');
  });

  it('filename matches the pattern wfrp4e-backup_YYYYMMDD-HHmm.json', () => {
    const mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor as any);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const payload = makeMinimalPayload();
    downloadBackup(payload);

    expect(mockAnchor.download).toMatch(/^wfrp4e-backup_\d{8}-\d{4}\.json$/);
  });
});

// --- Test: Empty character list ---

describe('assembleBackup with no characters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Validates: Requirement 1.7
   * If no characters exist, return an error result and produce no file.
   */
  it('returns error when character list is empty', async () => {
    vi.mocked(listCharacters).mockReturnValue([]);

    const promise = assembleBackup();
    // No setTimeout yielding needed since it returns early
    const result = await promise;

    expect(result).toEqual({ ok: false, error: 'No characters to back up.' });
  });

  it('does not trigger a file download when no characters exist', async () => {
    vi.mocked(listCharacters).mockReturnValue([]);

    const createElementSpy = vi.spyOn(document, 'createElement');

    const result = await assembleBackup();

    expect(result.ok).toBe(false);
    // No anchor element should have been created (no download triggered)
    expect(createElementSpy).not.toHaveBeenCalledWith('a');

    createElementSpy.mockRestore();
  });
});

// --- Test: Blob creation failure ---

describe('downloadBackup Blob creation failure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Validates: Requirement 6.5
   * If Blob construction fails, return an error indicating the backup is too large.
   */
  it('returns "too large" error when Blob constructor throws', () => {
    const originalBlob = globalThis.Blob;
    globalThis.Blob = class {
      constructor() {
        throw new Error('Blob too large');
      }
    } as any;

    try {
      const payload = makeMinimalPayload();
      const result = downloadBackup(payload);

      expect(result).toEqual({
        ok: false,
        error: 'Backup file is too large to download. Try exporting characters in smaller groups.',
      });
    } finally {
      globalThis.Blob = originalBlob;
    }
  });

  it('returns "too large" error when JSON.stringify throws', () => {
    const originalStringify = JSON.stringify;
    JSON.stringify = () => {
      throw new Error('Maximum call stack size exceeded');
    };

    try {
      const payload = makeMinimalPayload();
      const result = downloadBackup(payload);

      expect(result).toEqual({
        ok: false,
        error: 'Backup file is too large to download. Try exporting characters in smaller groups.',
      });
    } finally {
      JSON.stringify = originalStringify;
    }
  });
});
