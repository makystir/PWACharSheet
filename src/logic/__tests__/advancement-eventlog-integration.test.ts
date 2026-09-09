import { describe, it, expect } from 'vitest';
import { advanceCharacteristic, undoAdvancement, redoAdvancement } from '../advancement';
import type {
  Character,
  CharacteristicKey,
  CharacteristicValue,
  AdvancementEventPayload,
  LogEvent,
} from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

// ─── Integration: advancement mirror events vs. undo/redo independence ───────
//
// This suite exercises the unified-event-log "mirror + migrate" model as it
// applies to advancement (spec: .kiro/specs/unified-event-log):
//
//   - advancement mechanics remain authoritative on the typed `advancementLog`
//     and XP fields; the event log is written ONLY as a display-only mirror
//     (Req 5.1, 5.2, 5.4).
//   - undo/redo reconstruct advancement state, XP totals and the log purely from
//     `advancementLog` — they NEVER read `eventLog` (Req 5.3, 5.5).
//   - undo APPENDS an undo mirror event rather than deleting prior events
//     (Req 5.4).
//
// Validates: Requirements 5.3, 5.4, 5.5

const ALL_CHAR_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

function makeChars(
  overrides: Partial<Record<CharacteristicKey, CharacteristicValue>> = {},
): Record<CharacteristicKey, CharacteristicValue> {
  const chars = Object.fromEntries(
    ALL_CHAR_KEYS.map((key) => [key, { i: 30, a: 0, b: 0 }]),
  ) as Record<CharacteristicKey, CharacteristicValue>;
  for (const [key, value] of Object.entries(overrides)) {
    chars[key as CharacteristicKey] = value!;
  }
  return chars;
}

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Hero',
    species: 'Human / Reiklander',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    careerPath: 'Recruit',
    status: 'Silver 1',
    chars: makeChars(),
    xpCur: 500,
    xpSpent: 0,
    xpTotal: 500,
    bSkills: [
      { n: 'Athletics', c: 'Ag', a: 0 },
      { n: 'Cool', c: 'WP', a: 5 },
    ],
    aSkills: [],
    talents: [],
    advancementLog: [],
    advancementLogArchive: [],
    eventLog: [],
    ...overrides,
  };
}

/** Narrow a LogEvent's payload to the advancement mirror shape for assertions. */
function advPayload(event: LogEvent): AdvancementEventPayload {
  return event.payload as unknown as AdvancementEventPayload;
}

// ─── 1. Advance appends exactly one advancement mirror event ─────────────────

describe('advanceCharacteristic mirrors to eventLog without affecting mechanics', () => {
  it('appends one advancement mirror event; advancementLog + XP updated correctly', () => {
    const char = makeTestCharacter(); // WS.a = 0, in-career cost for 0→1 = 25 XP
    const advanced = advanceCharacteristic(char, 'WS', true);

    // Authoritative advancement structure is updated.
    expect(advanced.chars.WS.a).toBe(1);
    expect(advanced.advancementLog).toHaveLength(1);
    const entry = advanced.advancementLog[0];
    expect(entry.type).toBe('characteristic');
    expect(entry.name).toBe('WS');
    expect(entry.from).toBe(0);
    expect(entry.to).toBe(1);

    // XP moved by the entry's cost.
    expect(advanced.xpCur).toBe(char.xpCur - entry.xpCost);
    expect(advanced.xpSpent).toBe(char.xpSpent + entry.xpCost);

    // Exactly one mirror event appended, category 'advancement', not an undo.
    expect(advanced.eventLog).toHaveLength(1);
    const mirror = advanced.eventLog![0];
    expect(mirror.category).toBe('advancement');
    expect(advPayload(mirror).undo).toBe(false);
    expect(advPayload(mirror).name).toBe('WS');
    expect(advPayload(mirror).from).toBe(0);
    expect(advPayload(mirror).to).toBe(1);
  });
});

// ─── 2. Undo APPENDS an undo mirror event (does not delete prior events) ─────

