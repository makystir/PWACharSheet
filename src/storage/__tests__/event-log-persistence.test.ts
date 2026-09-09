import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCharacter, loadCharacter, saveCharacter } from '../character-manager';
import { exportToJSON, importFromJSON } from '../export-import';
import { EVENT_LOG_CAP } from '../../logic/event-log';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, LogEvent } from '../../types/character';

// In-memory localStorage mock (mirrors character-manager.test.ts setup).
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  });
  // Deterministic UUIDs so ids are stable within a test.
  let uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `evt-uuid-${++uuidCounter}`,
  });
});

/** Build a `roll` LogEvent with an explicit id/timestamp for assertions. */
function makeRollEvent(n: number): LogEvent {
  return {
    id: `event-${n}`,
    timestamp: 1_000 + n,
    category: 'roll',
    type: 'roll.skill',
    summary: `Melee: ${40 + n}/50 (SL ${n}, pass)`,
    payload: { name: 'Melee', roll: 40 + n, target: 50, sl: n, passed: true },
  };
}

/** The localStorage key a character is stored under. */
function charKey(id: string): string {
  return `wfrp4e-char-${id}`;
}

// Feature: unified-event-log, Task 7.3: persistence + export/import
describe('Event log — save/load round-trip (Req 1.5)', () => {
  it('preserves eventLog events across save then load', () => {
    const id = createCharacter('Timeline Tester');
    const char = loadCharacter(id)!;
    char.eventLog = [makeRollEvent(1), makeRollEvent(2), makeRollEvent(3)];
    saveCharacter(id, char);

    const loaded = loadCharacter(id)!;
    expect(loaded.eventLog).toHaveLength(3);
    expect(loaded.eventLog).toEqual(char.eventLog);
    // Individual field fidelity: ids, timestamps, summary, category equal.
    loaded.eventLog!.forEach((event, i) => {
      const original = char.eventLog![i];
      expect(event.id).toBe(original.id);
      expect(event.timestamp).toBe(original.timestamp);
      expect(event.summary).toBe(original.summary);
      expect(event.category).toBe(original.category);
    });
  });
});

describe('Event log — pre-feature character load (Req 10.1, 10.2)', () => {
  it('defaults eventLog to [] and preserves authoritative structures', () => {
    const id = createCharacter('Legacy Hero');

    // Build a "pre-feature" character WITHOUT eventLog but WITH the authoritative
    // structures populated, then store it directly under the char key.
    const preFeature: Partial<Character> = {
      ...structuredClone(BLANK_CHARACTER),
      name: 'Legacy Hero',
    };
    delete (preFeature as Record<string, unknown>).eventLog;
    preFeature.advancementLog = [
      { type: 'characteristic', name: 'WS', from: 30, to: 31, xpCost: 25, timestamp: 500, careerLevel: 'Level 1', inCareer: true },
    ];
    preFeature.advancementLogArchive = [
      { type: 'skill', name: 'Melee', from: 0, to: 1, xpCost: 10, timestamp: 400, careerLevel: 'Level 1', inCareer: true },
    ];
    preFeature.estate = {
      ...structuredClone(BLANK_CHARACTER.estate),
      ledger: [
        { timestamp: 600, type: 'income', description: 'Bounty', amount: { d: 0, ss: 0, gc: 5 } },
      ],
    };

    store.set(charKey(id), JSON.stringify(preFeature));

    const loaded = loadCharacter(id)!;
    // Absent eventLog normalises to [] (Req 10.1)
    expect(loaded.eventLog).toEqual([]);
    // Authoritative structures unchanged (Req 10.2)
    expect(loaded.advancementLog).toEqual(preFeature.advancementLog);
    expect(loaded.advancementLogArchive).toEqual(preFeature.advancementLogArchive);
    expect(loaded.estate.ledger).toEqual(preFeature.estate!.ledger);
  });
});

describe('Event log — export includes eventLog (Req 11.1)', () => {
  it('serialises eventLog with its events in exportToJSON output', () => {
    const character: Character = {
      ...structuredClone(BLANK_CHARACTER),
      name: 'Exporter',
      eventLog: [makeRollEvent(1), makeRollEvent(2)],
    };

    const json = exportToJSON(character);
    const parsed = JSON.parse(json) as Character;

    expect(parsed.eventLog).toHaveLength(2);
    expect(parsed.eventLog).toEqual(character.eventLog);
  });
});

describe('Event log — import of a v8 export restores it (Req 11.2)', () => {
  it('restores eventLog from a v8 export via importFromJSON', () => {
    const events = [makeRollEvent(1), makeRollEvent(2), makeRollEvent(3)];
    const exported = JSON.stringify({
      ...structuredClone(BLANK_CHARACTER),
      _v: 8,
      name: 'Importer',
      species: 'Human',
      eventLog: events,
    });

    const result = importFromJSON(exported);
    expect(result.success).toBe(true);
    expect(result.character!._v).toBe(8);
    expect(result.character!.eventLog).toEqual(events);
  });

  it('caps an oversized imported eventLog once the imported character is loaded', () => {
    // importFromJSON itself does NOT normalise — capping happens on load. Import
    // an oversized log, save it, then load to assert the cap is enforced.
    const oversized: LogEvent[] = Array.from({ length: EVENT_LOG_CAP + 25 }, (_, i) => makeRollEvent(i));
    const exported = JSON.stringify({
      ...structuredClone(BLANK_CHARACTER),
      _v: 8,
      name: 'Oversized Import',
      species: 'Human',
      eventLog: oversized,
    });

    const result = importFromJSON(exported);
    expect(result.success).toBe(true);

    const id = createCharacter('Oversized Import');
    saveCharacter(id, result.character!);
    const loaded = loadCharacter(id)!;

    expect(loaded.eventLog).toHaveLength(EVENT_LOG_CAP);
    // Retains the most-recent events (tail of the oldest-first store).
    expect(loaded.eventLog).toEqual(oversized.slice(oversized.length - EVENT_LOG_CAP));
  });
});

describe('Event log — oversized stored log is capped on load (Req 11.3)', () => {
  it('caps a stored eventLog longer than EVENT_LOG_CAP, retaining the most recent', () => {
    const id = createCharacter('Overflow');
    const oversized: LogEvent[] = Array.from({ length: EVENT_LOG_CAP + 50 }, (_, i) => makeRollEvent(i));
    const char = loadCharacter(id)!;
    char.eventLog = oversized;
    // Store directly (bypassing normalisation) to simulate an oversized persisted log.
    store.set(charKey(id), JSON.stringify(char));

    const loaded = loadCharacter(id)!;
    expect(loaded.eventLog).toHaveLength(EVENT_LOG_CAP);
    expect(loaded.eventLog).toEqual(oversized.slice(oversized.length - EVENT_LOG_CAP));
  });
});

describe('Event log — pre-v8 import yields empty log (Req 10.4)', () => {
  it('treats an imported eventLog as empty for a pre-v8 (no eventLog) export', () => {
    // A v7 export predates the eventLog field entirely.
    const preV8 = JSON.stringify({
      _v: 7,
      name: 'Pre-v8 Character',
      species: 'Dwarf',
      chars: structuredClone(BLANK_CHARACTER.chars),
    });

    const result = importFromJSON(preV8);
    expect(result.success).toBe(true);

    // importFromJSON fills eventLog from BLANK_CHARACTER default ([]) — the
    // absent field means no events. Confirmed as empty after a load round-trip.
    const id = createCharacter('Pre-v8 Character');
    saveCharacter(id, result.character!);
    const loaded = loadCharacter(id)!;
    expect(loaded.eventLog).toEqual([]);
  });
});
