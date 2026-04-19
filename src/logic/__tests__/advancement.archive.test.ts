import { describe, it, expect } from 'vitest';
import { archiveOldEntries, restoreArchivedEntry } from '../advancement';
import type { Character, CharacteristicKey, CharacteristicValue, AdvancementEntry } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  const chars: Record<CharacteristicKey, CharacteristicValue> = {} as any;
  for (const key of ALL_CHAR_KEYS) {
    chars[key] = { i: 30, a: 0, b: 0 };
  }
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Hero',
    species: 'Human / Reiklander',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    careerPath: 'Recruit',
    status: 'Silver 1',
    chars,
    xpCur: 500,
    xpSpent: 0,
    xpTotal: 500,
    bSkills: [
      { n: 'Athletics', c: 'Ag', a: 0 },
      { n: 'Cool', c: 'WP', a: 5 },
      { n: 'Dodge', c: 'Ag', a: 10 },
    ],
    aSkills: [
      { n: 'Language (Battle)', c: 'Int', a: 0 },
    ],
    talents: [],
    advancementLog: [],
    advancementLogArchive: [],
    ...overrides,
  };
}

function makeEntry(overrides: Partial<AdvancementEntry> = {}): AdvancementEntry {
  return {
    timestamp: 1000,
    type: 'characteristic',
    name: 'WS',
    from: 0,
    to: 1,
    xpCost: 25,
    careerLevel: 'Recruit',
    inCareer: true,
    ...overrides,
  };
}

/** Generate an array of N entries with sequential timestamps starting at `startTs`. */
function makeEntries(count: number, startTs: number = 1): AdvancementEntry[] {
  return Array.from({ length: count }, (_, i) =>
    makeEntry({ timestamp: startTs + i, name: `Entry${i}`, from: i, to: i + 1 }),
  );
}

// ─── archiveOldEntries ───────────────────────────────────────────────────────

describe('archiveOldEntries', () => {
  it('returns character unchanged when log has ≤100 entries', () => {
    const log = makeEntries(100, 1);
    const char = makeTestCharacter({ advancementLog: log });

    const result = archiveOldEntries(char);

    expect(result).toBe(char); // same reference — no-op
  });

  it('returns character unchanged when log has fewer than 100 entries', () => {
    const log = makeEntries(50, 1);
    const char = makeTestCharacter({ advancementLog: log });

    const result = archiveOldEntries(char);

    expect(result).toBe(char);
  });

  it('archives overflow entries when log has >100 entries (103 → 100 active + 3 archived)', () => {
    const log = makeEntries(103, 1);
    const char = makeTestCharacter({ advancementLog: log });

    const result = archiveOldEntries(char);

    expect(result.advancementLog).toHaveLength(100);
    expect(result.advancementLogArchive).toHaveLength(3);
  });

  it('the 100 remaining active entries are the most recent by array position', () => {
    const log = makeEntries(103, 1);
    const char = makeTestCharacter({ advancementLog: log });

    const result = archiveOldEntries(char);

    // The original entries at indices 3..102 (timestamps 4..103) should remain
    expect(result.advancementLog[0].timestamp).toBe(4);
    expect(result.advancementLog[99].timestamp).toBe(103);
  });

  it('archived entries are sorted by timestamp ascending', () => {
    const log = makeEntries(105, 1);
    const char = makeTestCharacter({ advancementLog: log });

    const result = archiveOldEntries(char);

    // 5 entries archived: timestamps 1, 2, 3, 4, 5
    expect(result.advancementLogArchive).toHaveLength(5);
    for (let i = 1; i < result.advancementLogArchive.length; i++) {
      expect(result.advancementLogArchive[i].timestamp)
        .toBeGreaterThanOrEqual(result.advancementLogArchive[i - 1].timestamp);
    }
    expect(result.advancementLogArchive[0].timestamp).toBe(1);
    expect(result.advancementLogArchive[4].timestamp).toBe(5);
  });

  it('merges with existing archive entries and re-sorts by timestamp', () => {
    const existingArchive = [
      makeEntry({ timestamp: 10, name: 'OldArchive1' }),
      makeEntry({ timestamp: 30, name: 'OldArchive2' }),
      makeEntry({ timestamp: 50, name: 'OldArchive3' }),
      makeEntry({ timestamp: 70, name: 'OldArchive4' }),
      makeEntry({ timestamp: 90, name: 'OldArchive5' }),
    ];
    // 102 active entries with timestamps 20, 21, ..., 121
    const log = makeEntries(102, 20);
    const char = makeTestCharacter({
      advancementLog: log,
      advancementLogArchive: existingArchive,
    });

    const result = archiveOldEntries(char);

    // 2 overflow entries (timestamps 20, 21) merged with 5 existing = 7 archived
    expect(result.advancementLogArchive).toHaveLength(7);
    expect(result.advancementLog).toHaveLength(100);

    // Verify sorted ascending by timestamp
    for (let i = 1; i < result.advancementLogArchive.length; i++) {
      expect(result.advancementLogArchive[i].timestamp)
        .toBeGreaterThanOrEqual(result.advancementLogArchive[i - 1].timestamp);
    }
    // The merged archive should interleave: 10, 20, 21, 30, 50, 70, 90
    expect(result.advancementLogArchive.map(e => e.timestamp)).toEqual([10, 20, 21, 30, 50, 70, 90]);
  });

  it('total entry count (active + archive) is preserved', () => {
    const existingArchive = makeEntries(5, 1);
    const log = makeEntries(110, 100);
    const char = makeTestCharacter({
      advancementLog: log,
      advancementLogArchive: existingArchive,
    });

    const totalBefore = char.advancementLog.length + char.advancementLogArchive.length;
    const result = archiveOldEntries(char);
    const totalAfter = result.advancementLog.length + result.advancementLogArchive.length;

    expect(totalAfter).toBe(totalBefore);
  });

  it('does not mutate the input character object', () => {
    const log = makeEntries(103, 1);
    const char = makeTestCharacter({ advancementLog: log });
    const snapshot = JSON.parse(JSON.stringify(char));

    archiveOldEntries(char);

    expect(char).toEqual(snapshot);
  });
});

