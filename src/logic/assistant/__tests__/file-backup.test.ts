import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { fileBackupSuggestions } from '../rules/file-backup';
import { getSuggestions } from '../engine';
import type { SuggestionContext } from '../types';
import { BLANK_CHARACTER, type Character } from '../../../types/character';
import { BACKUP_STALE_DAYS, getBackupReminder } from '../../../storage/backup-reminder';

/**
 * Pure tests for the file-backup nudge module (auto-backup design §9, test 4).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function makeCharacter(inCombat: boolean): Character {
  const c = structuredClone(BLANK_CHARACTER);
  c.combatState = { ...c.combatState, inCombat };
  return c;
}

function ctx(partial: Partial<SuggestionContext>): SuggestionContext {
  return { inCombat: false, ...partial };
}

describe('fileBackupSuggestions (pure)', () => {
  it('emits exactly one suggestion iff getBackupReminder(lastBackupAt, now).show (out of combat)', () => {
    fc.assert(
      fc.property(
        fc.option(fc.integer({ min: 0, max: 60 }), { nil: null }), // days since, or null (never)
        (daysSince) => {
          const now = 1_000_000_000_000;
          const lastBackupAt = daysSince === null ? null : now - daysSince * MS_PER_DAY;
          const result = fileBackupSuggestions(makeCharacter(false), ctx({ now, lastBackupAt }));
          const expectedShow = getBackupReminder(lastBackupAt, now).show;
          expect(result.length).toBe(expectedShow ? 1 : 0);
          if (result.length === 1) {
            expect(result[0].action).toEqual({ kind: 'backup-file' });
            // Serializable through the SuggestionSource boundary.
            const round = JSON.parse(JSON.stringify(result[0]));
            expect(round).toEqual(result[0]);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('is silent with a recent backup', () => {
    const now = 1_000_000_000_000;
    const recent = now - (BACKUP_STALE_DAYS - 1) * MS_PER_DAY;
    expect(fileBackupSuggestions(makeCharacter(false), ctx({ now, lastBackupAt: recent }))).toEqual([]);
  });

  it('is silent in combat even when a backup is stale/never', () => {
    const now = 1_000_000_000_000;
    expect(
      fileBackupSuggestions(makeCharacter(true), ctx({ inCombat: true, now, lastBackupAt: null })),
    ).toEqual([]);
  });
});

describe('engine purity (Finding 4)', () => {
  it('does not read getLastBackupAt when invoked via getSuggestions with ctx values set', async () => {
    const reminderModule = await import('../../../storage/backup-reminder');
    const spy = vi.spyOn(reminderModule, 'getLastBackupAt');

    const now = 1_000_000_000_000;
    getSuggestions(makeCharacter(false), ctx({ now, lastBackupAt: null }));

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
