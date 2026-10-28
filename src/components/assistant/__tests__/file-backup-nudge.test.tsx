import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BLANK_CHARACTER, type Character } from '../../../types/character';
import { useAssistantActions } from '../useAssistantActions';
import { fileBackupSuggestions } from '../../../logic/assistant/rules/file-backup';
import type { SuggestionContext } from '../../../logic/assistant/types';

/**
 * Nudge end-to-end dispatcher wiring (auto-backup design §9, test 13): the
 * `backup-file` action runs the existing export and, on success, invokes the
 * onFileBackedUp recompute trigger. Stale/null lastBackupAt surfaces the nudge;
 * a fresh backup does not.
 */

vi.mock('../../../storage/backup-service', () => ({
  assembleBackup: vi.fn(),
  downloadBackup: vi.fn(() => ({ ok: true })),
}));

import { assembleBackup, downloadBackup } from '../../../storage/backup-service';

const okPayload = {
  version: 1,
  exportedAt: new Date().toISOString(),
  characterCount: 0,
  characters: [],
};

function makeCharacter(): Character {
  return { ...structuredClone(BLANK_CHARACTER), name: 'Hero' };
}

function ctx(partial: Partial<SuggestionContext>): SuggestionContext {
  return { inCombat: false, ...partial };
}

beforeEach(() => {
  vi.mocked(assembleBackup).mockResolvedValue({ ok: true, payload: okPayload });
  vi.mocked(downloadBackup).mockClear();
});

describe('file-backup nudge', () => {
  it('surfaces the nudge when lastBackupAt is null/stale and not when fresh', () => {
    const now = 1_000_000_000_000;
    expect(fileBackupSuggestions(makeCharacter(), ctx({ now, lastBackupAt: null })).length).toBe(1);
    // Fresh backup (now) ⇒ no nudge.
    expect(fileBackupSuggestions(makeCharacter(), ctx({ now, lastBackupAt: now })).length).toBe(0);
  });

  it('dispatching backup-file runs assembleBackup + downloadBackup and invokes onFileBackedUp on success', async () => {
    const onFileBackedUp = vi.fn();
    const { result } = renderHook(() =>
      useAssistantActions({
        character: makeCharacter(),
        navigate: vi.fn(),
        openReminderRoll: vi.fn(),
        onFileBackedUp,
      }),
    );

    result.current({ kind: 'backup-file' });
    // The handler is fire-and-forget; flush microtasks.
    await vi.waitFor(() => {
      expect(assembleBackup).toHaveBeenCalledTimes(1);
      expect(downloadBackup).toHaveBeenCalledTimes(1);
      expect(onFileBackedUp).toHaveBeenCalledTimes(1);
    });
  });

  it('does not invoke onFileBackedUp when the download fails', async () => {
    vi.mocked(downloadBackup).mockReturnValueOnce({ ok: false, error: 'too large' });
    const onFileBackedUp = vi.fn();
    const { result } = renderHook(() =>
      useAssistantActions({
        character: makeCharacter(),
        navigate: vi.fn(),
        openReminderRoll: vi.fn(),
        onFileBackedUp,
      }),
    );

    result.current({ kind: 'backup-file' });
    await vi.waitFor(() => {
      expect(downloadBackup).toHaveBeenCalledTimes(1);
    });
    expect(onFileBackedUp).not.toHaveBeenCalled();
  });
});