// ─── restoreArchivedEntry ────────────────────────────────────────────────────

describe('restoreArchivedEntry', () => {
  it('moves the entry at the given index from archive to active log', () => {
    const archive = [
      makeEntry({ timestamp: 1, name: 'Archived1' }),
      makeEntry({ timestamp: 2, name: 'Archived2' }),
      makeEntry({ timestamp: 3, name: 'Archived3' }),
    ];
    const activeLog = [makeEntry({ timestamp: 100, name: 'Active1' })];
    const char = makeTestCharacter({
      advancementLog: activeLog,
      advancementLogArchive: archive,
    });

    const result = restoreArchivedEntry(char, 1);

    // Archive should have 2 entries (index 0 and 2 from original)
    expect(result.advancementLogArchive).toHaveLength(2);
    expect(result.advancementLogArchive[0].name).toBe('Archived1');
    expect(result.advancementLogArchive[1].name).toBe('Archived3');

    // Active log should have the original entry + the restored one appended
    expect(result.advancementLog).toHaveLength(2);
    expect(result.advancementLog[0].name).toBe('Active1');
    expect(result.advancementLog[1].name).toBe('Archived2');
  });

  it('returns character unchanged for negative index', () => {
    const archive = [makeEntry({ timestamp: 1, name: 'Archived1' })];
    const char = makeTestCharacter({ advancementLogArchive: archive });

    const result = restoreArchivedEntry(char, -1);

    expect(result).toBe(char); // same reference — no-op
  });

  it('returns character unchanged for index >= archive length', () => {
    const archive = [
      makeEntry({ timestamp: 1, name: 'Archived1' }),
      makeEntry({ timestamp: 2, name: 'Archived2' }),
    ];
    const char = makeTestCharacter({ advancementLogArchive: archive });

    const result = restoreArchivedEntry(char, 2);
    expect(result).toBe(char);

    const result2 = restoreArchivedEntry(char, 100);
    expect(result2).toBe(char);
  });

  it('restoring the last entry results in an empty archive', () => {
    const archive = [makeEntry({ timestamp: 1, name: 'OnlyEntry' })];
    const char = makeTestCharacter({ advancementLogArchive: archive });

    const result = restoreArchivedEntry(char, 0);

    expect(result.advancementLogArchive).toHaveLength(0);
    expect(result.advancementLog).toHaveLength(1);
    expect(result.advancementLog[0].name).toBe('OnlyEntry');
  });

  it('does not mutate the input character object', () => {
    const archive = [
      makeEntry({ timestamp: 1, name: 'Archived1' }),
      makeEntry({ timestamp: 2, name: 'Archived2' }),
    ];
    const activeLog = [makeEntry({ timestamp: 100, name: 'Active1' })];
    const char = makeTestCharacter({
      advancementLog: activeLog,
      advancementLogArchive: archive,
    });
    const snapshot = JSON.parse(JSON.stringify(char));

    restoreArchivedEntry(char, 0);

    expect(char).toEqual(snapshot);
  });
});