describe('undoAdvancement appends an undo mirror rather than deleting events', () => {
  it('removes the advancementLog entry, restores XP, and appends a 2nd (undo) event', () => {
    const char = makeTestCharacter();
    const advanced = advanceCharacteristic(char, 'WS', true);
    const cost = advanced.advancementLog[0].xpCost;

    const undoResult = undoAdvancement(advanced);
    expect(undoResult).not.toBeNull();
    const undone = undoResult!.character;

    // Authoritative structure: entry removed, characteristic reverted, XP restored.
    expect(undone.advancementLog).toHaveLength(0);
    expect(undone.chars.WS.a).toBe(0);
    expect(undone.xpCur).toBe(char.xpCur);
    expect(undone.xpSpent).toBe(char.xpSpent);

    // eventLog now has TWO events: the original advance mirror + a new undo
    // mirror. Undo APPENDS, it does not delete the prior event (Req 5.4).
    expect(undone.eventLog).toHaveLength(2);

    // The first (original) event is preserved unchanged.
    expect(undone.eventLog![0]).toEqual(advanced.eventLog![0]);
    expect(advPayload(undone.eventLog![0]).undo).toBe(false);

    // The second is the undo mirror with payload.undo === true.
    const undoEvent = undone.eventLog![1];
    expect(undoEvent.category).toBe('advancement');
    expect(advPayload(undoEvent).undo).toBe(true);
    expect(advPayload(undoEvent).name).toBe('WS');
    expect(undoEvent.summary).toContain(`+${cost} XP`);
  });
});

// ─── 3. Redo re-applies mechanics and appends a 3rd (redo) mirror event ──────

describe('redoAdvancement re-applies advancement and appends a redo mirror', () => {
  it('advance → undo → redo: advancementLog + XP restored, eventLog gains a 3rd event', () => {
    const char = makeTestCharacter();
    const advanced = advanceCharacteristic(char, 'WS', true);

    const undoResult = undoAdvancement(advanced);
    expect(undoResult).not.toBeNull();
    const undone = undoResult!.character;

    const redoResult = redoAdvancement(undone, undoResult!.undoneEntry);
    expect(redoResult).not.toBeNull();
    const redone = redoResult!.character;

    // Authoritative structure back to the advanced state.
    expect(redone.chars.WS.a).toBe(advanced.chars.WS.a);
    expect(redone.advancementLog).toHaveLength(1);
    expect(redone.advancementLog[0]).toEqual(advanced.advancementLog[0]);
    expect(redone.xpCur).toBe(advanced.xpCur);
    expect(redone.xpSpent).toBe(advanced.xpSpent);

    // eventLog grew to THREE events: advance, undo, redo.
    expect(redone.eventLog).toHaveLength(3);
    // Prior two events are preserved.
    expect(redone.eventLog![0]).toEqual(advanced.eventLog![0]);
    expect(redone.eventLog![1]).toEqual(undone.eventLog![1]);
    // Third is the redo mirror — a normal (non-undo) advancement event.
    const redoEvent = redone.eventLog![2];
    expect(redoEvent.category).toBe('advancement');
    expect(advPayload(redoEvent).undo).toBe(false);
    expect(advPayload(redoEvent).name).toBe('WS');
  });
});

// ─── 4. Undo/redo NEVER read eventLog (Req 5.3, 5.5) ─────────────────────────
//
// The mechanics reconstruct from advancementLog + XP fields only. Artificially
// replacing eventLog with [] or garbage must not change the resulting
// advancementLog, characteristic value, or XP totals — proving eventLog is
// never consulted to reconstruct state.

