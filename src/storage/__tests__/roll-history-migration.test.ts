import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runMigration } from '../migration';
import { appendEvent } from '../../logic/event-log';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, CharacterIndex } from '../../types/character';
import type { RollResult } from '../../logic/dice-roller';

const INDEX_KEY = 'wfrp4e-characters';
const LEGACY_ROLL_HISTORY_KEY = 'wfrp-roll-history';
const ROLL_HISTORY_MIGRATED_KEY = 'wfrp-roll-history-migrated';

// In-memory localStorage mock (mirrors character-manager.test.ts setup)
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  });
  // Deterministic UUIDs so generated event ids don't collide
  let uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${++uuidCounter}`,
  });
});

/** Build a valid RollResult for a legacy roll-history entry. */
function makeRollResult(overrides: Partial<RollResult> = {}): RollResult {
  return {
    roll: 42,
    targetNumber: 55,
    baseTarget: 55,
    difficulty: 'Average',
    passed: true,
    sl: 1,
    isCritical: false,
    isFumble: false,
    isAutoSuccess: false,
    isAutoFailure: false,
    outcome: 'Success',
    skillOrCharName: 'Melee (Basic)',
    timestamp: 1000,
    ...overrides,
  };
}

/**
 * Seed a multi-char index with a single active character and store that
 * character. Returns the active character id.
 */
function seedActiveCharacter(id = 'active-char'): string {
  const character: Character = { ...structuredClone(BLANK_CHARACTER), name: 'Hero' };
  store.set(`wfrp4e-char-${id}`, JSON.stringify(character));
  const index: CharacterIndex = {
    activeId: id,
    characters: [
      {
        id,
        name: 'Hero',
        species: '',
        career: '',
        careerLevel: '',
        lastModified: 1,
      },
    ],
  };
  store.set(INDEX_KEY, JSON.stringify(index));
  return id;
}

function loadActiveCharacter(id: string): Character {
  return JSON.parse(store.get(`wfrp4e-char-${id}`)!) as Character;
}

describe('Roll-history migration (Req 4.3, 4.5, 4.6)', () => {
  it('imports legacy rolls as roll events on the active character, oldest-first, sets marker, removes legacy key', () => {
    const id = seedActiveCharacter();
    // Legacy store is newest-first: newer timestamp appears first.
    const legacyEntries = [
      { id: 2, result: makeRollResult({ skillOrCharName: 'Dodge', roll: 30, timestamp: 2000 }) },
      { id: 1, result: makeRollResult({ skillOrCharName: 'Melee (Basic)', roll: 42, timestamp: 1000 }) },
    ];
    store.set(LEGACY_ROLL_HISTORY_KEY, JSON.stringify(legacyEntries));

    runMigration();

    const char = loadActiveCharacter(id);
    const rollEvents = char.eventLog!.filter((e) => e.category === 'roll');
    expect(rollEvents).toHaveLength(2);

    // Stored oldest-first: timestamp 1000 (Melee) before 2000 (Dodge).
    expect(rollEvents[0].timestamp).toBe(1000);
    expect(rollEvents[0].payload.name).toBe('Melee (Basic)');
    expect(rollEvents[1].timestamp).toBe(2000);
    expect(rollEvents[1].payload.name).toBe('Dodge');

    // Marker set and legacy key removed.
    expect(store.get(ROLL_HISTORY_MIGRATED_KEY)).toBe('1');
    expect(store.get(LEGACY_ROLL_HISTORY_KEY)).toBeUndefined();
  });

  it('is idempotent: a second runMigration imports nothing (no duplicates)', () => {
    const id = seedActiveCharacter();
    const legacyEntries = [
      { id: 2, result: makeRollResult({ skillOrCharName: 'Dodge', timestamp: 2000 }) },
      { id: 1, result: makeRollResult({ skillOrCharName: 'Melee (Basic)', timestamp: 1000 }) },
    ];
    store.set(LEGACY_ROLL_HISTORY_KEY, JSON.stringify(legacyEntries));

    runMigration();
    const afterFirst = loadActiveCharacter(id).eventLog!.filter((e) => e.category === 'roll').length;
    expect(afterFirst).toBe(2);

    // Second run: marker already set, so nothing further is imported.
    runMigration();
    const afterSecond = loadActiveCharacter(id).eventLog!.filter((e) => e.category === 'roll').length;
    expect(afterSecond).toBe(2);
  });

  it('after migration, appendEvent writes a roll event to eventLog and nothing touches the legacy key', () => {
    const id = seedActiveCharacter();
    store.set(LEGACY_ROLL_HISTORY_KEY, JSON.stringify([
      { id: 1, result: makeRollResult({ skillOrCharName: 'Melee (Basic)', timestamp: 1000 }) },
    ]));

    runMigration();
    expect(store.get(LEGACY_ROLL_HISTORY_KEY)).toBeUndefined();

    // New rolls are appended to the character's eventLog (the migrated home),
    // not written back to the legacy global key. (Req 4.3, 4.6)
    const char = loadActiveCharacter(id);
    const before = char.eventLog!.filter((e) => e.category === 'roll').length;
    const updated = appendEvent(char, {
      category: 'roll',
      type: 'roll.generic',
      summary: 'Dodge: 30/55 (SL 2, pass)',
      payload: { name: 'Dodge', roll: 30, target: 55, sl: 2, passed: true, isCritical: false, isFumble: false },
    });
    store.set(`wfrp4e-char-${id}`, JSON.stringify(updated));

    const reloaded = loadActiveCharacter(id);
    const after = reloaded.eventLog!.filter((e) => e.category === 'roll');
    expect(after).toHaveLength(before + 1);
    expect(after[after.length - 1].payload.name).toBe('Dodge');

    // The legacy global roll-history key remains absent — nothing writes back.
    expect(store.get(LEGACY_ROLL_HISTORY_KEY)).toBeUndefined();
  });
});