describe('undo/redo ignore eventLog contents entirely', () => {
  it('undo produces identical advancementLog + XP whether eventLog is empty or garbage', () => {
    const char = makeTestCharacter();
    const advanced = advanceCharacteristic(char, 'WS', true);

    // Baseline undo from the real (mirrored) character.
    const baseline = undoAdvancement(advanced);
    expect(baseline).not.toBeNull();

    // Same advancement mechanics, but eventLog wiped to [].
    const wiped: Character = { ...advanced, eventLog: [] };
    const undoWiped = undoAdvancement(wiped);
    expect(undoWiped).not.toBeNull();

    // Same advancement mechanics, but eventLog replaced with garbage records.
    const garbageLog = [
      { id: 'garbage-1', timestamp: 1, category: 'roll', type: 'nonsense', summary: 'junk', payload: { foo: 'bar' } },
      { id: 'garbage-2', timestamp: 2, category: 'combat', type: 'more-nonsense', summary: 'junk', payload: {} },
    ] as unknown as LogEvent[];
    const garbaged: Character = { ...advanced, eventLog: garbageLog };
    const undoGarbaged = undoAdvancement(garbaged);
    expect(undoGarbaged).not.toBeNull();

    // Advancement mechanics (log, characteristic, XP) are identical regardless
    // of eventLog contents — eventLog is never read (Req 5.3, 5.5).
    for (const result of [undoWiped!, undoGarbaged!]) {
      expect(result.character.advancementLog).toEqual(baseline!.character.advancementLog);
      expect(result.character.chars.WS.a).toBe(baseline!.character.chars.WS.a);
      expect(result.character.xpCur).toBe(baseline!.character.xpCur);
      expect(result.character.xpSpent).toBe(baseline!.character.xpSpent);
    }

    // And the undone entry is identical too.
    expect(undoWiped!.undoneEntry).toEqual(baseline!.undoneEntry);
    expect(undoGarbaged!.undoneEntry).toEqual(baseline!.undoneEntry);
  });

  it('redo produces identical advancementLog + XP whether eventLog is empty or garbage', () => {
    const char = makeTestCharacter();
    const advanced = advanceCharacteristic(char, 'WS', true);
    const undoResult = undoAdvancement(advanced);
    expect(undoResult).not.toBeNull();
    const entry = undoResult!.undoneEntry;
    const undone = undoResult!.character;

    // Baseline redo from the real (mirrored) character.
    const baseline = redoAdvancement(undone, entry);
    expect(baseline).not.toBeNull();

    // eventLog wiped to [].
    const wiped: Character = { ...undone, eventLog: [] };
    const redoWiped = redoAdvancement(wiped, entry);
    expect(redoWiped).not.toBeNull();

    // eventLog replaced with garbage.
    const garbageLog = [
      { id: 'g', timestamp: 99, category: 'system', type: 'x', summary: 'junk', payload: {} },
    ] as unknown as LogEvent[];
    const garbaged: Character = { ...undone, eventLog: garbageLog };
    const redoGarbaged = redoAdvancement(garbaged, entry);
    expect(redoGarbaged).not.toBeNull();

    for (const result of [redoWiped!, redoGarbaged!]) {
      expect(result.character.advancementLog).toEqual(baseline!.character.advancementLog);
      expect(result.character.chars.WS.a).toBe(baseline!.character.chars.WS.a);
      expect(result.character.xpCur).toBe(baseline!.character.xpCur);
      expect(result.character.xpSpent).toBe(baseline!.character.xpSpent);
    }
  });

  it('full advance→undo→redo cycle reconstructs correct XP/log even starting from a garbage eventLog', () => {
    // Start with a character whose eventLog is already garbage before any advance.
    const garbageLog = [
      { id: 'pre', timestamp: 5, category: 'roll', type: 'junk', summary: 'noise', payload: {} },
    ] as unknown as LogEvent[];
    const char = makeTestCharacter({ eventLog: garbageLog });

    const advanced = advanceCharacteristic(char, 'WS', true);
    const cost = advanced.advancementLog[0].xpCost;

    const undoResult = undoAdvancement(advanced);
    expect(undoResult).not.toBeNull();
    const redoResult = redoAdvancement(undoResult!.character, undoResult!.undoneEntry);
    expect(redoResult).not.toBeNull();
    const redone = redoResult!.character;

    // Mechanics reconstruct correctly despite the pre-existing garbage entry.
    expect(redone.chars.WS.a).toBe(1);
    expect(redone.advancementLog).toHaveLength(1);
    expect(redone.xpCur).toBe(char.xpCur - cost);
    expect(redone.xpSpent).toBe(char.xpSpent + cost);
  });
});
